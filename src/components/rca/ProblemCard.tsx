'use client';

import Link from 'next/link';
import { ChevronRight, Award, RotateCcw, Clock, BarChart3 } from 'lucide-react';

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

// Muted difficulty badge colors
const getDifficultyStyles = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
        case 'easy':
            return 'bg-green-50 text-green-700 border-green-100';
        case 'medium':
            return 'bg-amber-50 text-amber-700 border-amber-100';
        case 'hard':
        case 'difficult':
            return 'bg-rose-50 text-rose-700 border-rose-100';
        default:
            return 'bg-gray-50 text-gray-600 border-gray-100';
    }
};

export default function ProblemCard({ problem, attempt }: ProblemCardProps) {
    const isCompleted = attempt?.status === 'evaluated' || attempt?.status === 'submitted';
    const isInProgress = attempt?.status === 'in_progress';

    return (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 hover:border-blue-400 hover:shadow-md transition-all">
            <div className="flex flex-col md:flex-row justify-between md:items-start gap-6">
                <div className="flex-1 space-y-3">
                    {/* Title row with status badges */}
                    <div className="flex items-center gap-3 flex-wrap">
                        <h2 className="text-lg font-semibold text-gray-800">{problem.title}</h2>
                        {isCompleted && (
                            <span className="bg-green-50 text-green-700 text-[10px] font-semibold px-2.5 py-1 rounded-full border border-green-100">
                                COMPLETED
                            </span>
                        )}
                        {isInProgress && (
                            <span className="bg-amber-50 text-amber-700 text-[10px] font-semibold px-2.5 py-1 rounded-full border border-amber-100 animate-pulse">
                                IN PROGRESS
                            </span>
                        )}
                    </div>

                    {/* Description */}
                    <p className="text-sm text-gray-500 leading-relaxed max-w-xl">{problem.description}</p>

                    {/* Metadata badges */}
                    <div className="flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 text-gray-600 rounded-lg border border-gray-100">
                            <Clock size={12} /> {problem.time_limit_minutes} mins
                        </span>
                        <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border capitalize ${getDifficultyStyles(problem.difficulty)}`}>
                            <BarChart3 size={12} /> {problem.difficulty}
                        </span>
                    </div>

                    {/* Score display for completed */}
                    {isCompleted && (
                        <div className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
                            <Award size={16} className="text-amber-500" />
                            Score: {attempt.final_score}/{attempt.total_possible_score}
                        </div>
                    )}
                </div>

                {/* Action buttons */}
                <div className="flex flex-col gap-2.5 min-w-[180px]">
                    {isCompleted ? (
                        <>
                            <Link
                                href={`/rca/${problem.id}/results/${attempt.id}`}
                                className="w-full py-3 rounded-xl font-medium bg-gray-50 text-gray-600 hover:bg-gray-100 text-center text-xs uppercase tracking-wide border border-gray-200 transition-all"
                            >
                                View Analytics
                            </Link>
                            <Link
                                href={`/rca/${problem.id}`}
                                className="w-full py-3 rounded-xl font-medium bg-gray-900 text-white hover:bg-gray-800 text-center text-xs uppercase tracking-wide flex items-center justify-center gap-2 shadow-sm"
                            >
                                <RotateCcw size={14} /> Reattempt
                            </Link>
                        </>
                    ) : (
                        <Link
                            href={`/rca/${problem.id}`}
                            className={`px-6 py-3.5 rounded-xl font-medium text-xs uppercase tracking-wide transition-all text-center flex items-center justify-center gap-2 ${isInProgress
                                ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm'
                                : 'bg-gray-900 text-white hover:bg-gray-800 shadow-md'
                                }`}
                        >
                            {isInProgress ? 'Resume Simulation' : 'Start Simulation'} <ChevronRight size={16} />
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}
