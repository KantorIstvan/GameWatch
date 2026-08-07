-- Local mirror of Auth0's blocked flag. Auth0 blocking stops new token issuance but does
-- nothing to a token already issued - the resource server validates JWTs purely by
-- signature/issuer/audience/expiry and never calls back to Auth0. This column is what
-- UserService.getOrCreateUser checks on every request, so a block takes effect on the
-- very next request instead of waiting out the blocked token's remaining life.

ALTER TABLE users ADD COLUMN blocked BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN blocked_at TIMESTAMP NULL;
