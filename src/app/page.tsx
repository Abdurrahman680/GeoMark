import Link from 'next/link';
import { Key, CheckCircle, ShieldCheck, Zap } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white selection:bg-blue-500/30">
      {/* Header */}
      <header className="max-w-7xl mx-auto px-6 py-8 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600 p-2 rounded-xl">
            <Key className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tighter">GeoMark</span>
        </div>
        <div className="flex items-center space-x-6">
          <Link href="/login" className="text-gray-400 hover:text-white font-medium transition-colors">Login</Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 pt-20 pb-32">
        <div className="text-center space-y-8 max-w-4xl mx-auto">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-bold uppercase tracking-widest animate-pulse">
            <Zap className="h-4 w-4" />
            <span>Next-Gen Passkeys</span>
          </div>
          
          <h1 className="text-4xl sm:text-6xl md:text-8xl font-extrabold tracking-tight leading-[1.1]">
            Attendance, simplified with <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">Passkeys.</span>
          </h1>
          
          <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Eliminate proxy attendance and password fatigue. Secure your organization with WebAuthn-powered passkey verification.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 pt-4">
            <Link href="/login" className="w-full sm:w-auto px-8 sm:px-10 py-4 sm:py-5 bg-blue-600 hover:bg-blue-700 rounded-2xl text-base sm:text-lg font-bold transition-all shadow-xl shadow-blue-600/30 text-center">
              Mark Attendance
            </Link>
          </div>
        </div>

        {/* Features Preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-40">
          {[
            { 
              title: "Passwordless Auth", 
              desc: "Users authenticate using Device Passkeys via WebAuthn protocol.",
              icon: Key 
            },
            { 
              title: "One-Click Marking", 
              desc: "Effortlessly mark attendance once per day with high-level security verification.",
              icon: CheckCircle 
            },
            { 
              title: "Admin Dashboard", 
              desc: "Comprehensive insights and real-time monitoring for organizational administrators.",
              icon: ShieldCheck 
            }
          ].map((feature, i) => (
            <div key={i} className="bg-[#161618] p-10 rounded-3xl border border-white/5 hover:border-blue-500/30 transition-all group">
              <div className="bg-blue-500/10 p-4 rounded-2xl w-fit group-hover:scale-110 transition-transform duration-500">
                <feature.icon className="h-8 w-8 text-blue-500" />
              </div>
              <h3 className="text-2xl font-bold mt-6">{feature.title}</h3>
              <p className="text-gray-400 mt-4 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </main>
      
      {/* Footer */}
      <footer className="border-t border-white/5 py-12 bg-[#0a0a0b]">
        <div className="max-w-7xl mx-auto px-6 text-center text-gray-600 text-sm">
          <p>© 2026 GeoMark. Built with Next.js, Prisma, and Neon PostgreSQL.</p>
        </div>
      </footer>
    </div>
  );
}
