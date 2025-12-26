'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAutoSave } from '@/hooks/useAutoSave';
import { Clock, Home, AlertCircle, CheckCircle2, XCircle, LogOut } from 'lucide-react';
import SelfEvaluation from '@/components/rca/SelfEvaluation';

// LOCK to prevent double-creation in React Strict Mode
let isCreating = false;

export default function SolvingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: problemId } = use(params);
  const router = useRouter();

  const [problem, setProblem] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [showQuitModal, setShowQuitModal] = useState(false);

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
        setTimeLeft(existing.time_remaining !== null ? existing.time_remaining : (p?.time_limit_minutes || 15) * 60);
      } else {
        if (isCreating) return;
        isCreating = true;
        
        const { data: newAttempt } = await supabase.from('attempts').insert([{ 
          problem_id: problemId, 
          status: 'in_progress', 
          start_time: new Date().toISOString() 
        }]).select().single();
        
        if (newAttempt) {
          setAttemptId(newAttempt.id);
          setTimeLeft((p?.time_limit_minutes || 15) * 60);
        }
        isCreating = false;
      }
    }
    init();
  }, [problemId]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isEvaluating && !isSubmitting) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      if (!isEvaluating && !isSubmitting) {
        if (window.confirm("Your progress may not be saved. Do you really want to leave?")) {
          router.push('/rca');
        } else {
          window.history.pushState(null, '', window.location.href);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isEvaluating, isSubmitting, router]);

  useEffect(() => {
    if (timeLeft <= 0 || isEvaluating || !attemptId) {
      if (timeLeft === 0 && attemptId && !isEvaluating) handleAutoSubmit();
      return;
    }
    const interval = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [timeLeft, isEvaluating, attemptId]);

  useAutoSave(attemptId, answers);

  useEffect(() => {
    const saveTime = async () => {
      if (attemptId && timeLeft > 0 && timeLeft % 10 === 0) {
        await supabase.from('attempts').update({ time_remaining: timeLeft }).eq('id', attemptId);
      }
    };
    saveTime();
  }, [timeLeft, attemptId]);

  const handleAutoSubmit = async () => {
    setIsSubmitting(true);
    await supabase.from('attempts').update({ status: 'submitted', is_timeout: true, time_remaining: 0 }).eq('id', attemptId);
    setIsEvaluating(true);
    setIsSubmitting(false);
  };

  const handleQuit = async () => {
    if (attemptId) {
      await supabase.from('attempts').update({ status: 'terminated' }).eq('id', attemptId);
      router.push('/rca');
    }
  };

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
      await supabase.from('attempts').update({ status: 'submitted', time_remaining: timeLeft }).eq('id', attemptId);
      setIsEvaluating(true);
    } catch (e) { console.error(e); } finally { setIsSubmitting(false); }
  };

  if (!problem) return <div className="p-20 text-center text-slate-400 font-medium">Syncing Workspace...</div>;

  if (isEvaluating) {
    return <SelfEvaluation attemptId={attemptId!} questions={questions} userAnswers={answers} onComplete={() => router.push('/rca')} />;
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b bg-slate-50 p-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => setShowQuitModal(true)} className="text-slate-500 hover:text-red-600 transition-colors">
            <Home size={20}/>
          </button>
          <span className="text-slate-300">/</span>
          <span className="font-bold text-slate-800 tracking-tight">{problem.title}</span>
        </div>
        <div className="flex items-center gap-6">
          <div className={`flex items-center gap-2 font-mono text-2xl font-black ${timeLeft < 120 ? 'text-red-600 animate-pulse' : 'text-slate-900'}`}>
            <Clock size={24} /> {formatTime(timeLeft)}
          </div>
          <button onClick={() => setShowQuitModal(true)} className="flex items-center gap-1.5 text-slate-400 hover:text-red-600 font-bold text-sm border-l pl-6 transition-colors font-sans">
            <XCircle size={18} /> Quit Practice
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-1/3 border-r bg-slate-50 p-8 overflow-y-auto hidden md:block">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 font-sans">Incident Brief</h2>
          <div className="text-slate-700 leading-relaxed whitespace-pre-wrap text-sm font-medium font-sans">{problem.context}</div>
        </div>
        <div className="flex-1 p-12 overflow-y-auto bg-white">
          <div className="max-w-3xl mx-auto space-y-12 pb-32">
            {questions.map((q, index) => (
              <div key={q.id} className="space-y-6">
                <div className="flex items-start gap-4">
                  <span className="bg-slate-900 text-white w-8 h-8 rounded-lg flex items-center justify-center font-bold flex-shrink-0 text-sm">{index + 1}</span>
                  <h3 className="text-xl font-bold text-slate-900 leading-tight font-sans">{q.question_text}</h3>
                </div>
                <textarea 
                  className="w-full h-48 p-6 rounded-2xl border-2 border-slate-100 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 outline-none transition-all text-slate-900 font-medium text-lg resize-none shadow-sm placeholder:text-slate-300 font-sans" 
                  placeholder="Draft your diagnostic reasoning..." 
                  value={answers[q.id] || ''} 
                  onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} 
                />
              </div>
            ))}
            <div className="pt-12 border-t flex items-center justify-end">
              <button 
                disabled={!allAnswered || isSubmitting} 
                onClick={handleFinalSubmit} 
                className={`px-12 py-5 rounded-2xl font-black text-lg transition-all shadow-2xl font-sans ${allAnswered ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100' : 'bg-slate-100 text-slate-300'}`}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Answers'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showQuitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in duration-200">
            <h3 className="text-2xl font-bold text-slate-900 mb-2 font-sans">End Practice?</h3>
            <p className="text-slate-500 mb-8 leading-relaxed font-sans">
              Terminating will remove this attempt from your record. Click <b>Keep Working</b> if you just want to take a break.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowQuitModal(false)} className="flex-1 px-6 py-4 rounded-xl font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 font-sans">Keep Working</button>
              <button onClick={handleQuit} className="flex-1 px-6 py-4 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 flex items-center justify-center gap-2 font-sans">
                <LogOut size={18} /> End & Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

