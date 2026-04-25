'use client';

import { useState, useEffect, Suspense } from 'react';
import { startAuthentication } from '@simplewebauthn/browser';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Fingerprint, Loader2, LogIn, Mail } from 'lucide-react';

function LoginContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPasswordLogin, setShowPasswordLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const msg = searchParams.get('message');
    if (msg) setMessage(msg);
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (showPasswordLogin) {
      try {
        const res = await fetch('/api/auth/login-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (data.success) {
          router.push('/dashboard');
        } else {
          throw new Error(data.error || 'Password login failed');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      // 1. Get authentication options from server
      const optionsRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const options = await optionsRes.json();

      if (options.error) {
        throw new Error(options.error);
      }

      // 2. Start WebAuthn authentication
      const authResp = await startAuthentication({ optionsJSON: options });

      // 3. Verify authentication on server
      const verifyRes = await fetch('/api/webauthn/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: authResp,
          email,
          expectedChallenge: options.challenge,
        }),
      });

      const verification = await verifyRes.json();

      if (verification.success) {
        router.push('/dashboard');
      } else {
        throw new Error(verification.error || 'Authentication failed');
      }
    } catch (err: any) {
      console.error(err);
      let errMsg = err.message || 'An error occurred during login';
      if (err.name === 'NotAllowedError') {
        errMsg = "Authentication failed. Ensure you are using HTTPS or localhost, and your device supports biometrics.";
        if (window.location.protocol === 'http:' && window.location.hostname !== 'localhost') {
          errMsg = "Biometrics require a secure connection (HTTPS). Please access via localhost or an SSL-enabled domain.";
        }
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full space-y-8 bg-[#161618] p-8 rounded-2xl border border-white/10 shadow-2xl relative overflow-hidden">
      {/* Decorative gradient overlay */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500" />
      
      <div className="text-center">
        <div className="mx-auto h-16 w-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
          <Fingerprint className="h-8 w-8 text-blue-500" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight">Welcome Back</h2>
        <p className="mt-2 text-gray-400">Login with your biometric passkey</p>
      </div>

      {message && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-500 p-3 rounded-lg text-sm text-center">
          {message}
        </div>
      )}

      <form className="mt-8 space-y-6" onSubmit={handleLogin}>
        <div className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-3.5 h-5 w-5 text-gray-500" />
            <input
              type="email"
              required
              className="block w-full pl-10 pr-3 py-3 bg-[#1e1e20] border border-white/5 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-gray-600"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {showPasswordLogin && (
            <div className="relative">
               <LogIn className="absolute left-3 top-3.5 h-5 w-5 text-gray-500" />
               <input
                 type="password"
                 required
                 className="block w-full pl-10 pr-3 py-3 bg-[#1e1e20] border border-white/5 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-gray-600"
                 placeholder="Password"
                 value={password}
                 onChange={(e) => setPassword(e.target.value)}
               />
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent font-medium rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="animate-spin h-5 w-5" />
          ) : (
            <div className="flex items-center space-x-2">
              {showPasswordLogin ? <LogIn className="h-5 w-5" /> : <Fingerprint className="h-5 w-5" />}
              <span>{showPasswordLogin ? 'Sign in with Password' : 'Login with Biometrics'}</span>
            </div>
          )}
        </button>
      </form>

      <div className="text-center">
        <button 
          onClick={() => setShowPasswordLogin(!showPasswordLogin)}
          className="text-xs text-gray-500 hover:text-blue-500 underline transition-all"
        >
          {showPasswordLogin ? 'Use Biometric Login Instead' : 'Login with Password (Admin Only)'}
        </button>
      </div>

      <div className="text-center text-sm">
        <span className="text-gray-500 italic">GeoMark Secure Biometric Enrollment Required</span>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0b] text-white p-4">
      <Suspense fallback={<Loader2 className="animate-spin h-10 w-10 text-blue-500" />}>
        <LoginContent />
      </Suspense>
    </div>
  );
}
