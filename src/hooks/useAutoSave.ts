import { useEffect, useRef } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Auto-save hook that debounces saving user answers and timer state to Supabase.
 * Uses a ref for timeRemaining to avoid resetting debounce on every tick.
 */
export function useAutoSave(
  supabase: SupabaseClient,
  attemptId: string | null,
  answers: Record<string, string>,
  timeRemaining: number | null
) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const timeRemainingRef = useRef(timeRemaining);

  // Keep the ref updated with latest value without triggering effect
  useEffect(() => {
    timeRemainingRef.current = timeRemaining;
  }, [timeRemaining]);

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
        const updateData: Record<string, unknown> = {
          answers,
          updated_at: new Date().toISOString()
        };

        // Include current time_remaining from ref
        if (timeRemainingRef.current !== null) {
          updateData.time_remaining = timeRemainingRef.current;
        }

        await supabase
          .from('attempts')
          .update(updateData)
          .eq('id', attemptId);
        console.log("Auto-save sync successful (answers + timer)");
      }
    }, 2000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [answers, attemptId, supabase]); // timeRemaining NOT in deps - uses ref instead
}
