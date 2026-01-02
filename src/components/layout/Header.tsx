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
        <header className="flex justify-between items-center mb-8">
            <Link href="/dashboard" className="flex items-center gap-2">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight italic">PMSense</h1>
            </Link>
            <UserAvatar user={user} supabase={supabase} isLoading={isLoading} />
        </header>
    );
}
