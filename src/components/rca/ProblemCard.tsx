'use client';

import Link from 'next/link';
import { ChevronRight, CheckCircle2, Award, RotateCcw, Clock } from 'lucide-react';

interface Problem {
    id: string;
    title: string;
    description: string;
    time_limit_minutes: number;
    difficulty: string;
}

interface Attempt {
    id: string;
    status: string;
    final_score: number | null;
    total_possible_score: number | null;
}

interface ProblemCardProps {
    problem: Problem;
    attempt: Attempt | null;
}

export default function ProblemCard({ problem, attempt }: ProblemCardProps) {
    const isCompleted = attempt?.status === 'evaluated';
    const isInProgress = attempt?.status === 'in_progress' || attempt?.status === 'submitted';

    return (
        <div className="bg-white border-2 border-slate-100 rounded-[40px] p-10 hover:border-slate-900 transition-all shadow-sm">
            <div className="flex flex-col md:flex-row justify-between md:items-start gap-8">
                <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-3 flex-wrap">
                        <h2 className="text-3xl font-black text-slate-900 italic tracking-tighter uppercase">{problem.title}</h2>
                        {isCompleted && <span className="bg-green-100 text-green-700 text-[10px] font-black px-3 py-1 rounded-full">COMPLETED</span>}
                        {isInProgress && <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-3 py-1 rounded-full animate-pulse">IN PROGRESS</span>}
                    </div>
                    <p className="text-slate-500 text-sm font-bold leading-relaxed max-w-xl">{problem.description}</p>

                    {/* Problem metadata badges */}
                    <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
                        <span className="flex items-center gap-1">
                            <Clock size={14} /> {problem.time_limit_minutes} mins
                        </span>
                        <span className="px-2 py-1 bg-slate-100 rounded-lg capitalize">{problem.difficulty}</span>
                    </div>

                    {isCompleted && (
                        <div className="inline-flex items-center gap-2 text-sm font-black text-slate-900 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-200">
                            <Award size={18} /> Score: {attempt.final_score}/{attempt.total_possible_score}
                        </div>
                    )}
                </div>
                <div className="flex flex-col gap-3 min-w-[200px]">
                    {isCompleted ? (
                        <>
                            <Link href={`/rca/${problem.id}/results/${attempt.id}`} className="w-full py-4 rounded-2xl font-black bg-slate-50 text-slate-500 hover:bg-slate-100 text-center text-xs uppercase tracking-widest border border-slate-200 transition-all">View Analytics</Link>
                            <Link href={`/rca/${problem.id}`} className="w-full py-4 rounded-2xl font-black bg-slate-900 text-white hover:bg-black text-center text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl"><RotateCcw size={16} /> Reattempt</Link>
                        </>
                    ) : (
                        <Link href={`/rca/${problem.id}`} className={`px-8 py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all text-center ${isInProgress ? 'bg-amber-500 text-white shadow-lg' : 'bg-slate-900 text-white shadow-2xl'} flex items-center justify-center gap-2`}>
                            {isInProgress ? 'Resume Simulation' : 'Start Simulation'} <ChevronRight size={18} />
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}
