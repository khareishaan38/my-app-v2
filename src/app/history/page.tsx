'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import { Home, Calendar, Award, ChevronRight } from 'lucide-react';
import Header from '@/components/layout/Header';

interface Attempt {
    id: string;
    problem_id: string;
    status: string;
    final_score: number | null;
    total_possible_score: number | null;
    created_at: string;
    problem?: {
        id: string;
        title: string;
        difficulty: string;
    };
}

export default function HistoryPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [attempts, setAttempts] = useState<Attempt[]>([]);
    const [loading, setLoading] = useState(true);

    const supabase = useMemo(() => createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ), []);

    useEffect(() => {
        async function fetchData() {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) {
                router.push('/');
                return;
            }
            setUser(session.user);

            // Fetch all evaluated attempts
            const { data: attemptsData } = await supabase
                .from('attempts')
                .select('id, problem_id, status, final_score, total_possible_score, created_at')
                .eq('user_id', session.user.id)
                .eq('status', 'evaluated')
                .order('created_at', { ascending: false });

            if (attemptsData) {
                const problemIds = [...new Set(attemptsData.map(a => a.problem_id))];
                const { data: problemsData } = await supabase
                    .from('problems')
                    .select('id, title, difficulty')
                    .in('id', problemIds);

                const problemMap = new Map(problemsData?.map(p => [p.id, p]) || []);

                const attemptsWithProblems = attemptsData.map(a => ({
                    ...a,
                    problem: problemMap.get(a.problem_id)
                }));

                setAttempts(attemptsWithProblems);
            }

            setLoading(false);
        }
        fetchData();
    }, [router, supabase]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            <Header user={user} supabase={supabase} />
            <div className="max-w-4xl mx-auto px-8 pt-24 pb-8">

                {/* Breadcrumb */}
                <nav className="flex items-center space-x-2 text-sm text-slate-500 mb-8 font-bold uppercase tracking-widest">
                    <Link href="/dashboard" className="hover:text-slate-900 flex items-center gap-1">
                        <Home size={14} /> Dashboard
                    </Link>
                    <span>/</span>
                    <Link href="/profile" className="hover:text-slate-900">My Profile</Link>
                    <span>/</span>
                    <span className="text-slate-900">History</span>
                </nav>

                {/* History Content */}
                <div className="bg-white border-2 border-slate-100 rounded-[40px] p-10">
                    <h2 className="text-2xl font-black text-slate-900 mb-6">Attempt History</h2>

                    {attempts.length > 0 ? (
                        <div className="space-y-4">
                            {attempts.map((attempt) => (
                                <div
                                    key={attempt.id}
                                    className="flex items-center justify-between p-5 rounded-2xl border border-gray-200 bg-gray-50 hover:bg-white hover:border-gray-300 transition-all"
                                >
                                    <div className="flex-1">
                                        <p className="font-bold text-slate-900">{attempt.problem?.title || 'Unknown Problem'}</p>
                                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                                            <span className="flex items-center gap-1">
                                                <Calendar size={12} />
                                                {new Date(attempt.created_at).toLocaleDateString()}
                                            </span>
                                            <span className="px-2 py-0.5 bg-slate-100 rounded capitalize">
                                                {attempt.problem?.difficulty || 'Unknown'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2 text-indigo-600 font-bold">
                                            <Award size={18} />
                                            {attempt.final_score}/{attempt.total_possible_score}
                                        </div>
                                        <Link
                                            href={`/rca/${attempt.problem_id}/results/${attempt.id}`}
                                            className="flex items-center gap-1 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-all"
                                        >
                                            View Analytics <ChevronRight size={14} />
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-slate-400 text-sm">No completed attempts yet. Start practicing!</p>
                    )}
                </div>
            </div>
        </div>
    );
}
