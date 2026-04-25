'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Calendar, Filter, Download, Search, Loader2, ShieldCheck, Mail, ArrowLeft, Clock, UserPlus, Settings, MapPin, Key, UserCheck, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface AttendanceRecord {
    id: string;
    userId: string;
    date: string;
    timestamp: string;
    type: string;
    status: string;
    user: {
        name: string;
        email: string;
    };
    photoUrl?: string;
    deviceId?: string;
}

interface UserStat {
    id: string;
    name: string;
    email: string;
    cnic: string;
    department: string;
    totalAttendance: number;
    percentage: string;
    lastActive: string | null;
}

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<UserStat[]>([]);
  const [monthlyReport, setMonthlyReport] = useState<any>(null);
  const [view, setView] = useState<'activity' | 'stats' | 'reports' | 'settings'>('activity');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [groupByDept, setGroupByDept] = useState(false);
  const [orgSettings, setOrgSettings] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear]);

  const fetchData = async () => {
    try {
      const recRes = await fetch('/api/attendance/history?admin=true');
      if (recRes.status === 401 || recRes.status === 403) {
          router.push('/dashboard');
          return;
      }

      const [statRes, reportRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch(`/api/admin/monthly-report?month=${selectedMonth}&year=${selectedYear}`)
      ]);

      const recData = await recRes.json();
      const statData = await statRes.json();
      const reportData = await reportRes.json();
      const settingsRes = await fetch('/api/admin/settings');
      const settingsData = await settingsRes.json();

      setRecords(Array.isArray(recData) ? recData : []);
      setStats(Array.isArray(statData) ? statData : []);
      setOrgSettings(settingsData);
      
      if (reportData && !reportData.error) {
        setMonthlyReport(reportData);
      } else {
        console.error("Report Error:", reportData?.error);
        setMonthlyReport({ report: [], daysInMonth: new Date(selectedYear, selectedMonth, 0).getDate() });
      }
    } catch (err) {
      console.error(err);
      setRecords([]);
      setStats([]);
      setMonthlyReport(null);
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently remove ${name}? All their attendance records will also be deleted.`)) return;

    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      const data = await res.json();
      
      if (res.ok) {
        alert(data.message);
        fetchData(); // Refresh both records and stats
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to delete user');
    }
  };

  const filteredRecords = (records || []).filter(record => 
    record.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.userId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredStats = (stats || []).filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        s.cnic?.includes(searchTerm) ||
                        s.department?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDept === 'ALL' || s.department === selectedDept;
    return matchesSearch && matchesDept;
  });

  const departments = ['ALL', ...Array.from(new Set(stats.map(s => s.department).filter(Boolean)))];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
        <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white">
      <nav className="border-b border-white/5 bg-[#161618]/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row justify-between min-h-[4rem] py-4 lg:py-0 items-center gap-4">
            <div className="flex items-center space-x-4 w-full lg:w-auto relative justify-center lg:justify-start">
              <Link href="/dashboard" className="absolute left-0 lg:static p-2.5 hover:bg-white/10 rounded-xl transition-all hover:scale-110">
                <ArrowLeft className="h-5 w-5 text-gray-400" />
              </Link>
              <div className="flex items-center space-x-3 group cursor-pointer pl-10 lg:pl-0">
                <div className="bg-gradient-to-br from-purple-600 to-indigo-600 p-2.5 rounded-xl shadow-lg shadow-purple-600/30 group-hover:rotate-12 transition-transform duration-500">
                  <ShieldCheck className="h-5 w-5 text-white" />
                </div>
                <span className="font-black text-xl sm:text-2xl tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500 uppercase">Admin Console</span>
              </div>
            </div>
            <div className="flex flex-wrap justify-center items-center gap-2 bg-black/40 p-1.5 rounded-2xl border border-white/5 backdrop-blur-md w-full lg:w-auto">
                <button 
                  onClick={() => setView('activity')}
                  className={`flex-1 lg:flex-none px-3 sm:px-5 py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all ${view === 'activity' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-gray-500 hover:text-gray-300'}`}
                >Activity</button>
                <button 
                  onClick={() => setView('stats')}
                  className={`flex-1 lg:flex-none px-3 sm:px-5 py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all ${view === 'stats' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-gray-500 hover:text-gray-300'}`}
                >Performance</button>
                <button 
                  onClick={() => setView('reports')}
                  className={`flex-1 lg:flex-none px-3 sm:px-5 py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all ${view === 'reports' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-gray-500 hover:text-gray-300'}`}
                >Monthly Grid</button>
                <button 
                  onClick={() => setView('settings')}
                  className={`flex-1 lg:flex-none px-3 sm:px-5 py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all ${view === 'settings' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-gray-500 hover:text-gray-300'}`}
                >Settings</button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
            <div>
                <h1 className="text-3xl font-bold">
                  {view === 'activity' ? 'Attendance Logs' : view === 'stats' ? 'User Performance' : view === 'reports' ? 'Monthly Attendance Grid' : 'Admin Settings'}
                </h1>
                <p className="text-gray-400 mt-1">
                    {view === 'activity' ? 'Real-time feed of passkey scans.' : view === 'stats' ? 'Overview of enrollment and percentages.' : view === 'reports' ? 'Detailed day-by-day status for the selected month.' : 'Manage organization location, passwords and system ownership.'}
                </p>
            </div>
            
            <div className="flex flex-wrap gap-3">
                {view !== 'settings' && (
                  <div className="flex flex-wrap gap-3">
                    {view === 'reports' && (
                      <div className="flex gap-2">
                        <select 
                          className="bg-[#161618] border border-white/5 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/50"
                          value={selectedMonth}
                          onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                        >
                          {Array.from({ length: 12 }, (_, i) => (
                            <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
                          ))}
                        </select>
                        <select 
                          className="bg-[#161618] border border-white/5 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/50"
                          value={selectedYear}
                          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        >
                          {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                      </div>
                    )}
                    
                    <div className="relative">
                        <Filter className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                        <select 
                            className="bg-[#161618] border border-white/5 rounded-xl pl-9 pr-8 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 appearance-none transition-all"
                            value={selectedDept}
                            onChange={(e) => setSelectedDept(e.target.value)}
                        >
                            {departments.map(dept => (
                                <option key={dept} value={dept}>{dept}</option>
                            ))}
                        </select>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                        <input 
                            type="text" 
                            placeholder="Search Name / Email / ID..."
                            className="bg-[#161618] border border-white/5 rounded-xl pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all w-full md:w-64"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                  </div>
                )}
                
                <Link href="/admin/enroll" className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-lg shadow-blue-600/20 flex items-center space-x-2">
                    <UserPlus className="h-4 w-4" />
                    <span>New Enrollment</span>
                </Link>
            </div>
        </div>

        {view === 'settings' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Location Settings */}
            <div className="bg-[#161618] p-8 rounded-2xl border border-white/5 shadow-xl space-y-6">
                <div className="flex items-center space-x-3 mb-2">
                    <div className="bg-blue-600/20 p-2 rounded-lg">
                        <MapPin className="h-5 w-5 text-blue-500" />
                    </div>
                    <h3 className="text-xl font-bold">Organization Location</h3>
                </div>
                <p className="text-sm text-gray-500">Set the GPS coordinates for the geofence center point.</p>
                
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Office Address</label>
                    <textarea 
                        placeholder="123 Sector H-12, Islamabad, Pakistan"
                        className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                        rows={2}
                        value={orgSettings?.address || ''}
                        onChange={(e) => setOrgSettings({...orgSettings, address: e.target.value})}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase">Latitude</label>
                        <input 
                            type="number" 
                            step="any"
                            className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono text-sm"
                            value={orgSettings?.latitude || 0}
                            onChange={(e) => setOrgSettings({...orgSettings, latitude: parseFloat(e.target.value)})}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase">Longitude</label>
                        <input 
                            type="number" 
                            step="any"
                            className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono text-sm"
                            value={orgSettings?.longitude || 0}
                            onChange={(e) => setOrgSettings({...orgSettings, longitude: parseFloat(e.target.value)})}
                        />
                    </div>
                </div>
                <button 
                  onClick={async () => {
                    const res = await fetch('/api/admin/settings', {
                        method: 'POST',
                        body: JSON.stringify({ action: 'UPDATE_LOCATION', data: { 
                            lat: orgSettings.latitude, 
                            lng: orgSettings.longitude,
                            address: orgSettings.address 
                        } })
                    });
                    if (res.ok) alert('Settings updated!');
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20"
                >Save Settings</button>
            </div>

            {/* Password Settings */}
            <div className="bg-[#161618] p-8 rounded-2xl border border-white/5 shadow-xl space-y-6">
                <div className="flex items-center space-x-3 mb-2">
                    <div className="bg-yellow-600/20 p-2 rounded-lg">
                        <Key className="h-5 w-5 text-yellow-500" />
                    </div>
                    <h3 className="text-xl font-bold">Admin Password</h3>
                </div>
                <p className="text-sm text-gray-500">Update your account password for secure access.</p>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">New Password</label>
                    <input 
                        type="password" 
                        placeholder="••••••••"
                        className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-yellow-500 transition-all"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                    />
                </div>
                <button 
                  onClick={async () => {
                    if (!newPassword) return;
                    const res = await fetch('/api/admin/settings', {
                        method: 'POST',
                        body: JSON.stringify({ action: 'CHANGE_PASSWORD', data: { newPassword } })
                    });
                    if (res.ok) {
                        alert('Password changed!');
                        setNewPassword('');
                    }
                  }}
                  className="w-full bg-yellow-600 hover:bg-yellow-700 py-3 rounded-xl font-bold transition-all shadow-lg shadow-yellow-600/20"
                >Change Password</button>
            </div>

            {/* Ownership Transfer */}
            <div className="bg-red-500/5 p-8 rounded-2xl border border-red-500/10 shadow-xl space-y-6 md:col-span-2 border-dashed">
                <div className="flex items-center space-x-3 mb-2">
                    <div className="bg-red-600/20 p-2 rounded-lg">
                        <UserCheck className="h-5 w-5 text-red-500" />
                    </div>
                    <h3 className="text-xl font-bold text-red-500">Transfer Ownership</h3>
                </div>
                <div className="flex flex-col md:flex-row gap-6 items-end">
                    <div className="flex-1 space-y-2 w-full">
                        <p className="text-sm text-gray-500 mb-4">DANGER: Enter the email of the user who will become the new single ADMIN. You will lose all admin permissions immediately after transfer.</p>
                        <input 
                            type="email" 
                            placeholder="new-admin@example.com"
                            className="w-full bg-black/40 border border-red-500/20 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-500 transition-all"
                            value={newAdminEmail}
                            onChange={(e) => setNewAdminEmail(e.target.value)}
                        />
                    </div>
                    <button 
                       onClick={async () => {
                         if (!confirm('Are you absolutely sure? You will lose admin access.')) return;
                         const res = await fetch('/api/admin/settings', {
                             method: 'POST',
                             body: JSON.stringify({ action: 'TRANSFER_OWNERSHIP', data: { newAdminEmail } })
                         });
                         const data = await res.json();
                         if (res.ok) {
                             alert(data.message);
                             router.push('/dashboard');
                         } else {
                             alert(data.error);
                         }
                       }}
                       className="bg-red-600 hover:bg-red-700 px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-red-600/20 whitespace-nowrap"
                    >Transfer Rights</button>
                </div>
            </div>
          </div>
        ) : view === 'reports' ? (
          <div className="space-y-6">
            <div className="bg-[#161618] rounded-2xl border border-white/5 p-8 shadow-2xl overflow-x-auto min-h-[400px]">
              {monthlyReport?.report ? (
                <table className="w-full text-left border-separate border-spacing-0">
                  <thead>
                    <tr className="text-[10px] text-gray-500 uppercase font-black tracking-widest border-b border-white/5">
                      <th className="p-4 sticky left-0 bg-[#161618] z-10 w-48 border-b border-white/5">Student Name</th>
                      {Array.from({ length: monthlyReport.daysInMonth }, (_, i) => (
                        <th key={i} className="p-2 text-center min-w-[34px] border-b border-white/5">{i + 1}</th>
                      ))}
                      <th className="p-4 text-center border-b border-white/5">Summary</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {(monthlyReport.report || []).filter((user: any) => {
                      const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                          user.id.toLowerCase().includes(searchTerm.toLowerCase());
                      const matchesDept = selectedDept === 'ALL' || user.department === selectedDept;
                      return matchesSearch && matchesDept;
                    }).map((user: any) => (
                      <tr key={user.id} className="hover:bg-white/[0.02]">
                        <td className="p-4 text-sm font-bold sticky left-0 bg-[#161618] z-10 border-r border-white/5">
                          <div className="flex flex-col">
                            <span className="text-white">{user.name}</span>
                            <span className="text-[9px] text-blue-500/70 font-mono uppercase tracking-tighter">{user.department}</span>
                          </div>
                        </td>
                        {Array.from({ length: monthlyReport.daysInMonth }, (_, i) => {
                          const day = i + 1;
                          const status = user.attendance[day]?.status || 'ABSENT';
                          return (
                            <td key={day} className="p-1 text-center">
                              <div 
                                className={`h-7 w-7 rounded-lg mx-auto flex items-center justify-center text-[10px] font-black transition-all
                                  ${status === 'PRESENT' ? 'bg-green-500/20 text-green-500 border border-green-500/20' : 
                                    status === 'LATE' ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/20' :
                                    status === 'SHORT_LEAVE' ? 'bg-orange-500/20 text-orange-500 border border-orange-500/20' :
                                    'bg-white/[0.02] text-gray-700 font-normal'}`}
                              >
                                {status === 'PRESENT' ? 'P' : status === 'LATE' ? 'L' : status === 'SHORT_LEAVE' ? 'S' : 'A'}
                              </div>
                            </td>
                          );
                        })}
                        <td className="p-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2 text-[10px] font-black">
                            <span className="text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded">{user.totalPresent}P</span>
                            <span className="text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded">{user.totalLate}L</span>
                            <span className="text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded">{monthlyReport.daysInMonth - user.totalPresent}A</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex items-center justify-center h-48 opacity-20">Loading grid data...</div>
              )}
            </div>
            
            <div className="flex flex-wrap gap-6 text-[10px] font-black uppercase tracking-widest text-gray-500 p-6 bg-white/[0.02] rounded-2xl border border-white/5">
                <div className="flex items-center space-x-2">
                    <div className="h-4 w-4 bg-green-500/20 border border-green-500/20 rounded-md" />
                    <span>Present (P)</span>
                </div>
                <div className="flex items-center space-x-2">
                    <div className="h-4 w-4 bg-yellow-500/20 border border-yellow-500/20 rounded-md" />
                    <span>Late (L) - After 11:00 AM</span>
                </div>
                <div className="flex items-center space-x-2">
                    <div className="h-4 w-4 bg-orange-500/20 border border-orange-500/20 rounded-md" />
                    <span>Short Leave (S) - Before 1:00 PM</span>
                </div>
                <div className="flex items-center space-x-2">
                    <div className="h-4 w-4 bg-white/[0.05] border border-white/5 rounded-md" />
                    <span>Absent (A)</span>
                </div>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
                {[
                    { label: 'Total Logs', value: records.length, icon: Calendar, color: 'blue' },
                    { label: 'Total Employees', value: stats.length, icon: Users, color: 'purple' },
                    { label: 'Departments', value: departments.filter(d => d !== 'ALL').length, icon: Filter, color: 'orange', 
                      detail: departments.filter(d => d !== 'ALL').map(d => ({
                        name: d,
                        count: stats.filter(s => s.department === d).length
                      }))
                    },
                    { label: 'Active Today', value: records.filter(r => new Date(r.date).toISOString().split('T')[0] === new Date().toISOString().split('T')[0]).length, icon: ShieldCheck, color: 'green' },
                ].map((stat, i) => (
                    <div key={i} className="bg-[#161618] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl transition-all hover:scale-[1.05] hover:border-blue-500/20 relative group overflow-hidden">
                        <div className="flex items-center justify-between mb-6 relative z-10">
                            <div className={`p-4 rounded-[1.5rem] bg-gradient-to-br from-${stat.color}-500/20 to-transparent border border-${stat.color}-500/10`}>
                                <stat.icon className={`h-7 w-7 text-${stat.color}-400`} />
                            </div>
                        </div>
                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] relative z-10">{stat.label}</p>
                        <p className="text-5xl font-black mt-3 relative z-10 tracking-tighter">{stat.value}</p>
                        
                        {/* Abstract Background Shapes */}
                        <div className={`absolute -bottom-12 -right-12 w-32 h-32 bg-${stat.color}-500/5 blur-[50px] rounded-full group-hover:scale-150 transition-transform duration-700`} />
                        
                        {stat.detail && (
                          <div className="absolute top-full left-0 w-full mt-2 bg-[#1c1c1e] border border-white/5 p-6 rounded-[2rem] shadow-2xl opacity-0 group-hover:opacity-100 transition-all z-20 pointer-events-none group-hover:-translate-y-2">
                             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-4">Breakdown</p>
                             <div className="space-y-3">
                                {stat.detail.map(d => (
                                  <div key={d.name} className="flex justify-between items-center">
                                    <span className="text-xs text-gray-400 font-bold">{d.name}</span>
                                    <span className="text-xs font-black text-white bg-white/5 px-2 py-0.5 rounded-lg">{d.count}</span>
                                  </div>
                                ))}
                             </div>
                          </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="bg-[#161618] rounded-2xl border border-white/5 overflow-hidden shadow-2xl overflow-x-auto">
                <table className="w-full text-left">
                    {view === 'activity' ? (
                      <>
                        <thead className="bg-white/[0.02] border-b border-white/5">
                            <tr>
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500">Student</th>
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500">Shift</th>
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500">Date</th>
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500">Time</th>
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500">Status</th>
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500">Proof</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredRecords.length > 0 ? filteredRecords.map((record) => (
                                <tr key={record.id} className="hover:bg-white/[0.01] transition-colors group">
                                    <td className="px-6 py-5 whitespace-nowrap">
                                        <div className="flex items-center space-x-4">
                                            <div className="h-11 w-11 bg-blue-600 rounded-2xl flex items-center justify-center font-black text-lg shadow-lg shadow-blue-600/20 ring-2 ring-blue-500/20 flex-shrink-0">
                                                {record.user.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-white uppercase tracking-tight">{record.user.name}</p>
                                                <p className="text-[10px] text-gray-500 font-mono italic">{record.user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 whitespace-nowrap">
                                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black italic tracking-widest ${record.type === 'CHECK_IN' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' : 'bg-purple-500/10 text-purple-500 border border-purple-500/20'}`}>
                                            {record.type.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5 font-bold text-xs text-gray-300 whitespace-nowrap">{new Date(record.date).toLocaleDateString(undefined, { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' })}</td>
                                    <td className="px-6 py-5 text-gray-500 text-xs font-mono whitespace-nowrap">{new Date(record.timestamp).toLocaleTimeString()}</td>
                                    <td className="px-6 py-5 whitespace-nowrap">
                                        <span className={`text-[10px] font-black px-3 py-1 rounded-full border inline-block ${record.status === 'LATE' ? 'text-yellow-500 bg-yellow-500/10 border-yellow-500/10' : record.status === 'SHORT_LEAVE' ? 'text-orange-500 bg-orange-500/10 border-orange-500/10' : 'text-green-500 bg-green-500/10 border-green-500/10'}`}>
                                            {record.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5">
                                        {record.photoUrl ? (
                                            <div className="relative group/img">
                                                <img 
                                                    src={record.photoUrl} 
                                                    alt="Proof" 
                                                    className="w-10 h-10 rounded-xl object-cover border border-white/10 group-hover/img:scale-[4] group-hover/img:z-50 transition-transform cursor-pointer origin-right shadow-2xl"
                                                />
                                            </div>
                                        ) : (
                                            <span className="text-[10px] text-gray-600 font-black uppercase tracking-widest italic">No Photo</span>
                                        )}
                                    </td>
                                </tr>
                            )) : (
                               <tr><td colSpan={5} className="py-24 text-center">
                                 <div className="flex flex-col items-center opacity-20">
                                    <Calendar className="h-16 w-16 mb-4" />
                                    <p className="font-black text-xl uppercase tracking-widest">No activity logs found</p>
                                 </div>
                               </td></tr>
                            )}
                        </tbody>
                      </>
                    ) : (
                      <>
                        <thead className="bg-white/[0.02] border-b border-white/5">
                            <tr>
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500">Employee</th>
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500">CNIC / Dept</th>
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500">Total Present</th>
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500">Compliance %</th>
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500">Last Scan</th>
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {groupByDept ? (
                              Object.entries(
                                filteredStats.reduce((groups: any, s: any) => {
                                  const dept = s.department || 'GENERAL';
                                  if (!groups[dept]) groups[dept] = [];
                                  groups[dept].push(s);
                                  return groups;
                                }, {})
                              ).map(([dept, deptUsers]: [string, any]) => (
                                <React.Fragment key={dept}>
                                  <tr className="bg-purple-500/5 border-l-2 border-purple-500">
                                    <td colSpan={5} className="px-6 py-3">
                                      <div className="flex items-center space-x-2">
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-400 font-mono">Department:</span>
                                        <span className="text-sm font-black text-white uppercase">{dept}</span>
                                        <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">{deptUsers.length}</span>
                                      </div>
                                    </td>
                                  </tr>
                                  {deptUsers.map((s: any) => (
                                    <tr key={s.id} className="hover:bg-white/[0.01] transition-colors group">
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <div className="flex items-center space-x-4">
                                                <div className="h-11 w-11 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center font-black text-lg shadow-lg shadow-purple-600/20 ring-2 ring-purple-500/20 flex-shrink-0">
                                                    {s.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-white uppercase tracking-tight">{s.name}</p>
                                                    <p className="text-[10px] text-gray-500 font-mono italic">{s.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <div className="space-y-1">
                                                <p className="text-xs font-bold text-gray-300 tracking-tighter">{s.cnic || 'NOT RECORDED'}</p>
                                                <p className="text-[9px] text-blue-500 font-black uppercase tracking-widest">{s.department || 'GENERAL'}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <div className="flex items-center space-x-2">
                                                <span className="text-xl font-black text-white">{s.totalAttendance}</span>
                                                <span className="text-[9px] text-gray-500 font-black tracking-widest">SESSIONS</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap min-w-[200px]">
                                            <div className="flex items-center space-x-5">
                                                <div className="flex-1 h-2.5 bg-gray-800 rounded-full max-w-[120px] overflow-hidden ring-1 ring-white/5">
                                                    <div 
                                                      className={`h-full rounded-full transition-all duration-1000 ${parseFloat(s.percentage) > 75 ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]' : parseFloat(s.percentage) > 50 ? 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.4)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]'}`}
                                                      style={{ width: `${s.percentage}%` }}
                                                    />
                                                </div>
                                                <span className={`font-black text-xs ${parseFloat(s.percentage) > 75 ? 'text-green-500' : 'text-gray-300'}`}>
                                                    {s.percentage}%
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-[10px] text-gray-500 font-mono tracking-tighter whitespace-nowrap">
                                            {s.lastActive ? new Date(s.lastActive).toLocaleString() : 'NEVER SCANNED'}
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <button 
                                                onClick={() => deleteUser(s.id, s.name)}
                                                className="p-2 hover:bg-red-500/10 text-gray-600 hover:text-red-500 rounded-lg transition-all"
                                                title="Delete Employee"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                  ))}
                                </React.Fragment>
                              ))
                            ) : (
                              filteredStats.length > 0 ? filteredStats.map((s) => (
                                <tr key={s.id} className="hover:bg-white/[0.01] transition-colors group">
                                    <td className="px-6 py-5 whitespace-nowrap">
                                        <div className="flex items-center space-x-4">
                                            <div className="h-11 w-11 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center font-black text-lg shadow-lg shadow-purple-600/20 ring-2 ring-purple-500/20 flex-shrink-0">
                                                {s.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-white uppercase tracking-tight">{s.name}</p>
                                                <p className="text-[10px] text-gray-500 font-mono italic">{s.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 whitespace-nowrap">
                                        <div className="space-y-1">
                                            <p className="text-xs font-bold text-gray-300 tracking-tighter">{s.cnic || 'NOT RECORDED'}</p>
                                            <p className="text-[9px] text-blue-500 font-black uppercase tracking-widest">{s.department || 'GENERAL'}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 whitespace-nowrap">
                                        <div className="flex items-center space-x-2">
                                            <span className="text-xl font-black text-white">{s.totalAttendance}</span>
                                            <span className="text-[9px] text-gray-500 font-black tracking-widest">SESSIONS</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 whitespace-nowrap min-w-[200px]">
                                        <div className="flex items-center space-x-5">
                                            <div className="flex-1 h-2.5 bg-gray-800 rounded-full max-w-[120px] overflow-hidden ring-1 ring-white/5">
                                                <div 
                                                  className={`h-full rounded-full transition-all duration-1000 ${parseFloat(s.percentage) > 75 ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]' : parseFloat(s.percentage) > 50 ? 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.4)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]'}`}
                                                  style={{ width: `${s.percentage}%` }}
                                                />
                                            </div>
                                            <span className={`font-black text-xs ${parseFloat(s.percentage) > 75 ? 'text-green-500' : 'text-gray-300'}`}>
                                                {s.percentage}%
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-[10px] text-gray-500 font-mono tracking-tighter whitespace-nowrap">
                                        {s.lastActive ? new Date(s.lastActive).toLocaleString() : 'NEVER SCANNED'}
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <button 
                                            onClick={() => deleteUser(s.id, s.name)}
                                            className="p-2 hover:bg-red-500/10 text-gray-600 hover:text-red-500 rounded-lg transition-all"
                                            title="Delete Employee"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                              )) : (
                                <tr><td colSpan={5} className="py-24 text-center">
                                  <div className="flex flex-col items-center opacity-20">
                                     <Users className="h-16 w-16 mb-4" />
                                     <p className="font-black text-xl uppercase tracking-widest">No employee data registered</p>
                                  </div>
                                </td></tr>
                              )
                            )}
                        </tbody>
                      </>
                    )}
                </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
