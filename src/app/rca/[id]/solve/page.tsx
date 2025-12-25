'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAutoSave } from '@/hooks/useAutoSave';
import { Clock, Home, AlertCircle, CheckCircle2 } from 'lucide-react';
import SelfEvaluation from '@/components/rca/SelfEvaluation';

export default function SolvingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: problemId } = use(params);
  const router = useRouter();
  
  const [problem, setProblem] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number>(15 * 60);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);

  useEffect(() => {
    async function init() {
      const { data: p } = await supabase.from('problems').select('*').eq('id', problemId).single();
      const { data: q } = await supabase.from('questions').select('*').eq('problem_id', problemId).order('order_index', { ascending: true });
      
      setProblem(p);
      setQuestions(q || []);

      const { data: existing } = await supabase
        .from('attempts')
        .select('*')
        .eq('problem_id', problemId)
        .in('status', ['in_progress', 'submitted'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        setAttemptId(existing.id);
        setAnswers(existing.answers || {});
        if (existing.status === 'submitted') setIsEvaluating(true);

        const elapsed = Math.floor((Date.now() - new Date(existing.start_time).getTime()) / 1000);
        const limitSeconds = (p?.time_limit_minutes || 15) * 60;
        setTimeLeft(Math.max(0, limitSeconds - elapsed));
      } else {
        const { data: newAttempt } = await supabase
          .from('attempts')
          .insert([{ problem_id: problemId, status: 'in_progress', start_time: new Date().toISOString() }])
          .select().single();
        if (newAttempt) setAttemptId(newAttempt.id);
      }
    }
    init();
  }, [problemId]);

  useEffect(() => {
    if (timeLeft <= 0 || isEvaluating) return;
    const interval = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [timeLeft, isEvaluating]);

  useAutoSave(attemptId, answers);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const allAnswered = questions.length > 0 && questions.every(q => answers[q.id]?.trim().length > 10);

  const handleFinalSubmit = async () => {
    if (!allAnswered) return;
    setIsSubmitting(true);
    try {
      await supabase.from('attempts').update({ status: 'submitted' }).eq('id', attemptId);
      setIsEvaluating(true);
    } catch (e) { console.error(e); } finally { setIsSubmitting(false); }
  };

  if (!problem) return <div className="p-20 text-center text-slate-400">Loading Workspace...</div>;

  if (isEvaluating) {
    return <SelfEvaluation attemptId={attemptId!} questions={questions} userAnswers={answers} onComplete={() => router.push('/rca')} />;
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b bg-slate-50 p-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link href="/rca" className="text-slate-500 hover:text-indigo-600"><Home size={20}/></Link>
          <span className="text-slate-300">/</span>
          <span className="font-semibold text-slate-700">{problem.title}</span>
          <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded">SOLVING</span>
        </div>
        <div className={`flex items-center gap-2 font-mono text-xl font-bold ${timeLeft < 120 ? 'text-red-600 animate-pulse' : 'text-slate-700'}`}>
          <Clock size={20} /> {formatTime(timeLeft)}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-1/3 border-r bg-slate-50 p-6 overflow-y-auto hidden md:block">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Case Context</h2>
          <div className="text-slate-700 leading-relaxed whitespace-pre-wrap text-sm">{problem.context}</div>
        </div>
        <div className="flex-1 p-8 overflow-y-auto bg-white">
          <div className="max-w-2xl mx-auto space-y-10 pb-20">
            {questions.map((q, index) => (
              <div key={q.id} className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900"><span className="text-indigo-600 mr-2">Q{index + 1}.</span>{q.question_text}</h3>
                <textarea className="w-full h-40 p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 resize-none shadow-sm" placeholder="Reasoning..." value={answers[q.id] || ''} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} />
              </div>
            ))}
            <div className="pt-10 border-t flex items-center justify-between">
              <div className="text-sm text-slate-500 flex items-center gap-2">
                {allAnswered ? <span className="text-green-600 flex items-center gap-1 font-medium"><CheckCircle2 size={16}/> Complete</span> : <span className="text-slate-400 flex items-center gap-1"><AlertCircle size={16}/> Min. 10 chars per question</span>}
              </div>
              <button disabled={!allAnswered || isSubmitting} onClick={handleFinalSubmit} className={`px-10 py-4 rounded-xl font-bold transition-all shadow-lg ${allAnswered ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>{isSubmitting ? 'Submitting...' : 'Submit for Review'}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

