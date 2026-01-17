CREATE TABLE session_history (
    id BIGSERIAL PRIMARY KEY,
    playthrough_id BIGINT NOT NULL REFERENCES playthroughs(id) ON DELETE CASCADE,
    session_number INTEGER NOT NULL,
    duration_seconds BIGINT NOT NULL DEFAULT 0,
    pause_count INTEGER NOT NULL DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(playthrough_id, session_number)
);

CREATE INDEX idx_session_history_playthrough ON session_history(playthrough_id);
