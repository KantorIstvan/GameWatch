-- Per-user game ratings, and the aggregate score derived from them.
--
-- Ratings are 1-10 integers. Five stars produces too many ties to rank with; a 0-100 scale
-- invites a precision nobody actually feels. Ten is what people are used to from IMDb and
-- Metacritic and can hold an opinion at.

CREATE TABLE game_ratings (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_id BIGINT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 10),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- One opinion per person per game. Changing your mind updates the row.
    CONSTRAINT uq_game_ratings_user_game UNIQUE (user_id, game_id)
);

CREATE INDEX idx_game_ratings_game ON game_ratings (game_id);
CREATE INDEX idx_game_ratings_user ON game_ratings (user_id);

-- Denormalised onto the game so a listing does not aggregate every rating row per card.
-- Recomputed on every write; these are a cache of game_ratings, never the source.
ALTER TABLE games ADD COLUMN rating_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE games ADD COLUMN rating_sum BIGINT NOT NULL DEFAULT 0;

-- The shrunk score a game is actually ranked by. Null until anyone rates it, so that
-- "unrated" stays distinguishable from "rated badly".
ALTER TABLE games ADD COLUMN bayesian_score DOUBLE PRECISION;

CREATE INDEX idx_games_bayesian_score ON games (bayesian_score DESC NULLS LAST);
