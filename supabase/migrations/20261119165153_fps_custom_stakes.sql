-- Allow any USD cash entry within the existing $1–$50 limits.
-- Keep all account, self-exclusion, bot, cash-enable and format checks intact.
begin;
set local lock_timeout = '8s';

create or replace function public._fps_terms(p_user uuid,p_stake bigint,p_best_of int) returns void
language plpgsql security definer set search_path = public as $$
declare cfg fps_config; dom money_domain_config; prof profiles;
begin
  if p_stake=0 then raise exception 'PRACTICE_SOLO_ONLY'; end if;
  if exists(select 1 from fps_private.practice_matches where owner_id=p_user and status='FUNDED' and expires_at>clock_timestamp()) then raise exception 'ALREADY_IN_MATCH'; end if;
  select * into strict cfg from fps_config where id=1;
  if not cfg.enabled then raise exception 'FPS_DISABLED'; end if;
  if p_best_of is null or p_best_of not in (5,9,13) then raise exception 'BEST_OF_NOT_ALLOWED'; end if;
  if p_stake is null or not (p_stake=0 or p_stake between 100 and 5000) then
    raise exception 'STAKE_NOT_ALLOWED';
  end if;
  select * into strict prof from profiles where id=p_user;
  if prof.self_excluded_until > clock_timestamp() then raise exception 'SELF_EXCLUDED'; end if;
  if prof.is_bot then raise exception 'BOT_NOT_ALLOWED'; end if;
  if p_stake=0 then
    if not cfg.practice_allowed then raise exception 'PRACTICE_DISABLED'; end if;
  else
    if not cfg.cash_enabled or not public._play_domain_open() then raise exception 'CASH_DISABLED'; end if;
    select * into strict dom from money_domain_config;
    if dom.asset <> 'USD' or dom.account_type <> 'real' then raise exception 'USD_REAL_REQUIRED'; end if;
  end if;
end $$;

commit;
