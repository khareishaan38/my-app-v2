'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import {
    Home, Briefcase, Share2, Check, Save, Loader2, FileText,
    Award, ToggleLeft, ToggleRight, User
} from 'lucide-react';
import Header from '@/components/layout/Header';
import FileUpload from '@/components/portfolio/FileUpload';
import DocumentList from '@/components/portfolio/DocumentList';
import CaseStudyCard from '@/components/portfolio/CaseStudyCard';

interface Profile {
    bio: string | null;
    is_public: boolean;
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

export default function PortfolioPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<Profile>({ bio: null, is_public: false });
    const [bio, setBio] = useState('');
    const [attempts, setAttempts] = useState<Attempt[]>([]);
    const [savingBio, setSavingBio] = useState(false);
    const [togglingPublic, setTogglingPublic] = useState(false);
    const [copied, setCopied] = useState(false);
    const [refreshDocs, setRefreshDocs] = useState(0);
    const [bioSaved, setBioSaved] = useState(false);

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

            // Fetch profile data
            const { data: profileData } = await supabase
                .from('profiles')
                .select('bio, is_public')
                .eq('id', session.user.id)
                .maybeSingle();

            if (profileData) {
                setProfile(profileData);
                setBio(profileData.bio || '');
            }

            // Fetch top 3 highest-scoring evaluated attempts
            const { data: attemptsData } = await supabase
                .from('attempts')
                .select('id, problem_id, final_score, total_possible_score, created_at')
                .eq('user_id', session.user.id)
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
        fetchData();
    }, [router, supabase]);

    const handleSaveBio = async () => {
        if (!user) return;
        setSavingBio(true);
        setBioSaved(false);

        const { error } = await supabase
            .from('profiles')
            .upsert({
                id: user.id,
                bio: bio,
                full_name: user.user_metadata?.full_name || null,
                avatar_url: user.user_metadata?.avatar_url || null,
                updated_at: new Date().toISOString()
            }, { onConflict: 'id' });

        if (!error) {
            setProfile(prev => ({ ...prev, bio }));
            setBioSaved(true);
            setTimeout(() => setBioSaved(false), 2000);
        }
        setSavingBio(false);
    };

    const handleTogglePublic = async () => {
        if (!user) return;
        setTogglingPublic(true);

        const newValue = !profile.is_public;
        const { error } = await supabase
            .from('profiles')
            .upsert({
                id: user.id,
                is_public: newValue,
                updated_at: new Date().toISOString()
            }, { onConflict: 'id' });

        if (!error) {
            setProfile(prev => ({ ...prev, is_public: newValue }));
        }
        setTogglingPublic(false);
    };

    const handleShare = async () => {
        const url = `${window.location.origin}/share/${user?.id}`;
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const avatarUrl = user?.user_metadata?.avatar_url;
    const fullName = user?.user_metadata?.full_name || user?.email || 'User';
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
                    <Link href="/profile" className="hover:text-slate-900">My Profile</Link>
                    <span>/</span>
                    <span className="text-slate-900">Portfolio</span>
                </nav>

                {/* Profile Header */}
                <div className="bg-white border-2 border-slate-100 rounded-[40px] p-10 mb-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            {avatarUrl ? (
                                <img
                                    src={avatarUrl}
                                    alt={fullName}
                                    className="w-20 h-20 rounded-full object-cover border-4 border-slate-200"
                                />
                            ) : (
                                <div className="w-20 h-20 rounded-full bg-indigo-600 flex items-center justify-center text-white font-black text-2xl">
                                    {initials}
                                </div>
                            )}
                            <div>
                                <h2 className="text-2xl font-black text-slate-900">{fullName}</h2>
                                <p className="text-sm text-slate-400 mt-1">PM Portfolio • Proof of Work</p>
                            </div>
                        </div>
                        <button
                            onClick={handleShare}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${copied
                                ? 'bg-green-500 text-white'
                                : 'bg-slate-900 text-white hover:bg-slate-800'
                                }`}
                        >
                            {copied ? (
                                <>
                                    <Check size={18} /> Link Copied!
                                </>
                            ) : (
                                <>
                                    <Share2 size={18} /> Share Portfolio
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Executive Summary */}
                <div className="bg-white border-2 border-slate-100 rounded-[40px] p-10 mb-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                            <User size={20} className="text-purple-600" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900">Executive Summary</h3>
                    </div>
                    <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Write a compelling summary about yourself, your PM experience, and what makes you unique..."
                        className="w-full h-40 p-6 rounded-2xl border-2 border-slate-100 focus:border-indigo-300 outline-none transition-all text-slate-800 resize-none"
                    />
                    <div className="flex justify-end mt-4">
                        <button
                            onClick={handleSaveBio}
                            disabled={savingBio}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${bioSaved
                                ? 'bg-green-500 text-white'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                }`}
                        >
                            {savingBio ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : bioSaved ? (
                                <Check size={16} />
                            ) : (
                                <Save size={16} />
                            )}
                            {bioSaved ? 'Saved!' : 'Save Summary'}
                        </button>
                    </div>
                </div>

                {/* Resume & Documents */}
                <div className="bg-white border-2 border-slate-100 rounded-[40px] p-10 mb-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                            <FileText size={20} className="text-blue-600" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900">Resume & Documents</h3>
                    </div>
                    <FileUpload
                        userId={user.id}
                        supabase={supabase}
                        onUploadComplete={() => setRefreshDocs(prev => prev + 1)}
                    />
                    <div className="mt-6">
                        <DocumentList
                            userId={user.id}
                            supabase={supabase}
                            isEditable={true}
                            refreshTrigger={refreshDocs}
                        />
                    </div>
                </div>

                {/* Verified Case Studies */}
                <div className="bg-white border-2 border-slate-100 rounded-[40px] p-10 mb-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                            <Award size={20} className="text-amber-600" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900">Verified Case Studies</h3>
                    </div>
                    {attempts.length > 0 ? (
                        <div className="space-y-3">
                            {attempts.map((attempt) => (
                                <CaseStudyCard
                                    key={attempt.id}
                                    attempt={attempt}
                                    isEditable={true}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <Award size={32} className="mx-auto text-slate-300 mb-2" />
                            <p className="text-slate-400 text-sm">
                                Complete RCA problems to showcase your analytical skills
                            </p>
                            <Link
                                href="/rca"
                                className="inline-block mt-4 px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-all"
                            >
                                Start Practicing
                            </Link>
                        </div>
                    )}
                </div>

                {/* Public Toggle */}
                <div className="bg-white border-2 border-slate-100 rounded-[40px] p-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-slate-900">Portfolio Visibility</h3>
                            <p className="text-sm text-slate-400 mt-1">
                                {profile.is_public
                                    ? 'Your portfolio is visible to anyone with the link'
                                    : 'Your portfolio is private and only visible to you'}
                            </p>
                        </div>
                        <button
                            onClick={handleTogglePublic}
                            disabled={togglingPublic}
                            className={`flex items-center gap-3 px-4 py-2 rounded-xl font-bold text-sm transition-all ${profile.is_public
                                ? 'bg-green-100 text-green-700'
                                : 'bg-slate-100 text-slate-600'
                                }`}
                        >
                            {togglingPublic ? (
                                <Loader2 size={20} className="animate-spin" />
                            ) : profile.is_public ? (
                                <ToggleRight size={24} />
                            ) : (
                                <ToggleLeft size={24} />
                            )}
                            {profile.is_public ? 'Public' : 'Private'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
