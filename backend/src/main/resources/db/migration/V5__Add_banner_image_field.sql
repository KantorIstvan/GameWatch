ALTER TABLE games ADD COLUMN banner_image_url VARCHAR(500);

UPDATE games SET banner_image_url = cover_image_url WHERE cover_image_url IS NOT NULL;
