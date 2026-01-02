'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import { Home, Settings } from 'lucide-react';
import Header from '@/components/layout/Header';

export default function SettingsPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const supabase = useMemo(() => createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ), []);

    useEffect(() => {
        async function checkSession() {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) {
                router.push('/');
                return;
            }
            setUser(session.user);
            setLoading(false);
        }
        checkSession();
    }, [router, supabase]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-8 font-sans">
            <div className="max-w-4xl mx-auto">
                <Header user={user} supabase={supabase} />

                {/* Breadcrumb */}
                <nav className="flex items-center space-x-2 text-sm text-slate-500 mb-8 font-bold uppercase tracking-widest">
                    <Link href="/dashboard" className="hover:text-slate-900 flex items-center gap-1">
                        <Home size={14} /> Dashboard
                    </Link>
                    <span>/</span>
                    <span className="text-slate-900">Settings</span>
                </nav>

                {/* Settings Content (Placeholder) */}
                <div className="bg-white border-2 border-slate-100 rounded-[40px] p-10">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center">
                            <Settings size={24} className="text-slate-400" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900">Settings</h2>
                    </div>
                    <p className="text-slate-400 text-sm">Settings options coming soon...</p>
                </div>
            </div>
        </div>
    );
}
