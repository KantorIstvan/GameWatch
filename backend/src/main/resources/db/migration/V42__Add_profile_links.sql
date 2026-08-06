-- Social/website links a user adds to their public profile. Kept as their own table
-- rather than a single column on users: a profile can carry several links (X, GitHub, a
-- personal site...) and the set needs to grow, shrink and reorder freely, which a single
-- varchar column cannot do.
--
-- "sort_order" rather than "position": POSITION is a SQL function name, and column names
-- that double as keywords are worth avoiding even where the dialect tolerates them.

CREATE TABLE profile_links (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    url VARCHAR(500) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0
);

-- The profile page reads "this user's links, in display order" on every profile view.
CREATE INDEX idx_profile_links_user ON profile_links (user_id, sort_order);
