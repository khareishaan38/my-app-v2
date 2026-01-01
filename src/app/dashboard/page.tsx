'use client';

import { createBrowserClient } from '@supabase/ssr';
import { LayoutDashboard, PenTool, Database, ArrowRight, Lock, LogOut } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // If someone tries to access /dashboard without logging in, send them back to the Lobby
        router.push('/');
        return;
      }
      setUser(session.user);
      setLoading(false);
    };
    checkUser();
  }, [supabase, router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center animate-pulse" />;

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        {/* Header with Sign Out */}
        <header className="flex justify-between items-center mb-16">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight italic">PMSense</h1>
            <p className="text-slate-500">Welcome back, {user?.user_metadata?.full_name || user?.email}</p>
          </div>
          <button 
            onClick={handleSignOut}
            className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-red-500 transition-colors"
          >
            <LogOut size={18} /> Sign Out
          </button>
        </header>

        <div className="grid md:grid-cols-3 gap-8">
          {/* RCA SIMULATIONS */}
          <Link 
            href="/rca"
            className="bg-white border-2 border-slate-100 p-8 rounded-[40px] text-left hover:border-indigo-600 hover:shadow-2xl transition-all group relative overflow-hidden block"
          >
            <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-indigo-100 group-hover:scale-110 transition-transform">
              <LayoutDashboard className="text-white" size={28} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">RCA Simulations</h2>
            <p className="text-slate-500 text-sm leading-relaxed mb-8">
              Master diagnostic reasoning. Analyze incidents, identify root causes, and sharpen your PM intuition.
            </p>
            <div className="flex items-center gap-2 text-indigo-600 font-bold group-hover:gap-4 transition-all">
              Enter Simulations <ArrowRight size={18} />
            </div>
          </Link>

          {/* PRD PLAYGROUND (LOCKED) */}
          <div className="bg-slate-100/50 border-2 border-dashed border-slate-200 p-8 rounded-[40px] opacity-60 relative">
            <div className="w-14 h-14 bg-slate-400 rounded-2xl flex items-center justify-center mb-6">
              <PenTool className="text-white" size={28} />
            </div>
            <div className="absolute top-8 right-8 text-slate-400">
              <Lock size={20} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">PRD Playground</h2>
            <p className="text-slate-500 text-sm leading-relaxed mb-8">
              Coming Soon
            </p>
          </div>

          {/* DATA GYM (LOCKED) */}
          <div className="bg-slate-100/50 border-2 border-dashed border-slate-200 p-8 rounded-[40px] opacity-60 relative">
            <div className="w-14 h-14 bg-slate-400 rounded-2xl flex items-center justify-center mb-6">
              <Database className="text-white" size={28} />
            </div>
            <div className="absolute top-8 right-8 text-slate-400">
              <Lock size={20} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Data Gym</h2>
            <p className="text-slate-500 text-sm leading-relaxed mb-8">
              Coming Soon
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

