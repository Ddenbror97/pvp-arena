-- Unjoined Slott matches refund after 24 hours, same window as Coinflip.
-- expires_at is set at create, so games already open keep their deadline.
update public.slot_config set waiting_timeout_seconds = 86400;
alter table public.slot_config alter column waiting_timeout_seconds set default 86400;
