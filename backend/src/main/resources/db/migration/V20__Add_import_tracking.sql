ALTER TABLE playthroughs ADD COLUMN imported_from_playthrough_id BIGINT;
ALTER TABLE playthroughs ADD COLUMN imported_duration_seconds BIGINT DEFAULT 0;

ALTER TABLE playthroughs ADD CONSTRAINT fk_playthroughs_imported_from
    FOREIGN KEY (imported_from_playthrough_id) REFERENCES playthroughs(id) ON DELETE SET NULL;

CREATE INDEX idx_playthroughs_imported_from ON playthroughs(imported_from_playthrough_id);
