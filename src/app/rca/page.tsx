'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { ChevronRight, Clock, BarChart, Home, CheckCircle2, PlayCircle, Award } from 'lucide-react';

interface Problem {
  id: string;
  title: string;
  description: string;
  time_limit_minutes: number;
  difficulty: string;
}

interface Attempt {
  problem_id: string;
  status: string;
  final_score: number | null;
}

export default function RCAListingPage() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [attempts, setAttempts] = useState<Record<string, Attempt>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      
      try {
        // 1. Fetch active problems
        const { data: problemsData } = await supabase
          .from('problems')
          .select('*')
          .eq('is_active', true);
        
        if (problemsData) setProblems(problemsData);

        // 2. Fetch Attempts
        // Note: If you just added created_at, this query will now succeed.
        const { data: attemptsData, error: aError } = await supabase
          .from('attempts')
          .select('problem_id, status, final_score, created_at')
          .order('created_at', { ascending: false });

        if (aError) {
          console.error("Fetch Error:", aError.message);
          return;
        }

        if (attemptsData) {
          const attemptMap: Record<string, Attempt> = {};
          
          // Logic: We want to show the 'evaluated' attempt as the primary status if it exists.
          attemptsData.forEach(att => {
            const current = attemptMap[att.problem_id];
            // If we don't have an entry yet, OR the new one is 'evaluated' 
            // and the current one is not, update it.
            if (!current || (current.status !== 'evaluated' && att.status === 'evaluated')) {
              attemptMap[att.problem_id] = att;
            }
          });
          
          setAttempts(attemptMap);
          console.log("Dashboard Sync Successful:", attemptMap);
        }
      } catch (err) {
        console.error("Dashboard Load Failure:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        <nav className="flex items-center space-x-2 text-sm text-slate-500 mb-8">
          <Link href="/" className="hover:text-indigo-600 flex items-center gap-1">
            <Home size={14} /> Home
          </Link>
          <span>/</span>
          <span className="text-slate-900 font-medium">RCA Simulations</span>
        </nav>

        <header className="mb-10">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">RCA Simulations</h1>
          <p className="text-slate-600 text-lg">Master the art of diagnostic reasoning with live incident cases.</p>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-4"></div>
            <p className="text-slate-400 font-medium">Syncing with Command Center...</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {problems.map((problem) => {
              const attempt = attempts[problem.id];
              const isCompleted = attempt?.status === 'evaluated';
              const isInProgress = attempt?.status === 'in_progress' || attempt?.status === 'submitted';

              return (
                <div key={problem.id} className="bg-white border border-slate-200 rounded-3xl p-8 hover:shadow-xl hover:border-indigo-100 transition-all duration-300 group relative overflow-hidden">
                  <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{problem.title}</h2>
                        {isCompleted ? (
                          <span className="bg-green-100 text-green-700 text-[10px] uppercase tracking-widest font-black px-3 py-1 rounded-full flex items-center gap-1">
                            <CheckCircle2 size={12} strokeWidth={3} /> Completed
                          </span>
                        ) : isInProgress ? (
                          <span className="bg-amber-100 text-amber-700 text-[10px] uppercase tracking-widest font-black px-3 py-1 rounded-full flex items-center gap-1">
                            <PlayCircle size={12} strokeWidth={3} /> In Progress
                          </span>
                        ) : null}
                      </div>
                      
                      <p className="text-slate-600 leading-relaxed max-w-2xl">{problem.description}</p>
                      
                      <div className="flex flex-wrap gap-5 pt-2">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg">
                          <Clock size={16} className="text-slate-400" /> {problem.time_limit_minutes} Mins
                        </div>
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg">
                          <BarChart size={16} className="text-slate-400" /> {problem.difficulty}
                        </div>
                        {isCompleted && attempt.final_score !== null && (
                          <div className="flex items-center gap-2 text-sm font-bold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
                            <Award size={16} /> Latest Score: {attempt.final_score}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <Link 
                      href={`/rca/${problem.id}`}
                      className={`px-8 py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                        isCompleted 
                        ? 'bg-slate-900 text-white hover:bg-black shadow-lg shadow-slate-200' 
                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-100 hover:-translate-y-1'
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

