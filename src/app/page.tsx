'use client';

import { createBrowserClient } from '@supabase/ssr';
import { LayoutDashboard, ShieldCheck, Zap, BarChart3, Target, BrainCircuit } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';

export default function LobbyPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  useEffect(() => {
    const checkExistingSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push('/dashboard');
      } else {
        setCheckingAuth(false);
      }
    };
    checkExistingSession();
  }, [supabase, router]);

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const features = [
    { icon: <BarChart3 size={24} />, title: "Diagnostic Mastery", desc: "Identify the 'Why' behind the 'What' with precision." },
    { icon: <LayoutDashboard size={24} />, title: "Real-world Scenarios", desc: "Simulations built from actual tech failures." },
    { icon: <ShieldCheck size={24} />, title: "Verified Growth", desc: "Track diagnostic scores and build your portfolio." },
    { icon: <Target size={24} />, title: "High-Stakes Focus", desc: "Train for the pressure of live incident rooms." },
    { icon: <BrainCircuit size={24} />, title: "Pattern Recognition", desc: "Learn to spot recurring product failure modes." },
  ];

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-slate-50 font-sans overflow-hidden flex flex-col">
      {/* VIBRANT BACKGROUND ORBS */}
      <div className="absolute top-[-5%] left-[-5%] w-[500px] h-[500px] bg-indigo-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-60 animate-blob" />
      <div className="absolute top-[10%] right-[-5%] w-[500px] h-[500px] bg-cyan-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-60 animate-blob animation-delay-2000" />

      {/* 1. TOP SECTION: HERO & SIGN IN */}
      <main className="relative z-10 w-full max-w-6xl mx-auto px-6 pt-12 flex flex-col items-center">
        {/* REFINED TITLE */}
        <div className="text-center mb-8">
          <h1 className="text-7xl font-[900] text-slate-900 mb-4 tracking-[-0.05em] leading-none">
            PMSense
          </h1>
          <p className="text-lg text-slate-700 max-w-xl mx-auto font-bold opacity-80">
            Hone your Product Management skills with simulations and AI.
          </p>
        </div>

        {/* COMPACT AUTH CARD */}
        <div className="w-full max-w-sm relative">
          <div className="relative bg-white/70 backdrop-blur-2xl border border-white rounded-[32px] p-10 text-center shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
            <h2 className="text-xl font-black text-slate-900 mb-6 uppercase tracking-widest">Start Practicing</h2>
            <button
              onClick={handleLogin}
              className="w-full flex items-center justify-center gap-4 bg-slate-900 py-5 rounded-2xl font-bold text-white hover:bg-indigo-600 transition-all shadow-xl active:scale-95 text-md"
            >
              <div className="bg-white p-1 rounded-md">
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
              </div>
              Continue with Google
            </button>
            <p className="mt-6 text-[9px] text-slate-500 uppercase tracking-[0.3em] font-black">
              Private Beta Access ● One Click Login
            </p>
          </div>
        </div>
      </main>

      {/* 2. BOTTOM SECTION: CAROUSEL */}
      <div className="relative z-10 mt-auto pb-16 pt-20 overflow-hidden">
        <div className="flex gap-6 animate-scroll whitespace-nowrap px-6">
          {/* Double the array to create the infinite loop effect */}
          {[...features, ...features].map((feature, i) => (
            <div 
              key={i} 
              style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
              className="inline-block min-w-[320px] bg-white/40 border border-white/60 p-6 rounded-[28px] shadow-sm transition-all"
            >
              <div className="flex items-center gap-4 mb-3">
                <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shrink-0">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight whitespace-normal leading-tight">
                  {feature.title}
                </h3>
              </div>
              <p className="text-slate-800 text-sm font-bold opacity-80 whitespace-normal leading-relaxed">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      <style jsx global>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(40px, -60px) scale(1.1); }
          66% { transform: translate(-20px, 30px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(calc(-320px * 5 - 1.5rem * 5)); }
        }
        .animate-blob {
          animation: blob 5s infinite linear;
        }
        .animate-scroll {
          animation: scroll 40s linear infinite;
        }
        .animate-scroll:hover {
          animation-play-state: paused;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
    </div>
  );
}

