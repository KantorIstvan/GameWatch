-- Written reviews, kept separate from the numeric rating.
--
-- Two tables rather than a body column on game_ratings: most people will rate without
-- writing, and a nullable text column on every rating row would make "rated, said nothing"
-- and "wrote nothing yet" the same state. Separating them also lets a review be deleted
-- without discarding the score behind it.

CREATE TABLE game_reviews (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_id BIGINT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    contains_spoilers BOOLEAN NOT NULL DEFAULT FALSE,
    -- The app ships in 40 languages. Without this, a reader gets a review list they mostly
    -- cannot read and no way to narrow it.
    language VARCHAR(10),
    helpful_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_game_reviews_user_game UNIQUE (user_id, game_id)
);

CREATE INDEX idx_game_reviews_game ON game_reviews (game_id, helpful_count DESC);
CREATE INDEX idx_game_reviews_user ON game_reviews (user_id);

CREATE TABLE review_votes (
    id BIGSERIAL PRIMARY KEY,
    review_id BIGINT NOT NULL REFERENCES game_reviews(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- One vote per person per review; voting again withdraws it rather than stacking.
    CONSTRAINT uq_review_votes_review_user UNIQUE (review_id, user_id)
);

CREATE INDEX idx_review_votes_review ON review_votes (review_id);
