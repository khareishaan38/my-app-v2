'use client';

import Link from 'next/link';
import UserAvatar from './UserAvatar';
import type { User } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

interface HeaderProps {
    user: User | null;
    supabase: SupabaseClient;
    isLoading?: boolean;
}

export default function Header({ user, supabase, isLoading = false }: HeaderProps) {
    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-slate-900 shadow-lg px-8 py-4">
            <div className="flex justify-between items-center max-w-6xl mx-auto">
                <Link href="/dashboard" className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-white tracking-tight">PMSense</h1>
                </Link>
                <UserAvatar user={user} supabase={supabase} isLoading={isLoading} />
            </div>
        </header>
    );
}
