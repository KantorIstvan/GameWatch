ALTER TABLE playthroughs ADD COLUMN is_dropped BOOLEAN DEFAULT FALSE;

CREATE INDEX idx_playthroughs_is_dropped ON playthroughs(is_dropped);
