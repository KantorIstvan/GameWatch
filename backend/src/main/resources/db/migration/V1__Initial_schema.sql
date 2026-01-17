CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    auth0_user_id VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL,
    username VARCHAR(100),
    profile_picture_url VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_auth0_user_id ON users(auth0_user_id);

CREATE TABLE games (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    cover_image_url VARCHAR(500),
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE playthroughs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_id BIGINT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    playthrough_type VARCHAR(50) NOT NULL DEFAULT 'story',
    started_at TIMESTAMP,
    stopped_at TIMESTAMP,
    duration_seconds BIGINT DEFAULT 0,
    is_active BOOLEAN DEFAULT FALSE,
    is_completed BOOLEAN DEFAULT FALSE,
    last_autosave_at TIMESTAMP,
    last_autosave_elapsed_seconds BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_playthroughs_user_id ON playthroughs(user_id);
CREATE INDEX idx_playthroughs_game_id ON playthroughs(game_id);
CREATE INDEX idx_playthroughs_is_active ON playthroughs(is_active);

CREATE TABLE user_games (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_id BIGINT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    total_playtime_seconds BIGINT DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, game_id)
);

CREATE INDEX idx_user_games_user_id ON user_games(user_id);
CREATE INDEX idx_user_games_game_id ON user_games(game_id);
