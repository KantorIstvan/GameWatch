ALTER TABLE playthroughs 
ADD COLUMN platform VARCHAR(100);

CREATE INDEX idx_playthroughs_platform ON playthroughs(platform);
