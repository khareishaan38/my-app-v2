'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Home } from 'lucide-react';
import ProblemCard from '@/components/rca/ProblemCard';
import SearchBar from '@/components/rca/SearchBar';
import FilterBar from '@/components/rca/FilterBar';

interface Problem {
  id: string;
  title: string;
  description: string;
  time_limit_minutes: number;
  difficulty: string;
}

interface Attempt {
  id: string;
  problem_id: string;
  status: string;
  final_score: number | null;
  total_possible_score: number | null;
}

function RCAListingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [problems, setProblems] = useState<Problem[]>([]);
  const [attempts, setAttempts] = useState<Record<string, Attempt>>({});
  const [loading, setLoading] = useState(true);

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { router.push('/'); return; }

      try {
        const { data: pData } = await supabase.from('problems').select('*').eq('is_active', true);
        const { data: aData } = await supabase
          .from('attempts')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });

        setProblems(pData || []);
        const attemptMap: Record<string, Attempt> = {};

        pData?.forEach(prob => {
          const userAttempts = (aData || []).filter(a => a.problem_id === prob.id && a.status !== 'terminated');
          if (userAttempts.length > 0) {
            // Logic Map H & K: Prioritize active attempts (in_progress/submitted) then evaluated
            const active = userAttempts.find(a => a.status === 'in_progress' || a.status === 'submitted');
            const evaluated = userAttempts.find(a => a.status === 'evaluated');
            attemptMap[prob.id] = active || evaluated || null;
          }
        });
        setAttempts(attemptMap);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [router, supabase]);

  // Filter logic based on URL params
  const filteredProblems = useMemo(() => {
    let result = [...problems];

    // Search filter (q param)
    const searchQuery = searchParams.get('q')?.toLowerCase();
    if (searchQuery) {
      result = result.filter(p =>
        p.title.toLowerCase().includes(searchQuery) ||
        p.description.toLowerCase().includes(searchQuery)
      );
    }

    // Difficulty filter
    const difficultyFilter = searchParams.get('difficulty')?.split(',') || [];
    if (difficultyFilter.length > 0) {
      result = result.filter(p => difficultyFilter.includes(p.difficulty.toLowerCase()));
    }

    // Time filter
    const timeFilter = searchParams.get('time')?.split(',') || [];
    if (timeFilter.length > 0) {
      result = result.filter(p => timeFilter.includes(p.time_limit_minutes.toString()));
    }

    // Status filter
    const statusFilter = searchParams.get('status')?.split(',') || [];
    if (statusFilter.length > 0) {
      result = result.filter(p => {
        const attempt = attempts[p.id];

        // Attempted: has submitted OR evaluated entry
        const isAttempted = attempt?.status === 'submitted' || attempt?.status === 'evaluated';

        // Never Attempted: no entry OR only terminated entries
        const isNeverAttempted = !attempt;

        // In Progress: has in_progress entry
        const isInProgress = attempt?.status === 'in_progress';

        return (
          (statusFilter.includes('attempted') && isAttempted) ||
          (statusFilter.includes('never_attempted') && isNeverAttempted) ||
          (statusFilter.includes('in_progress') && isInProgress)
        );
      });
    }

    return result;
  }, [problems, attempts, searchParams]);

  if (loading) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center space-y-4">
      <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Restoring Engine State</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <nav className="flex items-center space-x-2 text-sm text-slate-500 mb-8 font-bold uppercase tracking-widest">
          <Link href="/dashboard" className="hover:text-slate-900 flex items-center gap-1"><Home size={14} /> Dashboard</Link>
          <span>/</span>
          <span className="text-slate-900">RCA Simulations</span>
        </nav>

        {/* Search and Filters */}
        <div className="space-y-4 mb-8">
          <SearchBar placeholder="Search by title or description..." />
          <FilterBar />
        </div>

        {/* Results count */}
        <div className="mb-6 text-sm font-bold text-slate-500">
          Showing {filteredProblems.length} of {problems.length} problems
        </div>

        {/* Problem Cards */}
        <div className="grid gap-6">
          {filteredProblems.length > 0 ? (
            filteredProblems.map((problem) => (
              <ProblemCard
                key={problem.id}
                problem={problem}
                attempt={attempts[problem.id] || null}
              />
            ))
          ) : (
            <div className="text-center py-16 text-slate-400">
              <p className="text-lg font-bold">No problems match your filters</p>
              <p className="text-sm mt-2">Try adjusting your search or filter criteria</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Wrap with Suspense for useSearchParams
export default function RCAListingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Loading</p>
      </div>
    }>
      <RCAListingContent />
    </Suspense>
  );
}
