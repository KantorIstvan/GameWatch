ALTER TABLE playthroughs ADD COLUMN session_count INTEGER DEFAULT 0;

UPDATE playthroughs SET session_count = 1 WHERE started_at IS NOT NULL OR duration_seconds > 0;

ALTER TABLE playthroughs ADD COLUMN last_played_at TIMESTAMP WITH TIME ZONE;

UPDATE playthroughs 
SET last_played_at = GREATEST(
    COALESCE(stopped_at, '1970-01-01'::timestamp),
    COALESCE(last_autosave_at, '1970-01-01'::timestamp),
    COALESCE(created_at, '1970-01-01'::timestamp)
)
WHERE stopped_at IS NOT NULL OR last_autosave_at IS NOT NULL OR created_at IS NOT NULL;
