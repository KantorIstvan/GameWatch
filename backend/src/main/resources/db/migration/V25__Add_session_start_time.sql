-- Add session_start_time column to track the actual start time of a session
-- This field is preserved across pause/resume cycles unlike started_at
ALTER TABLE playthroughs ADD COLUMN session_start_time TIMESTAMP;

-- Add comment for clarity
COMMENT ON COLUMN playthroughs.session_start_time IS 'Tracks the actual start time of the current session, preserved across pause/resume cycles';
