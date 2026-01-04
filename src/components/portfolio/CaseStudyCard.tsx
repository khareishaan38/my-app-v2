'use client';

import Link from 'next/link';
import { Award, Calendar, ChevronRight } from 'lucide-react';

interface CaseStudyAttempt {
    id: string;
    problem_id: string;
    final_score: number | null;
    total_possible_score: number | null;
    created_at: string;
    problem?: {
        title: string;
    };
}

interface CaseStudyCardProps {
    attempt: CaseStudyAttempt;
    isEditable: boolean;
}

export default function CaseStudyCard({ attempt, isEditable }: CaseStudyCardProps) {
    const score = attempt.final_score ?? 0;
    const maxScore = attempt.total_possible_score ?? 1;
    const percentage = Math.round((score / maxScore) * 100);

    // Determine score color based on percentage
    const getScoreColor = () => {
        if (percentage >= 80) return 'text-green-600 bg-green-50 border-green-200';
        if (percentage >= 60) return 'text-amber-600 bg-amber-50 border-amber-200';
        return 'text-slate-600 bg-slate-50 border-slate-200';
    };

    const content = (
        <div className={`
            p-5 rounded-2xl border-2 transition-all
            ${isEditable ? 'border-slate-100 hover:border-indigo-300 hover:shadow-md cursor-pointer' : 'border-slate-100'}
        `}>
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-900 truncate">
                        {attempt.problem?.title || 'RCA Case Study'}
                    </h4>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            {new Date(attempt.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                            })}
                        </span>
                        <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded font-medium">
                            Verified
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border font-bold ${getScoreColor()}`}>
                        <Award size={16} />
                        <span>{score}/{maxScore}</span>
                    </div>
                    {isEditable && (
                        <ChevronRight size={20} className="text-slate-300" />
                    )}
                </div>
            </div>
        </div>
    );

    if (isEditable) {
        return (
            <Link href={`/rca/${attempt.problem_id}/results/${attempt.id}`}>
                {content}
            </Link>
        );
    }

    return content;
}
