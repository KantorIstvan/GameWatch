package com.gamewatch.entity;

/** What an admin did to a target account, recorded in {@link AdminAuditLog}. */
public enum AdminAction {
    BLOCK,
    UNBLOCK,
    PASSWORD_RESET_SENT,
    DELETE_ACCOUNT,
    PROFILE_EDIT,
    PLAYTHROUGH_EDIT
}
