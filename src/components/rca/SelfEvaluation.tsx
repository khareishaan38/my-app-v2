'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle2, Award, Target, LayoutDashboard, AlertCircle, XCircle, LogOut, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Props {
  attemptId: string;
  questions: any[];
  userAnswers: Record<string, string>;
  onComplete: () => void;
}

export default function SelfEvaluation({ attemptId, questions, userAnswers, onComplete }: Props) {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean[]>>({});
  const [isRevealed, setIsRevealed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [finalScore, setFinalScore] = useState<{ earned: number; total: number } | null>(null);
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [isTimeoutAttempt, setIsTimeoutAttempt] = useState(false);

  useEffect(() => {
    async function checkAttempt() {
      const { data } = await supabase.from('attempts').select('is_timeout').eq('id', attemptId).single();
      if (data?.is_timeout) setIsTimeoutAttempt(true);
    }
    checkAttempt();
  }, [attemptId]);

  const toggleCheck = (questionId: string, index: number) => {
    const question = questions.find(q => q.id === questionId);
    const current = checkedItems[questionId] || new Array(question.rubric_items.length).fill(false);
    const updated = [...current];
    updated[index] = !updated[index];
    setCheckedItems({ ...checkedItems, [questionId]: updated });
  };

  const isAnswered = (qId: string) => userAnswers[qId]?.trim().length > 0;

  const allEvaluated = questions.every(q => {
    if (!isAnswered(q.id)) return true;
    const checks = checkedItems[q.id];
    return checks && checks.some(val => val === true);
  });

  const calculateScore = () => {
    let earned = 0;
    let total = 0;
    questions.forEach((q) => {
      if (isAnswered(q.id)) {
        const checks = checkedItems[q.id] || [];
        total += q.rubric_items.length;
        earned += checks.filter(Boolean).length;
      }
    });
    return { earned, total };
  };

  const handleSubmitScore = async () => {
    if (!allEvaluated) return;
    setIsSubmitting(true);
    const scoreResult = calculateScore();
    
    // UPDATED: Now saves the total_possible_score column
    await supabase.from('attempts').update({
      scores: checkedItems,
      final_score: scoreResult.earned,
      total_possible_score: scoreResult.total,
      status: 'evaluated',
      updated_at: new Date().toISOString()
    }).eq('id', attemptId);
    
    setFinalScore(scoreResult);
    setIsRevealed(true);
    setIsSubmitting(false);
  };

  const handleQuit = async () => {
    await supabase.from('attempts').update({ status: 'terminated' }).eq('id', attemptId);
    window.location.href = '/rca';
  };

  return (
    <div className="max-w-5xl mx-auto p-8 animate-in fade-in duration-700">
      {!isRevealed && (
        <div className="flex justify-between items-center mb-10 border-b pb-6">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">Self-Evaluation</h2>
            {isTimeoutAttempt && (
              <p className="text-amber-600 font-bold text-sm flex items-center gap-1 mt-1">
                <AlertCircle size={14} /> Time expired. Grading adjusted for completed work.
              </p>
            )}
          </div>
          <button onClick={() => setShowQuitModal(true)} className="text-slate-400 hover:text-red-600 font-bold text-sm flex items-center gap-1">
            <XCircle size={18} /> Quit Practice
          </button>
        </div>
      )}

      {isRevealed && finalScore && (
        <div className="mb-12 p-10 bg-indigo-600 rounded-3xl text-white text-center shadow-2xl animate-in zoom-in">
          <div className="flex justify-center mb-4"><Target size={32} /></div>
          <h3 className="text-xl font-medium opacity-90">Simulation Complete</h3>
          <div className="text-7xl font-black">{finalScore.earned}/{finalScore.total}</div>
          <p className="mt-4 text-indigo-100 text-sm">Score based on {questions.filter(q => isAnswered(q.id)).length} answered questions.</p>
        </div>
      )}

      <div className="space-y-12">
        {questions.map((q) => {
          const answered = isAnswered(q.id);
          return (
            <div key={q.id} className={`grid grid-cols-1 md:grid-cols-2 gap-8 border-b pb-12 last:border-0 ${!answered ? 'opacity-50' : ''}`}>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-400 uppercase text-xs tracking-widest">Your Reasoning</h3>
                  {!answered && <span className="bg-slate-200 text-slate-500 text-[10px] px-2 py-0.5 rounded font-bold">SKIPPED</span>}
                </div>
                <div className="p-6 bg-slate-50 rounded-2xl text-slate-800 leading-relaxed border min-h-[160px]">
                  {answered ? userAnswers[q.id] : "No response provided before timeout."}
                </div>
                {isRevealed && answered && (
                  <div className="mt-6 p-6 bg-white border-2 border-indigo-50 rounded-2xl">
                    <div className="flex items-center gap-2 text-indigo-600 font-bold mb-2"><Award size={18} /> Gold Standard</div>
                    <p className="text-slate-700 text-sm whitespace-pre-wrap">{q.gold_standard_answer}</p>
                  </div>
                )}
              </div>
              <div className={`bg-white p-6 rounded-2xl border transition-all ${answered && (!checkedItems[q.id] || !checkedItems[q.id].some(v => v)) && !isRevealed ? 'border-amber-300 bg-amber-50' : 'border-slate-200'}`}>
                <h3 className="font-bold text-slate-900 text-sm uppercase mb-4">Grading Rubric</h3>
                {!answered ? (
                  <div className="flex flex-col items-center justify-center h-full py-10 text-center text-slate-400">
                    <Clock size={24} className="mb-2" />
                    <p className="text-xs">No points available for skipped questions.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {q.rubric_items.map((item: string, idx: number) => (
                      <label key={idx} className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${checkedItems[q.id]?.[idx] ? 'bg-indigo-50 border-indigo-200' : 'hover:bg-slate-50 border-transparent'}`}>
                        <input type="checkbox" className="mt-1 w-5 h-5 rounded text-indigo-600" checked={checkedItems[q.id]?.[idx] || false} onChange={() => toggleCheck(q.id, idx)} disabled={isRevealed} />
                        <span className="text-sm text-slate-600">{item}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-16 flex flex-col items-center gap-6 pb-20">
        {!isRevealed ? (
          <button disabled={!allEvaluated || isSubmitting} onClick={handleSubmitScore} className={`px-16 py-5 rounded-2xl font-bold text-xl transition-all ${allEvaluated ? 'bg-indigo-600 text-white shadow-xl hover:bg-indigo-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
            {isSubmitting ? 'Finalizing...' : 'Submit Evaluation'}
          </button>
        ) : (
          <button onClick={() => window.location.href = '/rca'} className="bg-slate-900 text-white px-12 py-5 rounded-2xl font-bold flex items-center gap-2">
            <LayoutDashboard size={20} /> Return to Dashboard
          </button>
        )}
      </div>

      {showQuitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-2xl font-bold text-slate-900 mb-2">End Practice?</h3>
            <p className="text-slate-500 mb-8 leading-relaxed">Terminating will remove this attempt from your record. Progress cannot be recovered.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowQuitModal(false)} className="flex-1 px-6 py-4 rounded-xl font-bold bg-slate-100 text-slate-600">Resume</button>
              <button onClick={handleQuit} className="flex-1 px-6 py-4 rounded-xl font-bold bg-red-600 text-white flex items-center justify-center gap-2">
                <LogOut size={18} /> End & Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

