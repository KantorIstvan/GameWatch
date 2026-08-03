-- Pre-flight for V29__Canonical_game_catalog.sql
--
-- Read-only. Run this against the target database BEFORE applying V29 to see exactly what
-- the migration will merge and delete. Nothing here writes anything.
--
--   psql -h localhost -U <user> -d gamewatch -f docs/V29-canonical-game-catalog-preflight.sql
--
-- V29 folds duplicate `games` rows onto the earliest row sharing an external_id, repoints
-- user_games and playthroughs at it, deletes the losers, and adds a partial unique index.
-- Rows with a NULL external_id are never touched.

\echo '== 1. Scale of the merge =='
SELECT
    (SELECT count(*) FROM games)                                       AS games_total,
    (SELECT count(*) FROM games WHERE external_id IS NULL)             AS games_without_external_id_untouched,
    (SELECT count(DISTINCT external_id) FROM games
      WHERE external_id IS NOT NULL)                                   AS distinct_games_after_merge,
    (SELECT count(*) FROM games WHERE external_id IS NOT NULL)
      - (SELECT count(DISTINCT external_id) FROM games
          WHERE external_id IS NOT NULL)                               AS rows_to_be_deleted;

\echo ''
\echo '== 2. The ten most duplicated games =='
SELECT external_id,
       min(name)      AS name,
       count(*)       AS copies,
       min(id)        AS row_that_survives
FROM games
WHERE external_id IS NOT NULL
GROUP BY external_id
HAVING count(*) > 1
ORDER BY count(*) DESC
LIMIT 10;

\echo ''
\echo '== 3. Library links that will be repointed =='
SELECT count(*) AS user_game_rows_to_repoint
FROM user_games ug
JOIN games g ON g.id = ug.game_id
WHERE g.external_id IS NOT NULL
  AND g.id <> (SELECT min(id) FROM games c WHERE c.external_id = g.external_id);

\echo ''
\echo '== 4. Library links that will be DROPPED as collisions =='
\echo '   (a user holding both a duplicate and the canonical row - the duplicate link goes,'
\echo '    the canonical one already represents that game for them. Expected to be 0.)'
SELECT ug.user_id,
       g.external_id,
       min(g.name) AS name
FROM user_games ug
JOIN games g ON g.id = ug.game_id
WHERE g.external_id IS NOT NULL
  AND g.id <> (SELECT min(id) FROM games c WHERE c.external_id = g.external_id)
  AND EXISTS (
      SELECT 1 FROM user_games kept
      WHERE kept.user_id = ug.user_id
        AND kept.game_id = (SELECT min(id) FROM games c WHERE c.external_id = g.external_id)
  )
GROUP BY ug.user_id, g.external_id;

\echo ''
\echo '== 5. Playthroughs that will be repointed =='
\echo '   (these are preserved, not deleted - the count is here so it can be compared'
\echo '    against the post-migration total, which must be identical)'
SELECT
    (SELECT count(*) FROM playthroughs) AS playthroughs_total_must_not_change,
    (SELECT count(*)
       FROM playthroughs p
       JOIN games g ON g.id = p.game_id
      WHERE g.external_id IS NOT NULL
        AND g.id <> (SELECT min(id) FROM games c WHERE c.external_id = g.external_id)
    ) AS playthrough_rows_to_repoint;

\echo ''
\echo '== 6. Blocker check: anything that would break the new unique index =='
\echo '   (must return 0 rows after the migration; before it, it lists the duplicates)'
SELECT external_id, count(*) AS copies
FROM games
WHERE external_id IS NOT NULL
GROUP BY external_id
HAVING count(*) > 1
ORDER BY copies DESC
LIMIT 5;

\echo ''
\echo '== AFTER applying V29, re-run and confirm: =='
\echo '   - section 1 rows_to_be_deleted    -> 0'
\echo '   - section 5 playthroughs_total    -> unchanged from before'
\echo '   - section 6                       -> no rows'
