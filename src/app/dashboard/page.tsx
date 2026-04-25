'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { startAuthentication } from '@simplewebauthn/browser';
import { Calendar, CheckCircle, Clock, LayoutDashboard, LogOut, User, Loader2, AlertCircle, ShieldCheck, Camera, X } from 'lucide-react';
import { v2 as cloudinary } from 'cloudinary'; // This is actually for types if needed, but we use it on server

interface AttendanceRecord {
    id: string;
    date: string;
    timestamp: string;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isCheckInDone, setIsCheckInDone] = useState(false);
  const [isCheckOutDone, setIsCheckOutDone] = useState(false);
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [pendingType, setPendingType] = useState<'CHECK_IN' | 'CHECK_OUT' | undefined>();
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch user profile
      const meRes = await fetch('/api/auth/me');
      if (!meRes.ok) {
        if (meRes.status === 401) router.push('/login');
        return;
      }
      const meData = await meRes.json();
      setUser(meData);

      // Fetch attendance history
      const historyRes = await fetch('/api/attendance/history');
      const data = await historyRes.json();
      
      if (Array.isArray(data)) {
        setHistory(data);

        // Check status
        const today = new Date().toISOString().split('T')[0];
        setIsCheckInDone(data.some((r: any) => r.date.split('T')[0] === today && r.type === 'CHECK_IN'));
        setIsCheckOutDone(data.some((r: any) => r.date.split('T')[0] === today && r.type === 'CHECK_OUT'));
      } else {
        console.error("Failed to fetch attendance history:", data.error || "Unknown error");
        setHistory([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getDeviceId = () => {
    let id = localStorage.getItem('geomark_device_id');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('geomark_device_id', id);
    }
    return id;
  };

  const startMarkingProcess = (manualType?: 'CHECK_IN' | 'CHECK_OUT') => {
    setPendingType(manualType);
    setShowCamera(true);
  };

  const captureSelfie = () => {
    const video = document.getElementById('camera-preview') as HTMLVideoElement;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg');
    setCapturedImage(dataUrl);
    
    // Stop camera
    const stream = video.srcObject as MediaStream;
    stream.getTracks().forEach(track => track.stop());
  };

  const retakeSelfie = () => {
    setCapturedImage(null);
    setupCamera();
  };

  const setupCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      const video = document.getElementById('camera-preview') as HTMLVideoElement;
      if (video) video.srcObject = stream;
    } catch (err) {
      console.error("Camera error:", err);
      alert("Could not access camera. Please ensure permissions are granted.");
      setShowCamera(false);
    }
  };

  useEffect(() => {
    if (showCamera && !capturedImage) {
      setupCamera();
    }
  }, [showCamera, capturedImage]);

  const markAttendance = async (manualType?: 'CHECK_IN' | 'CHECK_OUT', photoData?: string) => {
    if (!user?.email) return;

    setMarking(true);
    try {
      // 1. Biometric verification
      const optionsRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email }),
      });
      const options = await optionsRes.json();
      if (options.error) throw new Error(options.error);

      const authResp = await startAuthentication({ optionsJSON: options });

      const verifyRes = await fetch('/api/webauthn/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: authResp,
          email: user.email,
          expectedChallenge: options.challenge,
        }),
      });
      const verification = await verifyRes.json();

      if (!verification.success) throw new Error("Verification failed");

      // 2. Fetch Geolocation
      if (!navigator.geolocation) {
        throw new Error("Geolocation is not supported by your browser.");
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000, // Increased to 10s
          maximumAge: 0
        });
      }).catch((err: GeolocationPositionError) => {
        console.error("Geolocation error:", err);
        if (err.code === err.PERMISSION_DENIED) {
          throw new Error("Location access denied. Please enable it in your browser settings.");
        } else if (err.code === err.TIMEOUT) {
          throw new Error("Location request timed out. Please try again.");
        } else {
          throw new Error("Could not fetch location. Please ensure GPS is enabled.");
        }
      });

      // 3. Mark Attendance with type, location, deviceId and photo
      const res = await fetch('/api/attendance/mark', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: manualType,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          deviceId: getDeviceId(),
          photo: photoData
        })
      });
      const markData = await res.json();
      
      if (markData.success) {
        fetchData();
      } else {
        alert(markData.error);
      }
    } catch (err: any) {
      console.error(err);
      if (err.name !== 'NotAllowedError') {
        alert(err.message || 'Error occurred');
      } else {
        let msg = "Biometric authentication failed. Ensure you are using HTTPS or localhost.";
        if (window.location.protocol === 'http:' && window.location.hostname !== 'localhost') {
           msg = "Biometric attendance requires a secure connection (HTTPS). Please use localhost or an SSL-enabled domain.";
        }
        alert(msg);
      }
    } finally {
      setMarking(false);
      setShowCamera(false);
      setCapturedImage(null);
      setPendingType(undefined);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
        <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white">
      {/* Navigation */}
      <nav className="border-b border-white/5 bg-[#161618]/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-3 group cursor-pointer">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2.5 rounded-xl shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform duration-300">
                <LayoutDashboard className="h-5 w-5 text-white" />
              </div>
              <span className="font-black text-2xl tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">GeoMark</span>
            </div>
            <div className="flex items-center space-x-6">
              {user?.role === 'ADMIN' && (
                <button
                  onClick={() => router.push('/admin')}
                  className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <ShieldCheck className="h-5 w-5" />
                  <span className="hidden sm:inline font-medium">Admin Console</span>
                </button>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
              >
                <LogOut className="h-5 w-5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Welcome Card */}
          <div className={`${user?.role === 'ADMIN' ? 'lg:col-span-5' : 'lg:col-span-3'} bg-[#161618] p-10 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group`}>
            <div className={`relative z-10 flex flex-col ${user?.role === 'ADMIN' ? 'items-center text-center py-12' : 'items-center lg:items-start text-center lg:text-left'}`}>
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest mb-4">
                <ShieldCheck className="h-3 w-3" />
                <span>Verified Account</span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-none">
                Hello, <span className="bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">{user?.name?.split(' ')[0]}!</span>
              </h1>
              <p className={`text-gray-400 mt-4 text-base sm:text-lg font-medium max-w-md ${user?.role === 'ADMIN' ? 'mx-auto' : 'mx-auto lg:mx-0'}`}>Your security is our priority. Your passkey is verified and active.</p>
              
              <div className={`mt-10 flex flex-col sm:flex-row flex-wrap gap-6 ${user?.role === 'ADMIN' ? 'justify-center' : ''}`}>
                <div className="w-full sm:w-auto bg-white/[0.03] backdrop-blur-md border border-white/5 px-6 py-4 rounded-[1.5rem] flex items-center space-x-4 hover:bg-white/[0.05] transition-colors">
                    <div className="bg-blue-500/20 p-3 rounded-2xl">
                        <Calendar className="h-6 w-6 text-blue-400" />
                    </div>
                    <div className="text-left">
                        <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Today</p>
                        <p className="text-lg font-bold">{new Date().toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                    </div>
                </div>
                <div className="w-full sm:w-auto bg-white/[0.03] backdrop-blur-md border border-white/5 px-6 py-4 rounded-[1.5rem] flex items-center space-x-4 hover:bg-white/[0.05] transition-colors">
                    <div className="bg-purple-500/20 p-3 rounded-2xl">
                        <Clock className="h-6 w-6 text-purple-400" />
                    </div>
                    <div className="text-left">
                        <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Local Time</p>
                        <p className="text-lg font-bold">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                </div>
              </div>
            </div>
            {/* Dynamic Background Effects */}
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-600/20 blur-[120px] rounded-full group-hover:bg-blue-500/30 transition-all duration-700" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-600/10 blur-[100px] rounded-full" />
          </div>

          {/* Action Card */}
          {user?.role !== 'ADMIN' && (
            <div className="lg:col-span-2 bg-[#161618] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl space-y-8 flex flex-col justify-center">
              <div className="flex justify-between items-center">
                 <h3 className="text-2xl font-black tracking-tight">Attendance</h3>
                 <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5 backdrop-blur-sm">
                    <button 
                      onClick={() => setMode('auto')}
                      className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${mode === 'auto' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-gray-500 hover:text-gray-300'}`}
                    >Auto</button>
                    <button 
                      onClick={() => setMode('manual')}
                      className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${mode === 'manual' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-gray-500 hover:text-gray-300'}`}
                    >Manual</button>
                 </div>
              </div>

              <div className="space-y-4">
                {/* Check-In Row */}
                <div className={`group p-6 rounded-[2rem] border transition-all duration-300 ${isCheckInDone ? 'bg-green-500/[0.03] border-green-500/20' : 'bg-blue-500/[0.03] border-blue-500/20'}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center space-x-5">
                      <div className={`p-4 rounded-2xl transition-transform duration-500 group-hover:scale-110 ${isCheckInDone ? 'bg-green-500/10' : 'bg-blue-500/10'}`}>
                          {isCheckInDone ? <CheckCircle className="h-6 w-6 text-green-500" /> : <Camera className="h-6 w-6 text-blue-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                          <p className="text-lg font-black tracking-tight whitespace-nowrap">Check-In</p>
                          <p className="text-xs text-gray-500 font-medium truncate">{isCheckInDone ? 'Authenticated' : 'Biometric pending'}</p>
                      </div>
                    </div>
                    {!isCheckInDone && (
                      <button
                        onClick={() => startMarkingProcess('CHECK_IN')}
                        disabled={marking}
                        className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-2xl text-sm font-black transition-all shadow-lg shadow-blue-600/30 active:scale-95 disabled:opacity-50 whitespace-nowrap flex justify-center"
                      >
                        {marking ? <Loader2 className="animate-spin h-4 w-4" /> : "Mark In"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Check-Out Row */}
                <div className={`group p-6 rounded-[2rem] border transition-all duration-300 ${isCheckOutDone ? 'bg-green-500/[0.03] border-green-500/20' : !isCheckInDone ? 'bg-white/[0.01] border-white/5 opacity-40' : 'bg-purple-500/[0.03] border-purple-500/20'}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center space-x-5">
                      <div className={`p-4 rounded-2xl transition-transform duration-500 group-hover:scale-110 ${isCheckOutDone ? 'bg-green-500/10' : 'bg-purple-500/10'}`}>
                          {isCheckOutDone ? <CheckCircle className="h-6 w-6 text-green-500" /> : <Clock className="h-6 w-6 text-purple-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                          <p className="text-lg font-black tracking-tight whitespace-nowrap">Check-Out</p>
                          <p className="text-xs text-gray-500 font-medium truncate">
                            {isCheckOutDone ? 'Authenticated' : !isCheckInDone ? 'Requires Entry' : 'Scanning ready'}
                          </p>
                      </div>
                    </div>
                    {(!isCheckOutDone && isCheckInDone) && (
                      <button
                        onClick={() => startMarkingProcess('CHECK_OUT')}
                        disabled={marking}
                        className="w-full sm:w-auto px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-2xl text-sm font-black transition-all shadow-lg shadow-purple-600/30 active:scale-95 disabled:opacity-50 whitespace-nowrap flex justify-center"
                      >
                        {marking ? <Loader2 className="animate-spin h-4 w-4" /> : "Mark Out"}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {mode === 'auto' && (
                 <p className="text-[10px] text-gray-600 text-center font-black uppercase tracking-[0.2em] italic">
                    Shift: {new Date().getHours() < 12 ? 'Morning' : 'Evening'} Session
                 </p>
              )}
            </div>
          )}
        </div>

        {/* Camera Modal */}
        {showCamera && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#161618] w-full max-w-md rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-white/5 flex justify-between items-center">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Camera className="h-5 w-5 text-blue-500" />
                  Selfie Verification
                </h3>
                <button 
                  onClick={() => {
                    setShowCamera(false);
                    setCapturedImage(null);
                    // Stop camera tracks
                    const video = document.getElementById('camera-preview') as HTMLVideoElement;
                    if (video?.srcObject) {
                      (video.srcObject as MediaStream).getTracks().forEach(t => t.stop());
                    }
                  }}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="p-6">
                <div className="aspect-square rounded-2xl bg-black overflow-hidden border border-white/5 relative">
                  {!capturedImage ? (
                    <video 
                      id="camera-preview" 
                      autoPlay 
                      playsInline 
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                  ) : (
                    <img 
                      src={capturedImage} 
                      alt="Selfie" 
                      className="w-full h-full object-cover scale-x-[-1]" 
                    />
                  )}
                  
                  {!capturedImage && (
                    <div className="absolute inset-0 border-2 border-dashed border-blue-500/30 rounded-2xl pointer-events-none m-8 flex items-center justify-center">
                       <div className="w-48 h-64 border-2 border-blue-500/50 rounded-[100px] opacity-50" />
                    </div>
                  )}
                </div>
                
                <div className="mt-6 flex gap-4">
                  {!capturedImage ? (
                    <button
                      onClick={captureSelfie}
                      className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/20"
                    >
                      <Camera className="h-5 w-5" />
                      Take Selfie
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={retakeSelfie}
                        className="flex-1 py-4 bg-white/5 hover:bg-white/10 rounded-2xl font-bold transition-all"
                      >
                        Retake
                      </button>
                      <button
                        onClick={() => markAttendance(pendingType, capturedImage)}
                        disabled={marking}
                        className="flex-[2] py-4 bg-green-600 hover:bg-green-700 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-600/20 disabled:opacity-50"
                      >
                        {marking ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle className="h-5 w-5" />}
                        Confirm & Mark
                      </button>
                    </>
                  )}
                </div>
                <p className="mt-4 text-xs text-center text-gray-500 italic">
                  Selfie is required to prevent proxy attendance.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* History Table */}
        {user?.role !== 'ADMIN' && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6 flex items-center space-x-2">
                <Clock className="h-6 w-6 text-blue-500" />
                <span>Attendance History</span>
            </h2>
            <div className="bg-[#161618] rounded-2xl border border-white/5 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/5">
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Date</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Activity</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Status</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Proof</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {Object.entries(
                                history.reduce((groups: any, record: any) => {
                                    const date = new Date(record.date).toLocaleDateString(undefined, { 
                                        timeZone: 'UTC', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
                                    });
                                    if (!groups[date]) groups[date] = [];
                                    groups[date].push(record);
                                    return groups;
                                }, {})
                            ).map(([date, records]: [string, any]) => (
                                <tr key={date} className="hover:bg-white/[0.02] transition-colors border-b border-white/5 last:border-0">
                                    <td className="px-6 py-6 align-top whitespace-nowrap">
                                        <p className="font-bold text-white text-sm">{date}</p>
                                    </td>
                                    <td className="px-6 py-6 whitespace-nowrap">
                                        <div className="space-y-4">
                                            {records.map((r: any) => (
                                                <div key={r.id} className="flex items-center space-x-4">
                                                    <span className={`w-20 text-[10px] font-bold py-1 px-2 rounded text-center whitespace-nowrap ${r.type === 'CHECK_IN' ? 'bg-blue-500/10 text-blue-500' : 'bg-purple-500/10 text-purple-500'}`}>
                                                        {r.type?.replace('_', ' ')}
                                                    </span>
                                                    <span className="text-gray-400 text-sm flex items-center space-x-1">
                                                        <Clock className="h-3 w-3" />
                                                        <span>{new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-6 align-top whitespace-nowrap">
                                        <div className="space-y-4">
                                            {records.map((r: any) => (
                                                <div key={r.id} className="h-[24px] flex items-center">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium border whitespace-nowrap ${
                                                        r.status === 'PRESENT' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                                        r.status === 'LATE' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                                                        'bg-orange-500/10 text-orange-500 border-orange-500/20'
                                                    }`}>
                                                        {r.status?.replace('_', ' ') || 'Present'}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-6 align-top whitespace-nowrap">
                                        <div className="space-y-4">
                                            {records.map((r: any) => (
                                                <div key={r.id} className="h-[24px] flex items-center">
                                                    {r.photoUrl ? (
                                                        <div className="relative group">
                                                            <img 
                                                                src={r.photoUrl} 
                                                                alt="Proof" 
                                                                className="w-8 h-8 rounded-lg object-cover border border-white/10 hover:scale-[4] hover:z-50 transition-transform cursor-pointer origin-right"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-600 text-[10px]">No photo</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {history.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-6 py-12 text-center text-gray-500 italic">
                                        No attendance records found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        )}
      </main>
    </div>
  );
}
