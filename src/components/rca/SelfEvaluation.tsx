'use client';

import React, { useState } from 'react';
import { CheckCircle2, Award, Target, LayoutDashboard, AlertCircle } from 'lucide-react';
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

  const toggleCheck = (questionId: string, index: number) => {
    const question = questions.find(q => q.id === questionId);
    const current = checkedItems[questionId] || new Array(question.rubric_items.length).fill(false);
    const updated = [...current];
    updated[index] = !updated[index];
    setCheckedItems({ ...checkedItems, [questionId]: updated });
  };

  // STRICT VALIDATION: Every question must have at least one rubric item checked 'true'
  const allEvaluated = questions.length > 0 && questions.every(q => {
    const checks = checkedItems[q.id];
    return checks && checks.some(val => val === true);
  });

  const calculateScore = () => {
    let earned = 0;
    let total = 0;
    questions.forEach((q) => {
      const checks = checkedItems[q.id] || [];
      total += q.rubric_items.length;
      earned += checks.filter(Boolean).length;
    });
    return { earned, total };
  };

  const handleSubmitScore = async () => {
    if (!allEvaluated) return;
    setIsSubmitting(true);
    const scoreResult = calculateScore();
    
    await supabase.from('attempts').update({
      scores: checkedItems,
      final_score: scoreResult.earned,
      status: 'evaluated',
      updated_at: new Date().toISOString()
    }).eq('id', attemptId);
    
    setFinalScore(scoreResult);
    setIsRevealed(true);
    setIsSubmitting(false);
  };

  return (
    <div className="max-w-5xl mx-auto p-8 animate-in fade-in duration-700">
      {isRevealed && finalScore && (
        <div className="mb-12 p-10 bg-indigo-600 rounded-3xl text-white text-center shadow-2xl animate-in zoom-in duration-500">
          <div className="flex justify-center mb-4"><Target size={32} /></div>
          <h3 className="text-xl font-medium opacity-90">Simulation Complete!</h3>
          <div className="text-7xl font-black">{finalScore.earned}/{finalScore.total}</div>
        </div>
      )}

      {!isRevealed && (
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Self-Evaluation</h2>
          <p className="text-slate-600">Please select at least one rubric item you satisfied for each question.</p>
        </div>
      )}

      <div className="space-y-12">
        {questions.map((q) => (
          <div key={q.id} className="grid grid-cols-1 md:grid-cols-2 gap-8 border-b pb-12 last:border-0">
            <div className="space-y-4">
              <h3 className="font-bold text-slate-400 uppercase text-xs tracking-widest">Your Reasoning</h3>
              <div className="p-6 bg-slate-50 rounded-2xl text-slate-800 leading-relaxed border min-h-[160px]">
                {userAnswers[q.id]}
              </div>
              {isRevealed && (
                <div className="mt-6 p-6 bg-white border-2 border-indigo-50 rounded-2xl shadow-sm">
                  <div className="flex items-center gap-2 text-indigo-600 font-bold mb-2"><Award size={18} /> Gold Standard Answer</div>
                  <p className="text-slate-700 text-sm whitespace-pre-wrap">{q.gold_standard_answer}</p>
                </div>
              )}
            </div>

            <div className={`bg-white p-6 rounded-2xl border transition-all ${(!checkedItems[q.id] || !checkedItems[q.id].some(v => v)) && !isRevealed ? 'border-amber-300 bg-amber-50' : 'border-slate-200'}`}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-900 text-sm uppercase">Grading Rubric</h3>
                {(!checkedItems[q.id] || !checkedItems[q.id].some(v => v)) && !isRevealed && (
                  <span className="text-amber-600 text-[10px] font-bold flex items-center gap-1"><AlertCircle size={12}/> ACTION REQUIRED</span>
                )}
              </div>
              <div className="space-y-2">
                {q.rubric_items.map((item: string, idx: number) => (
                  <label key={idx} className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${checkedItems[q.id]?.[idx] ? 'bg-indigo-50 border-indigo-200' : 'hover:bg-slate-50 border-transparent'}`}>
                    <input 
                      type="checkbox" 
                      className="mt-1 w-5 h-5 rounded text-indigo-600"
                      checked={checkedItems[q.id]?.[idx] || false}
                      onChange={() => toggleCheck(q.id, idx)}
                      disabled={isRevealed}
                    />
                    <span className="text-sm text-slate-600">{item}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-16 flex flex-col items-center gap-6 pb-20">
        {!isRevealed ? (
          <button
            disabled={!allEvaluated || isSubmitting}
            onClick={handleSubmitScore}
            className={`px-16 py-5 rounded-2xl font-bold text-xl transition-all ${allEvaluated ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 hover:bg-indigo-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
          >
            {isSubmitting ? 'Calculating...' : 'Submit Evaluation'}
          </button>
        ) : (
          <button onClick={() => window.location.href = '/rca'} className="bg-slate-900 text-white px-12 py-5 rounded-2xl font-bold flex items-center gap-2">
            <LayoutDashboard size={20} /> Return to Dashboard
          </button>
        )}
      </div>
    </div>
  );
}

