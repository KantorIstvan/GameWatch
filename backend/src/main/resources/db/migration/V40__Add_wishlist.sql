-- A wishlist: games a user wants to play but has not added to their library yet, found the
-- same way the library is - by searching the catalog. Carries its own visibility setting
-- rather than reusing library_visibility, because sharing "what I want to play" is a
-- separate choice from sharing "what I have played" - the same reasoning V30 already
-- applied to keep profile_visibility and library_visibility independent of each other.

ALTER TABLE users ADD COLUMN wishlist_visibility VARCHAR(20) NOT NULL DEFAULT 'PRIVATE';

ALTER TABLE users ADD CONSTRAINT chk_users_wishlist_visibility
    CHECK (wishlist_visibility IN ('PRIVATE', 'FOLLOWERS', 'PUBLIC'));

CREATE TABLE wishlist_entries (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_id BIGINT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Wanting a game is a yes/no per user, not something to record twice.
    CONSTRAINT uq_wishlist_entries_user_game UNIQUE (user_id, game_id)
);

-- The wishlist tab reads "this user's entries, newest first" on every profile view.
CREATE INDEX idx_wishlist_entries_user ON wishlist_entries (user_id, added_at DESC);
