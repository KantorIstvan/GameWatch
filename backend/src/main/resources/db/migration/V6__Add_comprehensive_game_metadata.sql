ALTER TABLE games ADD COLUMN rating_top INT;
ALTER TABLE games ADD COLUMN ratings_count INT;
ALTER TABLE games ADD COLUMN publishers VARCHAR(500);
ALTER TABLE games ADD COLUMN tags TEXT;

ALTER TABLE games ADD COLUMN name_original VARCHAR(500);
ALTER TABLE games ADD COLUMN slug VARCHAR(255);
ALTER TABLE games ADD COLUMN tba BOOLEAN;
ALTER TABLE games ADD COLUMN updated_at_rawg VARCHAR(100);
ALTER TABLE games ADD COLUMN website VARCHAR(500);
ALTER TABLE games ADD COLUMN metacritic INT;
ALTER TABLE games ADD COLUMN metacritic_url VARCHAR(500);

ALTER TABLE games ADD COLUMN background_image_additional VARCHAR(500);
ALTER TABLE games ADD COLUMN playtime INT;
ALTER TABLE games ADD COLUMN screenshots_count INT;
ALTER TABLE games ADD COLUMN movies_count INT;
ALTER TABLE games ADD COLUMN creators_count INT;
ALTER TABLE games ADD COLUMN achievements_count INT;
ALTER TABLE games ADD COLUMN parent_achievements_count VARCHAR(50);

ALTER TABLE games ADD COLUMN reddit_url VARCHAR(500);
ALTER TABLE games ADD COLUMN reddit_name VARCHAR(255);
ALTER TABLE games ADD COLUMN reddit_description TEXT;
ALTER TABLE games ADD COLUMN reddit_logo VARCHAR(500);
ALTER TABLE games ADD COLUMN reddit_count INT;
ALTER TABLE games ADD COLUMN twitch_count VARCHAR(50);
ALTER TABLE games ADD COLUMN youtube_count VARCHAR(50);

ALTER TABLE games ADD COLUMN added INT;
ALTER TABLE games ADD COLUMN reviews_text_count VARCHAR(50);
ALTER TABLE games ADD COLUMN suggestions_count INT;
ALTER TABLE games ADD COLUMN parents_count INT;
ALTER TABLE games ADD COLUMN additions_count INT;
ALTER TABLE games ADD COLUMN game_series_count INT;

ALTER TABLE games ADD COLUMN esrb_rating VARCHAR(50);

ALTER TABLE games ADD COLUMN alternative_names TEXT;
