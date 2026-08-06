-- Replies to reviews.
--
-- Flat by design: a reply belongs to a review, never to another reply. A tree would need a
-- depth cap, collapse rules and recursive reads, and the thing people actually want here is
-- to answer the person who wrote the review - not to hold a nested argument three levels
-- down where nobody scrolls.
--
-- No helpful/vote count either. Votes exist on reviews to decide which one is worth reading
-- first out of hundreds; a handful of replies under one review are read in the order they
-- were written, so ordering them by popularity would only reward the loudest.

CREATE TABLE review_replies (
    id BIGSERIAL PRIMARY KEY,
    review_id BIGINT NOT NULL REFERENCES game_reviews(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Every read is "the replies under this review, oldest first", which is exactly this index.
CREATE INDEX idx_review_replies_review ON review_replies (review_id, created_at);
-- Supports the per-author rate limit, and the cascade when an account is deleted.
CREATE INDEX idx_review_replies_user ON review_replies (user_id);
