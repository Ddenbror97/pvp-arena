-- The integration-test schema was left on production: 289 functions and 107
-- empty tables. Dashboard function listing calls pg_get_functiondef on every
-- non-system function, so this schema was part of that refresh. Nothing in
-- public, cron, or another schema references it.
--
-- Tests build pvp_test themselves after migrations. This drop must not survive
-- into that copy.

-- prod-only:begin
drop schema if exists pvp_test cascade;
-- prod-only:end
