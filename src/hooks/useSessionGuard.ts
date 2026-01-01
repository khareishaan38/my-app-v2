'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

/**
 * Session Guard Hook
 * Blocks rendering until the user session is confirmed.
 * Redirects to the lobby if no session exists.
 */
export function useSessionGuard() {
    const router = useRouter();
    const supabase = useMemo(() => getSupabaseBrowserClient(), []);
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function checkSession() {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) {
                router.replace('/'); // Redirect to lobby
            } else {
                setUser(session.user);
            }
            setIsLoading(false);
        }
        checkSession();
    }, [router, supabase]);

    return { user, isLoading, supabase };
}
