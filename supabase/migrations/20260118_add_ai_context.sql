-- Add ai_context column to problems table
-- This contains the "hidden reality" that Dan knows but won't reveal directly

ALTER TABLE problems 
ADD COLUMN IF NOT EXISTS ai_context TEXT;

-- Add a comment describing the column
COMMENT ON COLUMN problems.ai_context IS 'Hidden simulation truth and context for AI. Contains root cause, data Dan can reveal when asked, and scope boundaries.';
