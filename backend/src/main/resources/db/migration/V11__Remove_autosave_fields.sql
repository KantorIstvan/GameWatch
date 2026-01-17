ALTER TABLE playthroughs
DROP COLUMN IF EXISTS last_autosave_at,
DROP COLUMN IF EXISTS last_autosave_elapsed_seconds;
