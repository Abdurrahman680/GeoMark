'use client';

import { useState } from 'react';
import { startRegistration } from '@simplewebauthn/browser';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Key, Loader2, UserPlus, Mail, User, CreditCard, Building, ArrowLeft, CheckCircle } from 'lucide-react';

export default function AdminEnrollPage() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [cnic, setCnic] = useState('');
  const [department, setDepartment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (cnic.length !== 13) throw new Error('CNIC must be 13 digits');

      // 1. Get registration options
      const optionsRes = await fetch('/api/admin/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, cnic, department }),
      });

      const data = await optionsRes.json();
      if (data.error) throw new Error(data.error);

      // 2. Scan Fingerprint (Employee's finger on enrollment device)
      const regResp = await startRegistration({ optionsJSON: data.options });

      // 3. Verify and Save
      const verifyRes = await fetch('/api/admin/verify-enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: regResp,
          userData: data.userData,
          expectedChallenge: data.options.challenge,
        }),
      });

      const verification = await verifyRes.json();

      if (verification.success) {
        setSuccess(true);
        // Clear form
        setEmail('');
        setName('');
        setCnic('');
        setDepartment('');
      } else {
        throw new Error(verification.error || 'Enrollment failed');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during enrollment');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#0a0a0b] text-white p-4">
            <div className="max-w-md w-full bg-[#161618] p-10 rounded-2xl border border-white/10 text-center space-y-6">
                <div className="mx-auto h-20 w-20 bg-green-500/10 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-10 w-10 text-green-500" />
                </div>
                <h2 className="text-3xl font-bold">Enrollment Success</h2>
                <p className="text-gray-400">The employee has been successfully registered with their biometric passkey.</p>
                <button 
                    onClick={() => setSuccess(false)}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold transition-all"
                >
                    Enroll Another Employee
                </button>
                <Link href="/admin" className="block text-blue-500 hover:underline">Return to Admin Dashboard</Link>
            </div>
        </div>
      )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white p-4 lg:p-8">
      <Link href="/admin" className="inline-flex items-center space-x-2 text-gray-400 hover:text-white transition-colors mb-8">
        <ArrowLeft className="h-5 w-5" />
        <span>Back to Admin</span>
      </Link>

      <div className="max-w-2xl mx-auto">
        <div className="flex items-center space-x-4 mb-8">
            <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-500/20">
                <UserPlus className="h-8 w-8" />
            </div>
            <div>
                <h1 className="text-3xl font-bold">Employee Enrollment</h1>
                <p className="text-gray-400">Register a new employee into the GeoMark system</p>
            </div>
        </div>

        <form onSubmit={handleEnroll} className="bg-[#161618] border border-white/10 rounded-3xl p-6 md:p-8 lg:p-12 shadow-2xl space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400 ml-1">Full Name</label>
                <div className="relative">
                    <User className="absolute left-4 top-3.5 h-5 w-5 text-gray-600" />
                    <input
                        type="text"
                        required
                        className="block w-full pl-12 pr-4 py-3.5 bg-black/30 border border-white/5 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        placeholder="John Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400 ml-1">Work Email</label>
                <div className="relative">
                    <Mail className="absolute left-4 top-3.5 h-5 w-5 text-gray-600" />
                    <input
                        type="email"
                        required
                        className="block w-full pl-12 pr-4 py-3.5 bg-black/30 border border-white/5 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        placeholder="john@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400 ml-1">CNIC Number (13 Digits)</label>
                <div className="relative">
                    <CreditCard className="absolute left-4 top-3.5 h-5 w-5 text-gray-600" />
                    <input
                        type="text"
                        required
                        maxLength={13}
                        className="block w-full pl-12 pr-4 py-3.5 bg-black/30 border border-white/5 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        placeholder="3520112345678"
                        value={cnic}
                        onChange={(e) => setCnic(e.target.value.replace(/\D/g, ''))}
                    />
                </div>
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400 ml-1">Department</label>
                <div className="relative">
                    <Building className="absolute left-4 top-3.5 h-5 w-5 text-gray-600" />
                    <input
                        type="text"
                        required
                        className="block w-full pl-12 pr-4 py-3.5 bg-black/30 border border-white/5 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        placeholder="Engineering"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                    />
                </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-2xl text-sm flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 py-4 rounded-2xl font-bold flex items-center justify-center space-x-3 hover:from-blue-500 hover:to-indigo-500 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
          >
            {loading ? (
                <Loader2 className="animate-spin h-6 w-6" />
            ) : (
                <>
                    <Key className="h-6 w-6" />
                    <span>Register Passkey</span>
                </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

function AlertCircle(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
    );
}
