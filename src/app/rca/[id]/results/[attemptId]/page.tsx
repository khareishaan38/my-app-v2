'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useSessionGuard } from '@/hooks/useSessionGuard';
import { ChevronLeft, Award, CheckCircle2, LayoutDashboard, MessageSquare, Bot, XCircle } from 'lucide-react';

interface AIQuestionScore {
  questionIndex: number;
  score: number;
  maxScore: number;
  rubricMatches: boolean[];
  feedback: string;
}

interface AIEvaluation {
  scores: AIQuestionScore[];
  overallFeedback: string;
  totalScore: number;
  maxTotalScore: number;
  percentage: number;
}

export default function ResultsReviewPage({ params }: { params: Promise<{ id: string, attemptId: string }> }) {
  const { id: problemId, attemptId } = use(params);
  const { user, isLoading: sessionLoading, supabase } = useSessionGuard();
  const [attempt, setAttempt] = useState<any>(null);
  const [problem, setProblem] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiEvaluation, setAIEvaluation] = useState<AIEvaluation | null>(null);

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

        // Extract AI evaluation from answers
        if (a?.answers?.aiEvaluation) {
          setAIEvaluation(a.answers.aiEvaluation);
        }
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
        {/* AI Overall Feedback */}
        {aiEvaluation && (
          <div className="mb-12 p-6 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl text-white shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <Bot size={24} />
              <h2 className="font-bold text-lg">AI Evaluation Summary</h2>
            </div>
            <p className="text-indigo-100 leading-relaxed">{aiEvaluation.overallFeedback}</p>
            <div className="mt-4 pt-4 border-t border-white/20 flex items-center gap-6">
              <div className="text-center">
                <div className="text-3xl font-black">{aiEvaluation.percentage}%</div>
                <div className="text-xs opacity-80">Overall Score</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-black">{aiEvaluation.totalScore}/{aiEvaluation.maxTotalScore}</div>
                <div className="text-xs opacity-80">Points Earned</div>
              </div>
            </div>
          </div>
        )}

        <div className="mb-12">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 font-sans">Simulation Context</h2>
          <div className="bg-white p-8 rounded-3xl border border-slate-200 text-slate-700 leading-relaxed text-sm font-sans">
            {problem.context}
          </div>
        </div>

        {/* Split questions into answered vs unanswered */}
        {(() => {
          const questionsAsked: number[] = attempt?.answers?.questionsAsked || [];
          const answeredQuestions = questions.filter((_: any, idx: number) => questionsAsked.includes(idx));
          const unansweredQuestions = questions.filter((_: any, idx: number) => !questionsAsked.includes(idx));

          return (
            <div className="space-y-16">
              {/* Answered Questions Section */}
              {answeredQuestions.length > 0 && (
                <>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 size={20} className="text-green-600" />
                    <h2 className="text-sm font-black text-slate-700 uppercase tracking-widest">
                      Answered Questions ({answeredQuestions.length}/{questions.length})
                    </h2>
                  </div>

                  <div className="space-y-16">
                    {answeredQuestions.map((q: any) => {
                      const idx = questions.findIndex((oq: any) => oq.id === q.id);
                      const aiScore = aiEvaluation?.scores.find(s => s.questionIndex === idx);
                      const checkedItems = q.rubric_items.filter((_: string, i: number) => aiScore?.rubricMatches?.[i]);
                      const missedItems = q.rubric_items.filter((_: string, i: number) => !aiScore?.rubricMatches?.[i]);

                      return (
                        <div key={q.id} className="space-y-6">
                          {/* Question Header */}
                          <div className="flex items-center gap-4">
                            <span className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-bold">{idx + 1}</span>
                            <h3 className="text-xl font-bold text-slate-900 font-sans flex-1">{q.question_text}</h3>
                            {aiScore && (
                              <div className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-lg font-bold">
                                {aiScore.score}/{aiScore.maxScore}
                              </div>
                            )}
                          </div>

                          {/* AI Feedback Card */}
                          {aiScore && (
                            <div className="p-6 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl">
                              <div className="flex items-center gap-2 text-indigo-700 mb-3">
                                <Bot size={18} />
                                <span className="text-sm font-bold uppercase tracking-wide">AI Analysis</span>
                              </div>
                              <p className="text-slate-700 leading-relaxed">{aiScore.feedback}</p>
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Left Column: What You Covered + Missed */}
                            <div className="space-y-6">
                              {/* What You Covered */}
                              {checkedItems.length > 0 && (
                                <div className="p-5 bg-green-50 border border-green-200 rounded-2xl">
                                  <h4 className="text-xs font-black text-green-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <CheckCircle2 size={14} /> What You Covered
                                  </h4>
                                  <ul className="space-y-2">
                                    {checkedItems.map((item: string, i: number) => (
                                      <li key={i} className="text-sm text-green-800 flex items-start gap-2">
                                        <span className="text-green-600 mt-0.5">✓</span>
                                        {item}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* What You Missed */}
                              {missedItems.length > 0 && (
                                <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl">
                                  <h4 className="text-xs font-black text-amber-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <XCircle size={14} /> Areas to Improve
                                  </h4>
                                  <ul className="space-y-2">
                                    {missedItems.map((item: string, i: number) => (
                                      <li key={i} className="text-sm text-amber-800 flex items-start gap-2">
                                        <span className="text-amber-600 mt-0.5">○</span>
                                        {item}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>

                            {/* Right Column: Gold Standard */}
                            <div className="p-6 bg-indigo-600 rounded-2xl text-white shadow-lg h-fit">
                              <div className="flex items-center gap-2 mb-3 opacity-90">
                                <Award size={16} />
                                <span className="text-[10px] font-bold uppercase tracking-wider font-sans">Expert Gold Standard</span>
                              </div>
                              <p className="text-sm leading-relaxed font-sans opacity-95">{q.gold_standard_answer}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Unanswered Questions Section */}
              {unansweredQuestions.length > 0 && (
                <>
                  <div className="flex items-center gap-3 pt-8 border-t border-slate-200">
                    <XCircle size={20} className="text-slate-400" />
                    <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest">
                      Unanswered Questions ({unansweredQuestions.length})
                    </h2>
                  </div>

                  <div className="space-y-6">
                    {unansweredQuestions.map((q: any) => {
                      const idx = questions.findIndex((oq: any) => oq.id === q.id);
                      return (
                        <div key={q.id} className="p-6 bg-slate-50 border border-slate-200 rounded-2xl">
                          <div className="flex items-center gap-4">
                            <span className="w-10 h-10 bg-slate-300 text-slate-600 rounded-xl flex items-center justify-center font-bold">{idx + 1}</span>
                            <h3 className="text-lg font-bold text-slate-600 font-sans flex-1">{q.question_text}</h3>
                          </div>
                          <p className="mt-4 text-sm text-slate-500 italic">
                            You didn't cover this topic during the session. Re-attempt the problem to explore this question.
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          );
        })()}

        <div className="mt-20 border-t pt-10 text-center">
          <Link href="/rca" className="inline-flex items-center gap-2 bg-slate-900 text-white px-10 py-4 rounded-2xl font-bold hover:bg-black transition-all font-sans">
            <LayoutDashboard size={20} /> Back to Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
