import { useEffect, useRef } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Auto-save hook that debounces saving user answers to Supabase.
 * Accepts supabase client as parameter for session consistency.
 */
export function useAutoSave(
  supabase: SupabaseClient,
  attemptId: string | null,
  answers: Record<string, string>
) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!attemptId || !answers || Object.keys(answers).length === 0) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      // Check if the attempt is still valid for saving
      const { data } = await supabase
        .from('attempts')
        .select('status')
        .eq('id', attemptId)
        .single();

      if (data?.status === 'in_progress' || data?.status === 'submitted') {
        await supabase
          .from('attempts')
          .update({ answers, updated_at: new Date().toISOString() })
          .eq('id', attemptId);
        console.log("Auto-save sync successful");
      }
    }, 2000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [answers, attemptId, supabase]);
}


