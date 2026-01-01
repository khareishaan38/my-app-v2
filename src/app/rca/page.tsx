'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { ChevronRight, Home, CheckCircle2, Award, RotateCcw, Clock } from 'lucide-react';

export default function RCAListingPage() {
  const router = useRouter();
  const [problems, setProblems] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { router.push('/'); return; }

      try {
        const { data: pData } = await supabase.from('problems').select('*').eq('is_active', true);
        const { data: aData } = await supabase
          .from('attempts')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });

        setProblems(pData || []);
        const attemptMap: Record<string, any> = {};
        
        pData?.forEach(prob => {
          const userAttempts = (aData || []).filter(a => a.problem_id === prob.id && a.status !== 'terminated');
          if (userAttempts.length > 0) {
            // Logic Map H & K: Prioritize active attempts (in_progress/submitted) then evaluated
            const active = userAttempts.find(a => a.status === 'in_progress' || a.status === 'submitted');
            const evaluated = userAttempts.find(a => a.status === 'evaluated');
            attemptMap[prob.id] = active || evaluated || null;
          }
        });
        setAttempts(attemptMap);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [router, supabase]);

  if (loading) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center space-y-4">
      <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Restoring Engine State</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <nav className="flex items-center space-x-2 text-sm text-slate-500 mb-8 font-bold uppercase tracking-widest">
          <Link href="/dashboard" className="hover:text-slate-900 flex items-center gap-1"><Home size={14} /> Dashboard</Link>
          <span>/</span>
          <span className="text-slate-900">RCA Simulations</span>
        </nav>

        <div className="grid gap-6">
          {problems.map((problem) => {
            const attempt = attempts[problem.id];
            const isCompleted = attempt?.status === 'evaluated';
            const isInProgress = attempt?.status === 'in_progress' || attempt?.status === 'submitted';

            return (
              <div key={problem.id} className="bg-white border-2 border-slate-100 rounded-[40px] p-10 hover:border-slate-900 transition-all shadow-sm">
                <div className="flex flex-col md:flex-row justify-between md:items-start gap-8">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-3">
                      <h2 className="text-3xl font-black text-slate-900 italic tracking-tighter uppercase">{problem.title}</h2>
                      {isCompleted && <span className="bg-green-100 text-green-700 text-[10px] font-black px-3 py-1 rounded-full">COMPLETED</span>}
                      {isInProgress && <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-3 py-1 rounded-full animate-pulse">IN PROGRESS</span>}
                    </div>
                    <p className="text-slate-500 text-sm font-bold leading-relaxed max-w-xl">{problem.description}</p>
                    {isCompleted && (
                       <div className="inline-flex items-center gap-2 text-sm font-black text-slate-900 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-200">
                         <Award size={18} /> Score: {attempt.final_score}/{attempt.total_possible_score}
                       </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-3 min-w-[200px]">
                    {isCompleted ? (
                      <>
                        <Link href={`/rca/${problem.id}/results/${attempt.id}`} className="w-full py-4 rounded-2xl font-black bg-slate-50 text-slate-500 hover:bg-slate-100 text-center text-xs uppercase tracking-widest border border-slate-200 transition-all">View Analytics</Link>
                        <Link href={`/rca/${problem.id}`} className="w-full py-4 rounded-2xl font-black bg-slate-900 text-white hover:bg-black text-center text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl"><RotateCcw size={16} /> Reattempt</Link>
                      </>
                    ) : (
                      <Link href={`/rca/${problem.id}`} className={`px-8 py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all text-center ${isInProgress ? 'bg-amber-500 text-white shadow-lg' : 'bg-slate-900 text-white shadow-2xl'} flex items-center justify-center gap-2`}>
                        {isInProgress ? 'Resume Simulation' : 'Start Simulation'} <ChevronRight size={18} />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

