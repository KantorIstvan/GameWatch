ALTER TABLE playthroughs
ADD COLUMN session_start_duration_seconds BIGINT NOT NULL DEFAULT 0;
