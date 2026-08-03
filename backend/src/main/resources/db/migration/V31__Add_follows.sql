-- Following, as the relationship that makes Visibility.FOLLOWERS mean something.
--
-- Follows carry a status rather than being a plain edge. A purely asymmetric follow that
-- anyone may create would reduce FOLLOWERS to "anyone who clicked follow", which is
-- PUBLIC with extra steps -- and the whole point of that visibility level is that the
-- owner decides who is inside it.
--
-- So: following a PUBLIC profile is instant, following a FOLLOWERS profile creates a
-- request the owner accepts or rejects, and a PRIVATE profile cannot be followed at all.

CREATE TABLE follows (
    id BIGSERIAL PRIMARY KEY,
    follower_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    followee_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT chk_follows_status CHECK (status IN ('PENDING', 'ACCEPTED')),
    -- One edge per direction per pair; re-following is an update, never a second row.
    CONSTRAINT uq_follows_pair UNIQUE (follower_id, followee_id),
    -- Following yourself is not a relationship, and would corrupt every follower count.
    CONSTRAINT chk_follows_not_self CHECK (follower_id <> followee_id)
);

-- "Who do I follow" and "who follows me" are both read on every profile view, and the
-- accepted-only filter is part of each.
CREATE INDEX idx_follows_follower ON follows (follower_id, status);
CREATE INDEX idx_follows_followee ON follows (followee_id, status);
