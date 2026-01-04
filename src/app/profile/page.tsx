'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import { Home, Mail, Calendar, Award, CheckCircle, Trophy, Clock, BarChart3, AlertCircle, Briefcase, ChevronRight } from 'lucide-react';
import Header from '@/components/layout/Header';

interface Attempt {
    id: string;
    problem_id: string;
    status: string;
    final_score: number | null;
    total_possible_score: number | null;
    created_at: string;
    problem?: {
        title: string;
    };
}

interface UserStats {
    total_completed: number;
    average_score: number | null;
    total_minutes_practiced: number;
    favorite_difficulty: string | null;
    total_pending_eval: number;
}

const defaultStats: UserStats = {
    total_completed: 0,
    average_score: null,
    total_minutes_practiced: 0,
    favorite_difficulty: null,
    total_pending_eval: 0,
};

export default function ProfilePage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [attempts, setAttempts] = useState<Attempt[]>([]);
    const [stats, setStats] = useState<UserStats>(defaultStats);
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

            // Fetch user stats from view
            const { data: statsData } = await supabase
                .from('user_stats')
                .select('*')
                .eq('user_id', session.user.id)
                .maybeSingle();

            if (statsData) {
                setStats({
                    total_completed: statsData.total_completed || 0,
                    average_score: statsData.average_score,
                    total_minutes_practiced: statsData.total_minutes_practiced || 0,
                    favorite_difficulty: statsData.favorite_difficulty,
                    total_pending_eval: statsData.total_pending_eval || 0,
                });
            }

            // Fetch recent evaluated attempts with problem titles
            const { data: attemptsData } = await supabase
                .from('attempts')
                .select('id, problem_id, status, final_score, total_possible_score, created_at')
                .eq('user_id', session.user.id)
                .eq('status', 'evaluated')
                .order('created_at', { ascending: false })
                .limit(3);

            if (attemptsData) {
                const problemIds = [...new Set(attemptsData.map(a => a.problem_id))];
                const { data: problemsData } = await supabase
                    .from('problems')
                    .select('id, title')
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

    const avatarUrl = user?.user_metadata?.avatar_url;
    const fullName = user?.user_metadata?.full_name || user?.email || 'User';
    const email = user?.email || '';
    const initials = fullName
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();

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
                    <span className="text-slate-900">My Profile</span>
                </nav>

                {/* Profile Card */}
                <div className="bg-white border-2 border-slate-100 rounded-[40px] p-10 mb-8">
                    <div className="flex items-center gap-6">
                        {avatarUrl ? (
                            <img
                                src={avatarUrl}
                                alt={fullName}
                                className="w-24 h-24 rounded-full object-cover border-4 border-slate-200"
                            />
                        ) : (
                            <div className="w-24 h-24 rounded-full bg-indigo-600 flex items-center justify-center text-white font-black text-2xl">
                                {initials}
                            </div>
                        )}
                        <div>
                            <h2 className="text-3xl font-black text-slate-900">{fullName}</h2>
                            <p className="flex items-center gap-2 text-slate-500 mt-1">
                                <Mail size={16} /> {email}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Performance Stats */}
                <div className="bg-white border-2 border-slate-100 rounded-[40px] p-10 mb-8">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-black text-slate-900">Performance Stats</h3>
                        {stats.total_pending_eval > 0 && (
                            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full text-xs font-bold">
                                <AlertCircle size={14} />
                                {stats.total_pending_eval} pending evaluation
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {/* Problems Solved */}
                        <div className="bg-green-50 border border-green-200 rounded-2xl p-5 hover:-translate-y-1 hover:shadow-md transition-all cursor-default">
                            <div className="flex items-center gap-2 text-green-600 text-xs font-medium mb-2">
                                <CheckCircle size={14} />
                                Problems Solved
                            </div>
                            <p className="text-2xl font-bold text-green-800">{stats.total_completed}</p>
                        </div>

                        {/* Average Score */}
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 hover:-translate-y-1 hover:shadow-md transition-all cursor-default">
                            <div className="flex items-center gap-2 text-amber-600 text-xs font-medium mb-2">
                                <Trophy size={14} />
                                Average Score
                            </div>
                            <p className="text-2xl font-bold text-amber-800">
                                {stats.average_score !== null ? `${stats.average_score.toFixed(1)} / 3` : '—'}
                            </p>
                        </div>

                        {/* Practice Time */}
                        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 hover:-translate-y-1 hover:shadow-md transition-all cursor-default">
                            <div className="flex items-center gap-2 text-blue-600 text-xs font-medium mb-2">
                                <Clock size={14} />
                                Practice Time
                            </div>
                            <p className="text-2xl font-bold text-blue-800">{stats.total_minutes_practiced} mins</p>
                        </div>

                        {/* Top Strength */}
                        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5 hover:-translate-y-1 hover:shadow-md transition-all cursor-default">
                            <div className="flex items-center gap-2 text-purple-600 text-xs font-medium mb-2">
                                <BarChart3 size={14} />
                                Top Strength
                            </div>
                            <p className="text-2xl font-bold text-purple-800 capitalize">
                                {stats.favorite_difficulty || 'N/A'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* My Portfolio */}
                <Link
                    href="/portfolio"
                    className="block bg-white border-2 border-slate-100 rounded-[40px] p-8 mb-8 hover:border-indigo-400 hover:shadow-lg transition-all group"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                                <Briefcase size={24} className="text-indigo-600" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900">My Portfolio</h3>
                                <p className="text-sm text-slate-400">Showcase your PM skills</p>
                            </div>
                        </div>
                        <ChevronRight size={24} className="text-slate-300 group-hover:text-indigo-600 transition-colors" />
                    </div>
                </Link>

                {/* Recent Attempts */}
                <div className="bg-white border-2 border-slate-100 rounded-[40px] p-10">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-black text-slate-900">Recent Attempts</h3>
                        <Link
                            href="/history"
                            className="flex items-center gap-1 text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                        >
                            View All <ChevronRight size={16} />
                        </Link>
                    </div>
                    {attempts.length > 0 ? (
                        <div className="space-y-4">
                            {attempts.map((attempt) => (
                                <Link
                                    key={attempt.id}
                                    href={`/rca/${attempt.problem_id}/results/${attempt.id}`}
                                    className="flex items-center justify-between p-4 rounded-2xl border-2 border-slate-100 hover:border-slate-300 transition-all"
                                >
                                    <div>
                                        <p className="font-bold text-slate-900">{attempt.problem?.title || 'Unknown Problem'}</p>
                                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                                            <Calendar size={12} />
                                            {new Date(attempt.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 text-indigo-600 font-bold">
                                        <Award size={18} />
                                        {attempt.final_score}/{attempt.total_possible_score}
                                    </div>
                                </Link>
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
