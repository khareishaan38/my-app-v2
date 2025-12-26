'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ChevronRight, Clock, BarChart, Home, CheckCircle2, PlayCircle, Award } from 'lucide-react';

export default function RCAListingPage() {
  const router = useRouter();
  const [problems, setProblems] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      router.refresh();

      try {
        const { data: pData } = await supabase.from('problems').select('*').eq('is_active', true);
        const { data: aData } = await supabase.from('attempts').select('*').order('created_at', { ascending: false });

        if (pData) setProblems(pData);
        if (aData && pData) {
          const attemptMap: Record<string, any> = {};
          
          pData.forEach(prob => {
            const validAttempts = aData.filter(a => a.problem_id === prob.id && a.status !== 'terminated');
            if (validAttempts.length > 0) {
              const active = validAttempts.find(a => a.status === 'in_progress' || a.status === 'submitted');
              const evaluated = validAttempts.find(a => a.status === 'evaluated');
              attemptMap[prob.id] = active || evaluated || null;
            } else {
              attemptMap[prob.id] = null;
            }
          });
          setAttempts(attemptMap);
        }
      } catch (err) {
        console.error("Dashboard Sync Error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        <nav className="flex items-center space-x-2 text-sm text-slate-500 mb-8">
          <Link href="/" className="hover:text-indigo-600 flex items-center gap-1"><Home size={14} /> Home</Link>
          <span>/</span>
          <span className="text-slate-900 font-medium">RCA Simulations</span>
        </nav>

        <header className="mb-10">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">RCA Simulations</h1>
          <p className="text-slate-600 text-lg">Master diagnostic reasoning through real-world incident simulations.</p>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-4"></div>
            <p className="text-slate-400 font-medium font-sans">Syncing with Supabase...</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {problems.map((problem) => {
              const attempt = attempts[problem.id];
              const isCompleted = attempt?.status === 'evaluated';
              const isInProgress = attempt?.status === 'in_progress' || attempt?.status === 'submitted';

              return (
                <div key={problem.id} className="bg-white border border-slate-200 rounded-3xl p-8 hover:shadow-xl hover:border-indigo-100 transition-all duration-300 group">
                  <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{problem.title}</h2>
                        {isCompleted ? (
                          <span className="bg-green-100 text-green-700 text-[10px] uppercase tracking-widest font-black px-3 py-1 rounded-full flex items-center gap-1">
                            <CheckCircle2 size={12} strokeWidth={3} /> Completed
                          </span>
                        ) : isInProgress ? (
                          <span className="bg-amber-100 text-amber-700 text-[10px] uppercase tracking-widest font-black px-3 py-1 rounded-full flex items-center gap-1 animate-pulse">
                            <PlayCircle size={12} strokeWidth={3} /> In Progress
                          </span>
                        ) : null}
                      </div>
                      <p className="text-slate-600 leading-relaxed max-w-2xl text-sm">{problem.description}</p>
                      <div className="flex flex-wrap gap-5 pt-2">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg">
                          <Clock size={16} className="text-slate-400" /> {problem.time_limit_minutes} Mins
                        </div>
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg">
                          <BarChart size={16} className="text-slate-400" /> {problem.difficulty}
                        </div>
                        {isCompleted && attempt.final_score !== null && (
                          <div className="flex items-center gap-2 text-sm font-bold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
                            <Award size={16} /> 
                            Latest Score: {attempt.final_score}{attempt.total_possible_score ? `/${attempt.total_possible_score}` : ''}
                          </div>
                        )}
                      </div>
                    </div>
                    <Link 
                      href={`/rca/${problem.id}`}
                      className={`px-8 py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                        isCompleted ? 'bg-slate-900 text-white hover:bg-black' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg'
                      }`}
                    >
                      {isCompleted ? 'Review Analytics' : (isInProgress ? 'Resume Case' : 'Start Simulation')}
                      <ChevronRight size={20} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

