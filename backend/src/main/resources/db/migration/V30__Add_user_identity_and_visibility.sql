-- Identity and visibility, so a user can be addressed and found by something other than
-- their Auth0 subject.
--
-- `username` already exists but is copied from the Auth0 `nickname` claim: not chosen by
-- the user, not unique, and not editable. It stays as-is for existing display paths; the
-- handle is the new addressable identity.

ALTER TABLE users ADD COLUMN handle VARCHAR(30);
ALTER TABLE users ADD COLUMN display_name VARCHAR(50);
ALTER TABLE users ADD COLUMN bio VARCHAR(300);

-- Case-insensitive, so @Kantor and @kantor cannot both exist. Partial, because a handle
-- is only claimed when the user chooses one - every existing account starts without.
CREATE UNIQUE INDEX uq_users_handle_lower
    ON users (LOWER(handle))
    WHERE handle IS NOT NULL;

-- PRIVATE by default, for existing rows and new ones alike. Sharing a play history is
-- opt-in; nobody's library becomes visible because a feature shipped.
ALTER TABLE users ADD COLUMN profile_visibility VARCHAR(20) NOT NULL DEFAULT 'PRIVATE';
ALTER TABLE users ADD COLUMN library_visibility VARCHAR(20) NOT NULL DEFAULT 'PRIVATE';

ALTER TABLE users ADD CONSTRAINT chk_users_profile_visibility
    CHECK (profile_visibility IN ('PRIVATE', 'FOLLOWERS', 'PUBLIC'));
ALTER TABLE users ADD CONSTRAINT chk_users_library_visibility
    CHECK (library_visibility IN ('PRIVATE', 'FOLLOWERS', 'PUBLIC'));

-- There is deliberately no health_visibility column. Mood ratings, hours played and
-- late-night minutes are health data about a person; the feature has no sharing mode, so
-- there is no setting to get wrong and no column to leak through.
