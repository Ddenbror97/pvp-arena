-- Partner commission is a report, not a payout.
-- sum(bigint) in Postgres is numeric, so (deposits * bps) / 10000 was a
-- fraction of a cent. The admin partners page formats that number as whole
-- cents and crashed on the fraction.
-- Truncate toward zero, which is what integer division of the same amounts does.

create or replace function public._partner_window(p_partner uuid, p_bps integer, p_from timestamptz, p_to timestamptz)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'deposit_cents', trunc(coalesce(sum(cents), 0))::bigint,
    'deposit_count', trunc(coalesce(sum(deposits), 0))::bigint,
    'depositing_users', count(*) filter (where cents > 0),
    'commission_cents', trunc((coalesce(sum(cents), 0) * p_bps) / 10000)::bigint
  )
  from public._partner_deposits(p_partner, p_from, p_to);
$$;
revoke all on function public._partner_window(uuid, integer, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public._partner_window(uuid, integer, timestamptz, timestamptz) to service_role;
