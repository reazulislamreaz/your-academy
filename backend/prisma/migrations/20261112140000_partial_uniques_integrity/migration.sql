-- One ACTIVE browsing session per user (AGENTS.md / DEC-009).
-- End older duplicate ACTIVE rows, keeping the newest by last_heartbeat_at / id.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id
      ORDER BY last_heartbeat_at DESC, id DESC
    ) AS rn
  FROM browsing_sessions
  WHERE status = 'ACTIVE'
)
UPDATE browsing_sessions AS bs
SET
  status = 'ENDED',
  ended_at = COALESCE(bs.ended_at, NOW())
FROM ranked
WHERE bs.id = ranked.id
  AND ranked.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS browsing_sessions_one_active_per_user
  ON browsing_sessions (user_id)
  WHERE status = 'ACTIVE';

-- Exactly one correct option per question at the DB layer (service already validates on write).
-- Prefer the lowest sort_order / id when repairing historical duplicates.
WITH ranked_correct AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY question_id
      ORDER BY sort_order ASC, id ASC
    ) AS rn
  FROM question_options
  WHERE is_correct = true
)
UPDATE question_options AS qo
SET is_correct = false
FROM ranked_correct
WHERE qo.id = ranked_correct.id
  AND ranked_correct.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS question_options_one_correct_per_question
  ON question_options (question_id)
  WHERE is_correct = true;
