import { createBrowserClient } from '@supabase/ssr';

/**
 * Factory function to create a Supabase browser client.
 * Each component creates its own instance, but they all share
 * the underlying browser cookie session for SSR compatibility.
 */
export function getSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

