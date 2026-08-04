-- Drop everything that was only ever RAWG plumbing, now that game metadata comes from IGDB.
--
-- external_id held a RAWG numeric ID; IGDB's ID space is unrelated, so an existing value
-- would silently point at the wrong (or no) IGDB game. Existing games, playthroughs, and
-- history are otherwise untouched - only the catalogue link is dropped.
UPDATE games SET external_id = NULL;

-- playtime held RAWG's average playtime in *hours*; it's kept (renamed below) since
-- GameCommunityService still surfaces it as a "typical completion time" figure, but its
-- IGDB replacement (Game Time to Beat, already in seconds) is a different source and unit,
-- so old values are cleared rather than silently reinterpreted as seconds.
UPDATE games SET playtime = NULL;
ALTER TABLE games RENAME COLUMN playtime TO average_completion_seconds;

ALTER TABLE games
    DROP COLUMN rating_top,
    DROP COLUMN tba,
    DROP COLUMN updated_at_rawg,
    DROP COLUMN metacritic,
    DROP COLUMN metacritic_url,
    DROP COLUMN background_image_additional,
    DROP COLUMN screenshots_count,
    DROP COLUMN movies_count,
    DROP COLUMN creators_count,
    DROP COLUMN achievements_count,
    DROP COLUMN parent_achievements_count,
    DROP COLUMN reddit_url,
    DROP COLUMN reddit_name,
    DROP COLUMN reddit_description,
    DROP COLUMN reddit_logo,
    DROP COLUMN reddit_count,
    DROP COLUMN twitch_count,
    DROP COLUMN youtube_count,
    DROP COLUMN added,
    DROP COLUMN reviews_text_count,
    DROP COLUMN suggestions_count,
    DROP COLUMN parents_count,
    DROP COLUMN additions_count,
    DROP COLUMN game_series_count,
    DROP COLUMN name_original;
