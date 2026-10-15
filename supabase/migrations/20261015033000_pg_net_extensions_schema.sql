-- pg_net was registered in schema public (security advisor:
-- extension_in_public). Its objects live in schema net, so only the extension
-- record moves. pg_net is not relocatable, so it is dropped and recreated in
-- schema extensions inside this one transaction; the issue_pg_net_access event
-- trigger re-grants net to the API roles. The only caller,
-- crypto_invoke_cron, calls net.http_post by schema-qualified name and needs no
-- change. Requests still queued when this runs are dropped; the minute
-- dispatcher re-issues them on its next run.

-- prod-only:begin
drop extension if exists pg_net;
create extension pg_net with schema extensions;
-- prod-only:end
