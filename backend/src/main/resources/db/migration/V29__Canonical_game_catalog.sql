-- Turn `games` into a shared catalogue keyed on the RAWG id.
--
-- Adding a game always inserted a brand new games row, so every user held their own
-- private copy of every game: two people playing Elden Ring had two unrelated rows with
-- no way to tell they were the same game. Nothing that aggregates across users -- a
-- rating, an average completion time, "friends who played this" -- can be built on that.
--
-- This folds each set of duplicates onto the earliest row for that external_id and
-- repoints everything at it. Rows with no external_id are left alone: they are manually
-- added games with no shared key to merge on, and one row per user is correct for them.
--
-- The merge keeps the earliest row, so the oldest metadata snapshot wins. That is
-- arbitrary but deterministic, and metadata is refreshed from RAWG anyway.

CREATE TEMP TABLE game_merge_map ON COMMIT DROP AS
SELECT duplicates.id AS duplicate_id,
       canonical.canonical_id
FROM games duplicates
JOIN (
    SELECT external_id, MIN(id) AS canonical_id
    FROM games
    WHERE external_id IS NOT NULL
    GROUP BY external_id
) canonical ON canonical.external_id = duplicates.external_id
WHERE duplicates.external_id IS NOT NULL
  AND duplicates.id <> canonical.canonical_id;

-- A user holding both a duplicate and the canonical row would break user_games'
-- UNIQUE(user_id, game_id) the moment the duplicate is repointed. Drop the duplicate
-- link first; the canonical one already represents the same game for that user.
DELETE FROM user_games ug
USING game_merge_map m
WHERE ug.game_id = m.duplicate_id
  AND EXISTS (
      SELECT 1
      FROM user_games kept
      WHERE kept.user_id = ug.user_id
        AND kept.game_id = m.canonical_id
  );

UPDATE user_games ug
SET game_id = m.canonical_id
FROM game_merge_map m
WHERE ug.game_id = m.duplicate_id;

-- Playthroughs carry no uniqueness constraint on game_id, so they can be repointed
-- wholesale. This is what preserves every user's history through the merge.
UPDATE playthroughs p
SET game_id = m.canonical_id
FROM game_merge_map m
WHERE p.game_id = m.duplicate_id;

-- Safe only because both referencing tables have been repointed above; anything still
-- pointing here would be caught by the foreign keys rather than silently cascaded.
DELETE FROM games g
USING game_merge_map m
WHERE g.id = m.duplicate_id;

-- Stops the duplicates coming straight back. Partial, because rows without an
-- external_id have no shared identity and are expected to repeat.
CREATE UNIQUE INDEX uq_games_external_id
    ON games (external_id)
    WHERE external_id IS NOT NULL;
