'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useSessionGuard } from '@/hooks/useSessionGuard';
import { ChevronLeft, Play, Clock, BarChart, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Problem {
  id: string;
  title: string;
  context: string;
  time_limit_minutes: number;
  difficulty: string;
}

export default function ProblemContextPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, isLoading: sessionLoading, supabase } = useSessionGuard();
  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (sessionLoading || !user) return;

    async function fetchProblem() {
      const { data } = await supabase
        .from('problems')
        .select('*')
        .eq('id', id)
        .single();

      if (data) setProblem(data);
      setLoading(false);
    }
    fetchProblem();
  }, [id, sessionLoading, user, supabase]);

  const handleStart = () => {
    router.push(`/rca/${id}/solve`);
  };

  if (sessionLoading || loading) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center space-y-4">
      <div className="w-10 h-10 border-4 border-slate-100 border-t-slate-900 rounded-full animate-spin" />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Loading Case</p>
    </div>
  );

  if (!problem) return <div className="p-20 text-center text-red-500">Problem not found.</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-3xl mx-auto">
        {/* Breadcrumbs */}
        <nav className="flex items-center space-x-2 text-sm text-slate-500 mb-8">
          <Link href="/" className="hover:text-indigo-600 flex items-center gap-1">
            <Home size={14} /> Home
          </Link>
          <span>/</span>
          <Link href="/rca" className="hover:text-indigo-600">RCA Simulations</Link>
          <span>/</span>
          <span className="text-slate-900 font-medium">{problem.title}</span>
        </nav>

        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-8 border-b border-slate-100 bg-slate-50/50">
            <h1 className="text-3xl font-bold text-slate-900 mb-4">{problem.title}</h1>
            <div className="flex gap-6 text-sm font-semibold text-slate-600">
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-indigo-600" /> {problem.time_limit_minutes} Minutes
              </div>
              <div className="flex items-center gap-2">
                <BarChart size={18} className="text-indigo-600" /> {problem.difficulty} Difficulty
              </div>
            </div>
          </div>

          <div className="p-8">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Case Context</h2>
            <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed whitespace-pre-wrap">
              {problem.context}
            </div>

            {/* How It Works - Standard Instructions */}
            <div className="mt-10 p-6 bg-indigo-50 border border-indigo-100 rounded-xl">
              <h3 className="text-sm font-bold text-indigo-900 mb-4 flex items-center gap-2">
                📋 How It Works
              </h3>
              <ul className="space-y-3 text-sm text-indigo-800">
                <li className="flex items-start gap-3">
                  <span className="font-bold text-indigo-600 mt-0.5">1.</span>
                  <span><strong>Progress Dots</strong> — Watch the dots beside the timer to track which topics you've covered</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="font-bold text-indigo-600 mt-0.5">2.</span>
                  <span><strong>Need Help?</strong> — Tell Dan you're ready to move on to the next question if you're stuck on a question</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="font-bold text-indigo-600 mt-0.5">3.</span>
                  <span><strong>Submit When Ready</strong> — Once you want to go for evaluation, say <em>"I am done"</em> or <em>"Evaluate Me"</em> to submit</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 flex gap-4">
              <button
                onClick={handleStart}
                className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-200"
              >
                <Play size={18} fill="currentColor" /> Start Solving
              </button>
              <Link
                href="/rca"
                className="px-8 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-all flex items-center gap-2"
              >
                <ChevronLeft size={18} /> Back to List
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


