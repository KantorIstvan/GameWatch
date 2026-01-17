-- Add age field to users table
ALTER TABLE users ADD COLUMN age INTEGER;

-- Create health_settings table
CREATE TABLE health_settings (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    
    -- Notification settings
    notifications_enabled BOOLEAN DEFAULT FALSE,
    sounds_enabled BOOLEAN DEFAULT FALSE,
    hydration_reminder_enabled BOOLEAN DEFAULT FALSE,
    hydration_interval_minutes INTEGER DEFAULT 30,
    stand_reminder_enabled BOOLEAN DEFAULT FALSE,
    stand_interval_minutes INTEGER DEFAULT 60,
    break_reminder_enabled BOOLEAN DEFAULT FALSE,
    break_interval_minutes INTEGER DEFAULT 50,
    break_duration_minutes INTEGER DEFAULT 10,
    
    -- Goal settings
    goals_enabled BOOLEAN DEFAULT FALSE,
    max_hours_per_day_enabled BOOLEAN DEFAULT FALSE,
    max_hours_per_day DOUBLE PRECISION,
    max_sessions_per_day_enabled BOOLEAN DEFAULT FALSE,
    max_sessions_per_day INTEGER,
    max_hours_per_week_enabled BOOLEAN DEFAULT FALSE,
    max_hours_per_week DOUBLE PRECISION,
    goal_notifications_enabled BOOLEAN DEFAULT FALSE,
    
    -- Mood prompt settings
    mood_prompt_enabled BOOLEAN DEFAULT TRUE,
    mood_prompt_required BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_health_settings_user ON health_settings(user_id);

-- Create mood_entries table
CREATE TABLE mood_entries (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_history_id BIGINT REFERENCES session_history(id) ON DELETE SET NULL,
    mood_rating INTEGER NOT NULL CHECK (mood_rating >= 1 AND mood_rating <= 5),
    note VARCHAR(500),
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_mood_entries_user ON mood_entries(user_id);
CREATE INDEX idx_mood_entries_recorded_at ON mood_entries(recorded_at);
CREATE INDEX idx_mood_entries_session ON mood_entries(session_history_id);

-- Create daily_health_metrics table
CREATE TABLE daily_health_metrics (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    metric_date DATE NOT NULL,
    health_score INTEGER CHECK (health_score >= 0 AND health_score <= 100),
    total_hours DOUBLE PRECISION,
    session_count INTEGER DEFAULT 0,
    average_mood DOUBLE PRECISION CHECK (average_mood >= 1 AND average_mood <= 5),
    late_night_minutes BIGINT DEFAULT 0,
    break_compliance_ratio DOUBLE PRECISION CHECK (break_compliance_ratio >= 0 AND break_compliance_ratio <= 1),
    sessions_with_breaks INTEGER DEFAULT 0,
    morning_sessions INTEGER DEFAULT 0,
    afternoon_sessions INTEGER DEFAULT 0,
    evening_sessions INTEGER DEFAULT 0,
    night_sessions INTEGER DEFAULT 0,
    late_night_sessions INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, metric_date)
);

CREATE INDEX idx_daily_health_metrics_user ON daily_health_metrics(user_id);
CREATE INDEX idx_daily_health_metrics_date ON daily_health_metrics(metric_date);
CREATE INDEX idx_daily_health_metrics_user_date ON daily_health_metrics(user_id, metric_date);
