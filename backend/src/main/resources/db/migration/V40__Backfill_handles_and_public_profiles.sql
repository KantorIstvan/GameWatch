-- Make existing accounts findable.
--
-- V30 added `handle` (nullable) and `profile_visibility` (defaulting to PRIVATE), and
-- nothing ever populated either one: a handle could only be claimed from the settings
-- form, and the visibility default hid every profile that had not been through that same
-- form. Profile search filters on both - it skips rows with no handle, and skips PRIVATE
-- profiles so hidden accounts cannot be enumerated - so it correctly returned nobody, for
-- everybody. Follows, the activity feed and group standings all address people by handle,
-- so they were unreachable for the same reason.
--
-- This backfills a handle for every account that lacks one and opens profiles up. New
-- accounts get both from the application (UserService assigns a handle at sign-up, the
-- entity default is now PUBLIC); this is the one-off catch-up for rows already in the
-- table.

-- Mirrors HandleGenerator: fold the Auth0 nickname (or the local part of the email) down
-- to [a-z0-9_], then disambiguate with an incrementing suffix. The Java side additionally
-- folds accents to ASCII, which is not worth an extension dependency here - an accented
-- nickname simply yields a shorter base, or falls back to 'player', and the result is
-- still a valid handle the user can change.
--
-- The reserved list is a copy of HandleValidator.RESERVED. A generated handle must be
-- something the user could also have typed, so it has to clear the same bar.
DO $$
DECLARE
    reserved TEXT[] := ARRAY[
        'admin', 'administrator', 'api', 'auth', 'login', 'logout', 'signup', 'register',
        'settings', 'help', 'support', 'about', 'terms', 'privacy', 'security', 'legal',
        'gamewatch', 'official', 'staff', 'moderator', 'mod', 'system', 'root', 'null',
        'undefined', 'me', 'you', 'user', 'users', 'profile', 'profiles', 'game', 'games',
        'statistics', 'stats', 'health', 'timeline', 'timers', 'playthrough', 'playthroughs',
        'feed', 'explore', 'search', 'new', 'edit', 'delete', 'static', 'assets', 'public'
    ];
    target RECORD;
    base TEXT;
    candidate TEXT;
    suffix INT;
BEGIN
    FOR target IN SELECT id, username, email FROM users WHERE handle IS NULL ORDER BY id LOOP
        base := regexp_replace(
                    regexp_replace(
                        regexp_replace(
                            lower(split_part(
                                COALESCE(NULLIF(target.username, ''), NULLIF(target.email, ''), ''),
                                '@', 1)),
                            '[^a-z0-9_]+', '_', 'g'),
                        '_{2,}', '_', 'g'),
                    '^_+|_+$', '', 'g');

        -- Leaves room for the suffix inside the 30 character column.
        base := regexp_replace(left(base, 24), '_+$', '', 'g');

        IF base IS NULL OR length(base) = 0 THEN
            base := 'player';
        END IF;

        candidate := base;
        suffix := 0;

        -- Each iteration re-checks against `users`, which the UPDATE below has already
        -- written to for earlier rows, so two accounts sharing a nickname cannot both
        -- land on the same handle.
        WHILE length(candidate) < 3
              OR candidate = ANY (reserved)
              OR EXISTS (SELECT 1 FROM users existing WHERE lower(existing.handle) = candidate) LOOP
            suffix := suffix + 1;
            candidate := regexp_replace(left(base, 30 - length(suffix::TEXT)), '_+$', '', 'g');
            IF length(candidate) = 0 THEN
                candidate := 'player';
            END IF;
            candidate := candidate || suffix::TEXT;
        END LOOP;

        UPDATE users SET handle = candidate WHERE id = target.id;
    END LOOP;
END $$;

-- Indiscriminate on purpose: the column records no difference between a PRIVATE that
-- someone chose and a PRIVATE nobody ever touched, and since the settings form was the
-- only way to change it and claiming a handle was the only reason to open that form, no
-- account reached PRIVATE by decision. Anyone who does want to be hidden can set it back.
--
-- Only identity is opened up by this. `library_visibility` is left exactly as it is, and
-- stays PRIVATE for these rows - which remains consistent with the "library is never more
-- visible than the profile" invariant the settings form enforces.
UPDATE users SET profile_visibility = 'PUBLIC' WHERE profile_visibility = 'PRIVATE';

ALTER TABLE users ALTER COLUMN profile_visibility SET DEFAULT 'PUBLIC';
