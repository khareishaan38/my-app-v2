'use client';

import { useEffect, useState, useMemo, use } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import { Lock, User, FileText, Award, ExternalLink } from 'lucide-react';
import DocumentList from '@/components/portfolio/DocumentList';
import CaseStudyCard from '@/components/portfolio/CaseStudyCard';

interface Profile {
    id: string;
    bio: string | null;
    is_public: boolean;
    full_name?: string | null;
    avatar_url?: string | null;
}

interface Attempt {
    id: string;
    problem_id: string;
    final_score: number | null;
    total_possible_score: number | null;
    created_at: string;
    problem?: {
        title: string;
    };
}

export default function PublicPortfolioPage({ params }: { params: Promise<{ userId: string }> }) {
    const { userId } = use(params);
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [attempts, setAttempts] = useState<Attempt[]>([]);
    const [isPrivate, setIsPrivate] = useState(false);
    const [notFound, setNotFound] = useState(false);

    const supabase = useMemo(() => createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ), []);

    useEffect(() => {
        async function fetchPublicProfile() {
            // Fetch profile
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('id, bio, is_public, full_name, avatar_url')
                .eq('id', userId)
                .maybeSingle();

            if (profileError || !profileData) {
                setNotFound(true);
                setLoading(false);
                return;
            }

            if (!profileData.is_public) {
                setIsPrivate(true);
                setLoading(false);
                return;
            }

            setProfile(profileData);

            // Fetch top 3 attempts for this user (public access via RLS)
            const { data: attemptsData } = await supabase
                .from('attempts')
                .select('id, problem_id, final_score, total_possible_score, created_at')
                .eq('user_id', userId)
                .eq('status', 'evaluated')
                .not('final_score', 'is', null)
                .order('final_score', { ascending: false })
                .limit(3);

            if (attemptsData && attemptsData.length > 0) {
                const problemIds = [...new Set(attemptsData.map(a => a.problem_id))];
                const { data: problemsData } = await supabase
                    .from('problems')
                    .select('id, title')
                    .in('id', problemIds);

                const problemMap = new Map(problemsData?.map(p => [p.id, p]) || []);

                setAttempts(attemptsData.map(a => ({
                    ...a,
                    problem: problemMap.get(a.problem_id)
                })));
            }

            setLoading(false);
        }

        fetchPublicProfile();
    }, [userId, supabase]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
            </div>
        );
    }

    if (notFound) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
                <div className="text-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <User size={32} className="text-slate-400" />
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 mb-2">Portfolio Not Found</h1>
                    <p className="text-slate-500">This portfolio doesn't exist or has been removed.</p>
                </div>
            </div>
        );
    }

    if (isPrivate) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
                <div className="text-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock size={32} className="text-slate-400" />
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 mb-2">This Portfolio is Private</h1>
                    <p className="text-slate-500">The owner has chosen to keep this portfolio private.</p>
                </div>
            </div>
        );
    }

    const fullName = profile?.full_name || 'PM Professional';
    const initials = fullName
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            {/* Minimal Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-8 py-4">
                <div className="flex justify-between items-center max-w-4xl mx-auto">
                    <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
                        <ExternalLink size={16} />
                        <span>Shared Portfolio</span>
                    </div>
                    <Link
                        href="/"
                        className="text-sm font-bold text-indigo-600 hover:text-indigo-700"
                    >
                        PMSense
                    </Link>
                </div>
            </header>

            <div className="max-w-4xl mx-auto px-8 pt-24 pb-8">
                {/* Profile Header */}
                <div className="bg-white border-2 border-slate-100 rounded-[40px] p-10 mb-8">
                    <div className="flex items-center gap-6">
                        {profile?.avatar_url ? (
                            <img
                                src={profile.avatar_url}
                                alt={fullName}
                                className="w-20 h-20 rounded-full object-cover border-4 border-slate-200"
                            />
                        ) : (
                            <div className="w-20 h-20 rounded-full bg-indigo-600 flex items-center justify-center text-white font-black text-2xl">
                                {initials}
                            </div>
                        )}
                        <div>
                            <h1 className="text-3xl font-black text-slate-900">{fullName}</h1>
                            <p className="text-sm text-slate-400 mt-1">PM Portfolio • Verified on PMSense</p>
                        </div>
                    </div>
                </div>

                {/* Executive Summary */}
                {profile?.bio && (
                    <div className="bg-white border-2 border-slate-100 rounded-[40px] p-10 mb-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                                <User size={20} className="text-purple-600" />
                            </div>
                            <h2 className="text-xl font-black text-slate-900">Executive Summary</h2>
                        </div>
                        <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                            {profile.bio}
                        </p>
                    </div>
                )}

                {/* Documents */}
                <div className="bg-white border-2 border-slate-100 rounded-[40px] p-10 mb-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                            <FileText size={20} className="text-blue-600" />
                        </div>
                        <h2 className="text-xl font-black text-slate-900">Resume & Documents</h2>
                    </div>
                    <DocumentList
                        userId={userId}
                        supabase={supabase}
                        isEditable={false}
                    />
                </div>

                {/* Verified Case Studies */}
                {attempts.length > 0 && (
                    <div className="bg-white border-2 border-slate-100 rounded-[40px] p-10 mb-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                                <Award size={20} className="text-amber-600" />
                            </div>
                            <h2 className="text-xl font-black text-slate-900">Verified Case Studies</h2>
                        </div>
                        <div className="space-y-3">
                            {attempts.map((attempt) => (
                                <CaseStudyCard
                                    key={attempt.id}
                                    attempt={attempt}
                                    isEditable={false}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="text-center py-8 text-sm text-slate-400">
                    <p>Verified portfolio powered by <span className="font-bold text-slate-600">PMSense</span></p>
                </div>
            </div>
        </div>
    );
}
