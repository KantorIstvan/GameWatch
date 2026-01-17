ALTER TABLE playthroughs ADD COLUMN IF NOT EXISTS dropped_at TIMESTAMP;
ALTER TABLE playthroughs ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMP;
ALTER TABLE playthroughs ADD COLUMN IF NOT EXISTS last_played_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_playthroughs_dropped_at ON playthroughs(dropped_at);
CREATE INDEX IF NOT EXISTS idx_playthroughs_last_played_at ON playthroughs(last_played_at);
