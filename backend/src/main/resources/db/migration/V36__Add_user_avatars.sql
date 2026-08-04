-- Uploaded profile pictures.
--
-- A separate table rather than a bytea column on users: users is read on essentially every
-- request and is second-level cached, and dragging a megabyte of image bytes into every one
-- of those reads to render a handle would be an odd price to pay for a picture.
--
-- The image is addressed by an unguessable key rather than by user id. An <img> tag cannot
-- send a bearer token, so the endpoint serving these has to be reachable without one; a
-- random key means that being reachable is not the same as being enumerable, and someone
-- who was never shown a private profile has nothing to guess. Rotating the key on every
-- upload doubles as cache busting, which is why the serving endpoint can mark its responses
-- immutable.

CREATE TABLE user_avatars (
    id BIGSERIAL PRIMARY KEY,
    -- One picture per account; a new upload replaces the row rather than adding to it.
    user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    avatar_key VARCHAR(36) NOT NULL UNIQUE,
    content_type VARCHAR(50) NOT NULL,
    image_data BYTEA NOT NULL,
    byte_size INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
