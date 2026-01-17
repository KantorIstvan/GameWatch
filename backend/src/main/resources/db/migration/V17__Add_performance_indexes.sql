CREATE INDEX IF NOT EXISTS idx_user_games_user_game ON user_games(user_id, game_id);

CREATE INDEX IF NOT EXISTS idx_playthroughs_user_game ON playthroughs(user_id, game_id);

CREATE INDEX IF NOT EXISTS idx_playthroughs_last_played_at ON playthroughs(last_played_at);

CREATE INDEX IF NOT EXISTS idx_playthroughs_is_completed ON playthroughs(is_completed);

CREATE INDEX IF NOT EXISTS idx_session_history_playthrough_session ON session_history(playthrough_id, session_number);

CREATE INDEX IF NOT EXISTS idx_session_history_started_at ON session_history(started_at);
