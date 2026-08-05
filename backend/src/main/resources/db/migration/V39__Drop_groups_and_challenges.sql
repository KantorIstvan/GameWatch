-- Removes the Groups feature. The tables added in V34 are dropped rather than that
-- migration being edited or deleted: a shipped migration must never change underneath
-- Flyway once its checksum has been recorded.
--
-- Drop order follows the FK chain from V34 (group_challenges -> groups, group_members ->
-- groups), children before the parent.

DROP TABLE IF EXISTS group_challenges;
DROP TABLE IF EXISTS group_members;
DROP TABLE IF EXISTS groups;
