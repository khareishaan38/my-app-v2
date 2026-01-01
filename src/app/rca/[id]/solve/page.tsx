'use client';

import React, { useEffect, useState, use, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { useAutoSave } from '@/hooks/useAutoSave';
import { Clock, Home, XCircle, LogOut } from 'lucide-react';
import SelfEvaluation from '@/components/rca/SelfEvaluation';

export default function SolvingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: problemId } = use(params);
  const router = useRouter();
  const isCreating = useRef(false);

  const [problem, setProblem] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [initializing, setInitializing] = useState(true);

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { router.push('/'); return; }

      const [pRes, qRes] = await Promise.all([
        supabase.from('problems').select('*').eq('id', problemId).single(),
        supabase.from('questions').select('*').eq('problem_id', problemId).order('order_index', { ascending: true })
      ]);

      setProblem(pRes.data);
      setQuestions(qRes.data || []);

      const { data: existing } = await supabase
        .from('attempts')
        .select('*')
        .eq('problem_id', problemId)
        .eq('user_id', session.user.id)
        .in('status', ['in_progress', 'submitted'])
        .maybeSingle();

      if (existing) {
        setAttemptId(existing.id);
        setAnswers(existing.answers || {});
        if (existing.status === 'submitted') setIsEvaluating(true);
        setTimeLeft(existing.time_remaining !== null ? existing.time_remaining : (pRes.data?.time_limit_minutes || 15) * 60);
      } else {
        if (isCreating.current) return;
        isCreating.current = true;
        const initialTime = (pRes.data?.time_limit_minutes || 15) * 60;
        const { data: newAttempt } = await supabase.from('attempts').insert([{
          problem_id: problemId,
          user_id: session.user.id,
          status: 'in_progress',
          start_time: new Date().toISOString(),
          time_remaining: initialTime
        }]).select().single();

        if (newAttempt) {
          setAttemptId(newAttempt.id);
          setTimeLeft(initialTime);
        }
      }
      setInitializing(false);
    }
    init();
  }, [problemId, router, supabase]);

  // Logic R: Popstate (Back Button)
  useEffect(() => {
    const handlePopState = () => {
      if (!isEvaluating && !isSubmitting) {
        if (window.confirm("Your progress may not be saved. Do you really want to leave?")) {
          router.push('/rca'); // Logic S: Go Back preserves In-Progress
        } else {
          window.history.pushState(null, '', window.location.href);
        }
      }
    };
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isEvaluating, isSubmitting, router]);

  // Logic U: Timeout
  useEffect(() => {
    if (initializing || timeLeft === null || timeLeft <= 0 || isEvaluating || !attemptId) {
      if (timeLeft === 0 && attemptId && !isEvaluating) handleAutoSubmit();
      return;
    }
    const interval = setInterval(() => setTimeLeft(prev => prev !== null ? prev - 1 : null), 1000);
    return () => clearInterval(interval);
  }, [timeLeft, isEvaluating, attemptId, initializing]);

  useAutoSave(supabase, attemptId, answers);

  const handleAutoSubmit = async () => {
    setIsSubmitting(true);
    await supabase.from('attempts').update({ status: 'submitted', is_timeout: true, time_remaining: 0 }).eq('id', attemptId);
    setIsEvaluating(true);
    setIsSubmitting(false);
  };

  // Logic V: Quit Practice (End & Delete)
  const handleQuit = async () => {
    if (attemptId) {
      await supabase.from('attempts').update({ status: 'terminated' }).eq('id', attemptId);
      router.push('/rca');
    }
  };

  const handleFinalSubmit = async () => {
    const allAnswered = questions.every(q => (answers[q.id] || '').trim().length > 10);
    if (!allAnswered) {
      alert("Please provide at least 10 characters for every answer before submitting.");
      return;
    }
    setIsSubmitting(true);
    await supabase.from('attempts').update({ status: 'submitted', time_remaining: timeLeft }).eq('id', attemptId);
    setIsEvaluating(true);
    setIsSubmitting(false);
  };

  if (initializing) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center space-y-4">
      <div className="w-10 h-10 border-4 border-slate-100 border-t-slate-900 rounded-full animate-spin" />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Loading Workspace</p>
    </div>
  );

  if (isEvaluating) return <SelfEvaluation attemptId={attemptId!} questions={questions} userAnswers={answers} onComplete={() => router.push('/rca')} />;

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans overflow-hidden">
      <header className="border-b bg-slate-50 p-6 flex justify-between items-center z-10">
        <div className="flex items-center gap-6">
          <button onClick={() => setShowQuitModal(true)} className="text-slate-400 hover:text-red-600 transition-colors">
            <Home size={24} />
          </button>
          <div className="flex flex-col">
            <span className="font-black text-slate-900 italic text-xl tracking-tighter uppercase leading-none">PMSense</span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Workspace / {problem?.title}</span>
          </div>
        </div>
        <div className="flex items-center gap-8">
          <div className={`flex items-center gap-3 font-mono text-3xl font-black ${timeLeft !== null && timeLeft < 120 ? 'text-red-600 animate-pulse' : 'text-slate-900'}`}>
            <Clock size={28} /> {timeLeft !== null ? `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}` : '--:--'}
          </div>
          <button onClick={() => setShowQuitModal(true)} className="flex items-center gap-2 text-slate-400 hover:text-red-600 font-black text-xs uppercase tracking-widest border-l pl-8 transition-colors">
            <XCircle size={20} /> Quit Practice
          </button>
        </div>
      </header>

      {/* Logic F: Split Screen */}
      <div className="flex flex-1 overflow-hidden">
        <div className="w-1/3 border-r bg-slate-50/50 p-10 overflow-y-auto hidden md:block">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">Incident Brief</h2>
          <div className="text-slate-800 leading-relaxed whitespace-pre-wrap text-base font-medium prose prose-slate">{problem?.context}</div>
        </div>
        <div className="flex-1 p-16 overflow-y-auto bg-white">
          <div className="max-w-3xl mx-auto space-y-16 pb-40">
            {questions.map((q, index) => (
              <div key={q.id} className="space-y-8">
                <div className="flex items-start gap-5">
                  <span className="bg-slate-900 text-white w-10 h-10 rounded-2xl flex items-center justify-center font-black text-lg shadow-lg">{index + 1}</span>
                  <h3 className="text-2xl font-black text-slate-900 leading-tight tracking-tight">{q.question_text}</h3>
                </div>
                <textarea
                  className="w-full h-64 p-8 rounded-[32px] border-2 border-slate-100 focus:border-slate-900 outline-none transition-all text-slate-900 font-medium text-xl resize-none shadow-sm placeholder:text-slate-200"
                  placeholder="Draft your diagnostic reasoning..."
                  value={answers[q.id] || ''}
                  onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                />
              </div>
            ))}
            <div className="pt-16 border-t flex justify-end">
              <button
                disabled={isSubmitting}
                onClick={handleFinalSubmit}
                className="px-16 py-6 rounded-[24px] font-black text-xl bg-slate-900 text-white hover:bg-black transition-all shadow-2xl uppercase tracking-tighter"
              >
                {isSubmitting ? 'Syncing...' : 'Submit Answers'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showQuitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white rounded-[48px] p-12 max-w-md w-full shadow-2xl animate-in zoom-in duration-200">
            <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tighter uppercase italic">End Simulation?</h3>
            <p className="text-slate-500 mb-10 font-bold leading-relaxed">Terminating will permanently delete this attempt. Choose <span className="text-slate-900">Resume</span> to keep working.</p>
            <div className="flex flex-col gap-3">
              <button onClick={() => setShowQuitModal(false)} className="w-full py-5 rounded-2xl font-black text-xs uppercase tracking-widest bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all">Resume Working</button>
              <button onClick={handleQuit} className="w-full py-5 rounded-2xl font-black text-xs uppercase tracking-widest bg-red-600 text-white hover:bg-red-700 flex items-center justify-center gap-2 transition-all shadow-xl shadow-red-100">
                <LogOut size={18} /> End & Delete Attempt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

