-- Groups, and the time-boxed challenges they run.
--
-- Challenges deliberately cannot be scored on hours played. The health feature exists to
-- discourage long unbroken sessions and late-night play; a leaderboard that ranks people
-- by time spent would pay them to do exactly what the rest of the app is asking them not
-- to. Every available metric counts finishing, breadth or regularity instead, so competing
-- hard means playing more deliberately rather than simply more.

CREATE TABLE groups (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(60) NOT NULL,
    slug VARCHAR(60) NOT NULL,
    description VARCHAR(300),
    owner_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_groups_slug UNIQUE (slug)
);

CREATE INDEX idx_groups_owner ON groups (owner_id);

CREATE TABLE group_members (
    id BIGSERIAL PRIMARY KEY,
    group_id BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_group_members UNIQUE (group_id, user_id)
);

CREATE INDEX idx_group_members_group ON group_members (group_id);
CREATE INDEX idx_group_members_user ON group_members (user_id);

CREATE TABLE group_challenges (
    id BIGSERIAL PRIMARY KEY,
    group_id BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    name VARCHAR(80) NOT NULL,
    metric VARCHAR(30) NOT NULL,
    target INTEGER,
    starts_on DATE NOT NULL,
    ends_on DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Hours are absent from this list on purpose; see the note at the top of the file.
    CONSTRAINT chk_group_challenges_metric
        CHECK (metric IN ('GAMES_FINISHED', 'DISTINCT_GAMES_PLAYED', 'DAYS_PLAYED', 'BACKLOG_CLEARED')),
    CONSTRAINT chk_group_challenges_window CHECK (ends_on >= starts_on)
);

CREATE INDEX idx_group_challenges_group ON group_challenges (group_id);
