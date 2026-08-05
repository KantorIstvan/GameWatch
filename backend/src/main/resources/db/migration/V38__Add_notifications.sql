-- Things that happened to you while you were not looking.
--
-- One table for every kind rather than a table per kind, because the thing being built on
-- top is a single list sorted by time: separate tables would have to be merged and re-sorted
-- on every read, and "how many are unread" would become a query per kind.
--
-- The context columns are real foreign keys rather than a serialised blob, so that a
-- notification cannot outlive the thing it points at. Delete a review and the "someone
-- replied to your review" rows go with it, instead of sitting in the bell forever leading
-- to a page that 404s.
--
-- No message text is stored. The wording belongs to the frontend's translation files, so a
-- notification written today still reads in the language chosen tomorrow - and a copy edit
-- does not have to be backfilled across every row ever written.

CREATE TABLE notifications (
    id BIGSERIAL PRIMARY KEY,

    recipient_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Null for anything the system raised on its own rather than a person doing something.
    actor_id BIGINT REFERENCES users(id) ON DELETE CASCADE,

    type VARCHAR(40) NOT NULL,

    -- Whichever of these the type needs; the rest stay null.
    game_id BIGINT REFERENCES games(id) ON DELETE CASCADE,
    review_id BIGINT REFERENCES game_reviews(id) ON DELETE CASCADE,
    follow_id BIGINT REFERENCES follows(id) ON DELETE CASCADE,

    -- Null means unread. A timestamp rather than a boolean because "when did you see this"
    -- is the question anything later (digests, do-not-disturb) would need, and it costs the
    -- same seven bytes.
    read_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Every read is "this person's notifications, newest first", which is exactly this index.
CREATE INDEX idx_notifications_recipient ON notifications (recipient_id, created_at DESC);

-- The unread count runs on every page load, far more often than the list is opened. Partial,
-- because read rows are the overwhelming majority and none of them can answer this question.
CREATE INDEX idx_notifications_unread ON notifications (recipient_id) WHERE read_at IS NULL;
