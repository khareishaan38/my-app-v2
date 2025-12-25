import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export function useAutoSave(attemptId: string | null, answers: any) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!attemptId || !answers) return;

    // Clear existing timer
    if (timerRef.current) clearTimeout(timerRef.current);

    // Set a new timer to save after 2 seconds of no typing
    timerRef.current = setTimeout(async () => {
      await supabase
        .from('attempts')
        .update({ answers, updated_at: new Date().toISOString() })
        .eq('id', attemptId);
      console.log("Auto-saved to Supabase");
    }, 2000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [answers, attemptId]);
}

