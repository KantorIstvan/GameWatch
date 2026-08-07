-- Who did what to whose account, and why it survives the account it was about:
-- target_user_id is nullable (ON DELETE SET NULL) because an admin deleting a user
-- destroys the only other place that fact would be recorded, so details snapshots the
-- target's identity in text at write time rather than depending on the FK still
-- resolving later. admin_user_id is RESTRICT rather than CASCADE - an admin account is
-- never deleted through this same self-service path, so there is no legitimate way for
-- that FK to need cascading, and RESTRICT catches a bug sooner than a silent CASCADE would.

CREATE TABLE admin_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    admin_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    target_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    details VARCHAR(1000),
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_audit_logs_target ON admin_audit_logs (target_user_id, created_at);
CREATE INDEX idx_admin_audit_logs_admin ON admin_audit_logs (admin_user_id, created_at);
