'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useSessionGuard } from '@/hooks/useSessionGuard';
import { ChevronLeft, Award, CheckCircle2, LayoutDashboard } from 'lucide-react';

export default function ResultsReviewPage({ params }: { params: Promise<{ id: string, attemptId: string }> }) {
  const { id: problemId, attemptId } = use(params);
  const { user, isLoading: sessionLoading, supabase } = useSessionGuard();
  const [attempt, setAttempt] = useState<any>(null);
  const [problem, setProblem] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionLoading || !user) return;

    async function fetchData() {
      setLoading(true);
      try {
        const { data: a } = await supabase.from('attempts').select('*').eq('id', attemptId).single();
        const { data: p } = await supabase.from('problems').select('*').eq('id', problemId).single();
        const { data: q } = await supabase.from('questions').select('*').eq('problem_id', problemId).order('order_index');

        setAttempt(a);
        setProblem(p);
        setQuestions(q || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [problemId, attemptId, sessionLoading, user, supabase]);

  if (sessionLoading || loading) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center space-y-4">
      <div className="w-10 h-10 border-4 border-slate-100 border-t-slate-900 rounded-full animate-spin" />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Loading Analysis</p>
    </div>
  );
  if (!attempt || !problem) return <div className="p-20 text-center text-slate-400 font-sans">Session not found.</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-white border-b sticky top-0 z-10 p-4">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/rca" className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500">
              <ChevronLeft size={24} />
            </Link>
            <div>
              <h1 className="font-bold text-slate-900 font-sans">{problem.title}</h1>
              <p className="text-xs text-slate-500 font-sans">Attempt Analysis</p>
            </div>
          </div>
          <div className="bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100 flex items-center gap-3">
            <div className="text-indigo-600"><Award size={20} /></div>
            <div className="text-lg font-black text-indigo-700 font-sans">
              {attempt.final_score}/{attempt.total_possible_score || '??'}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 pt-12">
        <div className="mb-12">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 font-sans">Simulation Context</h2>
          <div className="bg-white p-8 rounded-3xl border border-slate-200 text-slate-700 leading-relaxed text-sm font-sans">
            {problem.context}
          </div>
        </div>

        <div className="space-y-16">
          {questions.map((q, idx) => {
            const userAnswer = attempt.answers?.[q.id] || "";
            const scores = attempt.scores?.[q.id] || [];
            const isSkipped = userAnswer.trim().length === 0;

            return (
              <div key={q.id} className="space-y-8">
                <div className="flex items-center gap-4">
                  <span className="w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center font-bold text-sm">{idx + 1}</span>
                  <h3 className="text-xl font-bold text-slate-900 font-sans">{q.question_text}</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 font-sans">Your Response</h4>
                      <div className={`p-6 rounded-2xl border text-sm leading-relaxed font-sans ${isSkipped ? 'bg-slate-50 text-slate-400 italic' : 'bg-white text-slate-800'}`}>
                        {isSkipped ? "Question was skipped during the attempt." : userAnswer}
                      </div>
                    </div>

                    {!isSkipped && (
                      <div className="p-6 bg-indigo-600 rounded-2xl text-white shadow-lg">
                        <div className="flex items-center gap-2 mb-3 opacity-90">
                          <CheckCircle2 size={16} />
                          <span className="text-[10px] font-bold uppercase tracking-wider font-sans">Expert Gold Standard</span>
                        </div>
                        <p className="text-sm leading-relaxed font-sans">{q.gold_standard_answer}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 font-sans">Grading Rubric</h4>
                    <div className="space-y-2">
                      {q.rubric_items.map((item: string, rIdx: number) => {
                        const isChecked = scores[rIdx];
                        return (
                          <div key={rIdx} className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${isChecked ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200 opacity-60'}`}>
                            <div className={`mt-0.5 rounded-full p-0.5 ${isChecked ? 'text-green-600' : 'text-slate-300'}`}>
                              <CheckCircle2 size={18} />
                            </div>
                            <span className={`text-xs font-sans ${isChecked ? 'text-green-800 font-bold' : 'text-slate-500'}`}>{item}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-20 border-t pt-10 text-center">
          <Link href="/rca" className="inline-flex items-center gap-2 bg-slate-900 text-white px-10 py-4 rounded-2xl font-bold hover:bg-black transition-all font-sans">
            <LayoutDashboard size={20} /> Back to Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}


