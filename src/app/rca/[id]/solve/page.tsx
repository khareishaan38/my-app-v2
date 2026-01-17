'use client';

import React, { useEffect, useState, use, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Clock, Home, XCircle, LogOut, CheckCircle2, Award } from 'lucide-react';
import ConversationFeed from '@/components/chat/ConversationFeed';
import ChatInput from '@/components/chat/ChatInput';
import { ChatMessageType } from '@/components/chat/ChatMessage';
import { motion, AnimatePresence } from 'framer-motion';

interface Question {
  id: string;
  question_text: string;
  gold_standard_answer: string;
  rubric_items: string[];
  order_index: number;
  context_summary?: string;
}

interface SavedState {
  messages: ChatMessageType[];
  questionsAsked: number[];
  readyForEvaluation?: boolean;
}

export default function SolvingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: problemId } = use(params);
  const router = useRouter();
  const isCreating = useRef(false);

  const [problem, setProblem] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [showBackModal, setShowBackModal] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [showResults, setShowResults] = useState(false);

  // Chat state - free-flow mode
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [questionsAsked, setQuestionsAsked] = useState<number[]>([]);
  const [readyForEvaluation, setReadyForEvaluation] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  // Initialize session
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
        setTimeLeft(existing.time_remaining !== null ? existing.time_remaining : (pRes.data?.time_limit_minutes || 15) * 60);

        // Restore saved chat state
        if (existing.answers?.messages) {
          const savedState: SavedState = existing.answers;
          setMessages(savedState.messages || []);
          setQuestionsAsked(savedState.questionsAsked || []);
          setReadyForEvaluation(savedState.readyForEvaluation || false);
        }

        if (existing.status === 'submitted') {
          setShowResults(true);
        }
      } else {
        if (isCreating.current) return;
        isCreating.current = true;
        const initialTime = (pRes.data?.time_limit_minutes || 15) * 60;
        const greeting = getInitialGreeting(pRes.data, qRes.data?.[0]);
        const initialMessages = [{ role: 'dan' as const, content: greeting }];

        const { data: newAttempt } = await supabase.from('attempts').insert([{
          problem_id: problemId,
          user_id: session.user.id,
          status: 'in_progress',
          start_time: new Date().toISOString(),
          time_remaining: initialTime,
          answers: { messages: initialMessages, questionsAsked: [], readyForEvaluation: false }
        }]).select().single();

        if (newAttempt) {
          setAttemptId(newAttempt.id);
          setTimeLeft(initialTime);
          setMessages(initialMessages);
        }
      }
      setInitializing(false);
    }
    init();
  }, [problemId, router, supabase]);

  // Generate initial greeting
  const getInitialGreeting = (prob: any, firstQ: Question | undefined) => {
    return `Hey! I'm Dan 👋 

We've got an incident to debug together. Here's the situation:

**${prob?.title}**

Take a moment to read through the incident brief on the left, then let's work through this step by step.

When you're ready, here's what I need to know first:

**${firstQ?.question_text || 'What would you check first?'}**

Share your reasoning and I'll give you feedback!`;
  };

  // Auto-save chat state
  useEffect(() => {
    if (!attemptId || messages.length === 0) return;

    const timer = setTimeout(async () => {
      const saveState: SavedState = { messages, questionsAsked, readyForEvaluation };
      await supabase.from('attempts').update({
        answers: saveState,
        time_remaining: timeLeft,
        updated_at: new Date().toISOString()
      }).eq('id', attemptId);
    }, 2000);

    return () => clearTimeout(timer);
  }, [messages, questionsAsked, readyForEvaluation, attemptId, timeLeft, supabase]);

  // Periodic timer save (every 10 seconds) to prevent timer loss on refresh
  useEffect(() => {
    if (!attemptId || timeLeft === null || showResults) return;

    const saveTimer = setInterval(async () => {
      await supabase.from('attempts').update({
        time_remaining: timeLeft,
        updated_at: new Date().toISOString()
      }).eq('id', attemptId);
    }, 10000); // Save every 10 seconds

    return () => clearInterval(saveTimer);
  }, [attemptId, timeLeft, showResults, supabase]);

  // Timer logic
  useEffect(() => {
    if (initializing || timeLeft === null || timeLeft <= 0 || showResults || !attemptId) {
      if (timeLeft === 0 && attemptId && !showResults) handleAutoSubmit();
      return;
    }
    const interval = setInterval(() => setTimeLeft(prev => prev !== null ? prev - 1 : null), 1000);
    return () => clearInterval(interval);
  }, [timeLeft, showResults, attemptId, initializing]);

  // Refresh/close protection (beforeunload)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!showResults && !isSubmitting && messages.length > 0) {
        e.preventDefault();
        e.returnValue = 'Your progress may not be saved. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [showResults, isSubmitting, messages]);

  // Back button handling (popstate) - uses modal instead of window.confirm
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (!showResults && !isSubmitting && !showBackModal) {
        // Prevent the navigation by pushing state back
        e.preventDefault();
        window.history.pushState(null, '', window.location.href);
        // Show the back navigation modal
        setShowBackModal(true);
      }
    };

    // Push initial state to history
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [showResults, isSubmitting, showBackModal]);

  const handleAutoSubmit = async () => {
    // On timeout, trigger final evaluation
    setIsSubmitting(true);
    await handleFinalEvaluation(true);
  };

  const handleQuit = async () => {
    if (attemptId) {
      await supabase.from('attempts').update({ status: 'terminated' }).eq('id', attemptId);
      router.push('/rca');
    }
  };

  const handleSendMessage = async (userMessage: string, _isHint: boolean) => {
    // Add user message immediately to show in UI
    const newUserMessage: ChatMessageType = { role: 'user', content: userMessage };
    const messagesWithUser = [...messages, newUserMessage];
    setMessages(messagesWithUser);
    setIsTyping(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage,
          history: messages,
          problemContext: problem?.context || '',
          questions: questions.map(q => ({
            text: q.question_text,
            gold_standard_answer: q.gold_standard_answer,
            rubric_items: q.rubric_items,
            context_summary: q.context_summary
          })),
          questionsAsked,
          attemptId
        })
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Add Dan's response
      const danMessage: ChatMessageType = { role: 'dan', content: data.response };
      const updatedMessages = [...messagesWithUser, danMessage];
      setMessages(updatedMessages);

      // Update questions asked tracking
      const updatedQuestionsAsked = data.questionsAsked || questionsAsked;
      if (data.questionsAsked) {
        setQuestionsAsked(updatedQuestionsAsked);
      }

      // Check if ready for final evaluation
      const isReady = data.readyForEvaluation || readyForEvaluation;
      if (data.readyForEvaluation) {
        setReadyForEvaluation(true);
      }

      // IMMEDIATELY save to database after each exchange
      if (attemptId) {
        const saveState: SavedState = {
          messages: updatedMessages,
          questionsAsked: updatedQuestionsAsked,
          readyForEvaluation: isReady
        };
        await supabase.from('attempts').update({
          answers: saveState,
          time_remaining: timeLeft,
          updated_at: new Date().toISOString()
        }).eq('id', attemptId);
      }

    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'dan',
        content: "Sorry, I hit a snag processing that. Could you try rephrasing?"
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleFinalEvaluation = async (isTimeout: boolean = false) => {
    setIsEvaluating(true);
    setIsSubmitting(true);

    try {
      // DEBUG: Log what we're sending to evaluate
      console.log('=== EVALUATION DEBUG ===');
      console.log('questionsAsked being sent:', questionsAsked);
      console.log('questions.length:', questions.length);

      // Call the evaluation endpoint
      const evalResponse = await fetch('/api/chat/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          problemContext: problem?.context || '',
          questions: questions.map(q => ({
            text: q.question_text,
            gold_standard_answer: q.gold_standard_answer,
            rubric_items: q.rubric_items
          })),
          questionsAsked, // Pass which questions were covered
          attemptId
        })
      });

      const evalData = await evalResponse.json();

      // Save results to database
      await supabase.from('attempts').update({
        status: 'evaluated', // AI evaluation complete
        is_timeout: isTimeout,
        time_remaining: timeLeft || 0,
        final_score: evalData.totalScore,
        total_possible_score: evalData.maxTotalScore,
        answers: {
          messages,
          questionsAsked,
          readyForEvaluation: true,
          aiEvaluation: evalData
        }
      }).eq('id', attemptId);

      // Add completion message
      setMessages(prev => [...prev, {
        role: 'dan',
        content: `🎉 Great work! You've completed the debugging session!\n\nBased on our conversation, here's how you did:\n**${evalData.totalScore}/${evalData.maxTotalScore}** points (${evalData.percentage}%)\n\n${evalData.overallFeedback}\n\nClick "View Results" to see the detailed breakdown and complete your self-evaluation.`
      }]);

      setShowResults(true);
    } catch (error) {
      console.error('Evaluation error:', error);
      setMessages(prev => [...prev, {
        role: 'dan',
        content: "Sorry, I couldn't complete the evaluation. Please try again."
      }]);
    } finally {
      setIsEvaluating(false);
      setIsSubmitting(false);
    }
  };

  const handleSubmitForEvaluation = () => {
    handleFinalEvaluation(false);
  };

  // Progress tracking
  const questionsProgress = questionsAsked.length;
  const totalQuestions = questions.length;

  if (initializing) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center space-y-4">
      <div className="w-10 h-10 border-4 border-slate-100 border-t-slate-900 rounded-full animate-spin" />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Loading Workspace</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans overflow-hidden">
      {/* Header */}
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
          {/* Progress Indicator - shows which questions have been covered */}
          <div className="flex items-center gap-2">
            {questions.map((_, idx) => (
              <div
                key={idx}
                className={`w-3 h-3 rounded-full transition-colors ${questionsAsked.includes(idx)
                  ? 'bg-green-500'
                  : 'bg-slate-200'
                  }`}
              />
            ))}
          </div>

          <div className={`flex items-center gap-3 font-mono text-3xl font-black ${timeLeft !== null && timeLeft < 120 ? 'text-red-600 animate-pulse' : 'text-slate-900'}`}>
            <Clock size={28} /> {timeLeft !== null ? `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}` : '--:--'}
          </div>
          <button onClick={() => setShowQuitModal(true)} className="flex items-center gap-2 text-slate-400 hover:text-red-600 font-black text-xs uppercase tracking-widest border-l pl-8 transition-colors">
            <XCircle size={20} /> Quit Practice
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Incident Brief Panel */}
        <div className="w-1/3 border-r bg-slate-50/50 p-10 overflow-y-auto hidden md:block">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">Incident Brief</h2>
          <div className="text-slate-800 leading-relaxed whitespace-pre-wrap text-base font-medium prose prose-slate">
            {problem?.context}
          </div>
        </div>

        {/* Chat Panel */}
        <div className="flex-1 flex flex-col bg-white">
          <ConversationFeed messages={messages} isTyping={isTyping} />

          {/* Input or Results */}
          {showResults ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="border-t p-6 bg-gradient-to-r from-indigo-50 to-purple-50"
            >
              <div className="max-w-3xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center">
                    <Award size={32} className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-500">Conversation Complete</p>
                    <p className="text-xl font-black text-indigo-600">{questionsProgress}/{totalQuestions} Topics Covered</p>
                  </div>
                </div>
                <button
                  onClick={() => router.push(`/rca/${problemId}/results/${attemptId}`)}
                  className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-black transition-all"
                >
                  View Results
                </button>
              </div>
            </motion.div>
          ) : readyForEvaluation ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="border-t p-6 bg-gradient-to-r from-green-50 to-emerald-50"
            >
              <div className="max-w-3xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <CheckCircle2 size={32} className="text-green-600" />
                  <div>
                    <p className="text-sm font-bold text-slate-500">All questions explored!</p>
                    <p className="text-base text-slate-700">Ready to submit for evaluation?</p>
                  </div>
                </div>
                <button
                  onClick={handleSubmitForEvaluation}
                  disabled={isEvaluating}
                  className="px-8 py-4 bg-green-600 text-white rounded-2xl font-bold hover:bg-green-700 transition-all disabled:opacity-50"
                >
                  {isEvaluating ? 'Evaluating...' : 'Submit for Evaluation'}
                </button>
              </div>
            </motion.div>
          ) : (
            <ChatInput
              onSend={handleSendMessage}
              disabled={isSubmitting || isEvaluating}
              isLoading={isTyping}
              placeholder="Type your reasoning or ask questions..."
            />
          )}
        </div>
      </div>

      {/* Quit Modal */}
      <AnimatePresence>
        {showQuitModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[48px] p-12 max-w-md w-full shadow-2xl"
            >
              <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tighter uppercase italic">End Simulation?</h3>
              <p className="text-slate-500 mb-10 font-bold leading-relaxed">
                Terminating will permanently delete this attempt. Choose <span className="text-slate-900">Resume</span> to keep working.
              </p>
              <div className="flex flex-col gap-3">
                <button onClick={() => setShowQuitModal(false)} className="w-full py-5 rounded-2xl font-black text-xs uppercase tracking-widest bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all">
                  Resume Working
                </button>
                <button onClick={handleQuit} className="w-full py-5 rounded-2xl font-black text-xs uppercase tracking-widest bg-red-600 text-white hover:bg-red-700 flex items-center justify-center gap-2 transition-all shadow-xl shadow-red-100">
                  <LogOut size={18} /> End & Delete Attempt
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Back Navigation Modal */}
      <AnimatePresence>
        {showBackModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[48px] p-12 max-w-md w-full shadow-2xl"
            >
              <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tighter uppercase italic">Leave Simulation?</h3>
              <p className="text-slate-500 mb-10 font-bold leading-relaxed">
                Your progress will be saved. You can resume this attempt later from the <span className="text-slate-900">Resume</span> button on the problem card.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => setShowBackModal(false)}
                  className="w-full py-5 rounded-2xl font-black text-xs uppercase tracking-widest bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
                >
                  Resume Working
                </button>
                <button
                  onClick={async () => {
                    // Save state before leaving
                    if (attemptId && timeLeft !== null) {
                      const saveState: SavedState = { messages, questionsAsked, readyForEvaluation };
                      await supabase.from('attempts').update({
                        answers: saveState,
                        time_remaining: timeLeft,
                        updated_at: new Date().toISOString()
                      }).eq('id', attemptId);
                    }
                    router.push('/rca');
                  }}
                  className="w-full py-5 rounded-2xl font-black text-xs uppercase tracking-widest bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
                >
                  Go to Problems
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
