-- Streamer boards count only players attributed to that partner.
-- Friend referrals stay on public.referrals and are not written here.
-- Partner attribution is public.partner_referrals, one row per player.
-- New rows come from partner_acquisition_codes. Historical promo rows stay source 'promo'.
-- Existing campaigns stay audience 'open'. Campaigns saved after this are 'attributed'.

create table public.partner_acquisition_codes (
  id uuid primary key default gen_random_uuid(),
  partner_user_id uuid not null unique references public.partners (user_id),
  code text not null unique check (code ~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{10}$'),
  created_at timestamptz not null default clock_timestamp()
);
create index partner_acquisition_codes_code_idx on public.partner_acquisition_codes (code);
alter table public.partner_acquisition_codes enable row level security;
revoke all on public.partner_acquisition_codes from public, anon, authenticated;
grant all on public.partner_acquisition_codes to service_role;
create trigger no_mutation before update or delete on public.partner_acquisition_codes
  for each row execute function public._immutable();
create trigger no_truncate before truncate on public.partner_acquisition_codes
  for each statement execute function public._no_truncate();

create or replace function public._partner_ensure_acquisition_code()
returns trigger language plpgsql security definer set search_path = public as $$
declare tries int := 0; new_code text;
begin
  if tg_op = 'UPDATE' and (not new.active or old.active) then return new; end if;
  if not new.active then return new; end if;
  if exists (select 1 from partner_acquisition_codes where partner_user_id = new.user_id) then
    return new;
  end if;
  loop
    tries := tries + 1;
    new_code := public._referral_code();
    begin
      insert into partner_acquisition_codes (partner_user_id, code) values (new.user_id, new_code);
      exit;
    exception when unique_violation then
      if exists (select 1 from partner_acquisition_codes where partner_user_id = new.user_id) then
        exit;
      end if;
      if tries >= 8 then raise exception 'CODE_EXHAUSTED'; end if;
    end;
  end loop;
  return new;
end $$;
revoke all on function public._partner_ensure_acquisition_code() from public, anon, authenticated;

create trigger partner_acquisition_code
  after insert or update of active on public.partners
  for each row execute function public._partner_ensure_acquisition_code();

do $$
declare p uuid; tries int; new_code text;
begin
  for p in
    select user_id from public.partners s
    where not exists (
      select 1 from public.partner_acquisition_codes c where c.partner_user_id = s.user_id
    )
  loop
    tries := 0;
    loop
      tries := tries + 1;
      new_code := public._referral_code();
      begin
        insert into public.partner_acquisition_codes (partner_user_id, code) values (p, new_code);
        exit;
      exception when unique_violation then
        if tries >= 8 then raise exception 'CODE_EXHAUSTED'; end if;
      end;
    end loop;
  end loop;
end $$;

alter table public.partner_referrals alter column promo_code_id drop not null;
alter table public.partner_referrals alter column promo_claim_id drop not null;
alter table public.partner_referrals
  add column source text not null default 'promo',
  add column acquisition_code_id uuid references public.partner_acquisition_codes (id);
alter table public.partner_referrals add constraint partner_referrals_source_check check (
  (source = 'promo' and promo_code_id is not null and promo_claim_id is not null and acquisition_code_id is null)
  or (source = 'acquisition' and promo_code_id is null and promo_claim_id is null and acquisition_code_id is not null)
);

alter table public.leaderboard_campaigns
  add column audience text not null default 'open' check (audience in ('open', 'attributed'));

create or replace function public._lb_campaign_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'DELETE' then raise exception 'IMMUTABLE_RECORD leaderboard_campaigns'; end if;
  if old.rules_frozen_at is not null then
    if new.partner_user_id is distinct from old.partner_user_id
       or new.template_id is distinct from old.template_id
       or new.template_version is distinct from old.template_version
       or new.name is distinct from old.name
       or new.description is distinct from old.description
       or new.visibility is distinct from old.visibility
       or new.timezone is distinct from old.timezone
       or new.starts_at is distinct from old.starts_at
       or new.ends_at is distinct from old.ends_at
       or new.min_wager_cents is distinct from old.min_wager_cents
       or new.games is distinct from old.games
       or new.prize_pool_cents is distinct from old.prize_pool_cents
       or new.audience is distinct from old.audience
       or new.config_snapshot is distinct from old.config_snapshot
       or new.rules_frozen_at is distinct from old.rules_frozen_at
       or new.approved_by is distinct from old.approved_by
       or new.approved_at is distinct from old.approved_at
    then raise exception 'CAMPAIGN_FROZEN'; end if;
  end if;
  if old.awards_created and not new.awards_created then raise exception 'AWARDS_FROZEN'; end if;
  if old.status = 'completed' and new.status is distinct from old.status then raise exception 'CAMPAIGN_FINAL'; end if;
  return new;
end $$;

create or replace function public.partner_acquisition_peek(p_code text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare link public.partner_acquisition_codes; name text; active boolean;
begin
  if p_code is null or p_code !~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{10}$' then
    return jsonb_build_object('ok', false);
  end if;
  select * into link from partner_acquisition_codes where code = p_code;
  if link.id is null then return jsonb_build_object('ok', false); end if;
  select pr.username, pa.active into name, active
  from partners pa
  join profiles pr on pr.id = pa.user_id
  where pa.user_id = link.partner_user_id;
  if not coalesce(active, false) then return jsonb_build_object('ok', false); end if;
  return jsonb_build_object('ok', true, 'username', name);
end $$;
revoke all on function public.partner_acquisition_peek(text) from public;
grant execute on function public.partner_acquisition_peek(text) to anon, authenticated, service_role;

-- Reads the acquisition code only. Does not write public.referrals or pay a friend reward.
create or replace function public.partner_acquisition_claim(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  created timestamptz;
  link public.partner_acquisition_codes;
  inserted uuid;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  perform public._assert_live_session();
  if p_code is null or p_code !~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{10}$' then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;
  if exists (select 1 from partner_referrals where user_id = uid) then
    return jsonb_build_object('ok', true, 'attributed', false, 'reason', 'kept');
  end if;
  select created_at into created from profiles where id = uid;
  if created is null then return jsonb_build_object('ok', false, 'reason', 'no_profile'); end if;
  -- Same credited rows _partner_deposits counts. A pending invoice is not a deposit.
  if created < clock_timestamp() - interval '30 minutes'
     or exists (
       select 1 from crypto_deposits d
       join ledger_transactions lt on lt.id = d.ledger_tx_id and lt.account_type = 'real'
       where d.user_id = uid and d.status = 'CREDITED'
     )
     or exists (
       select 1 from btcpay_invoices b
       where b.user_id = uid and b.status = 'CREDITED'
     )
     or exists (
       select 1 from nowpayments_invoices n
       where n.user_id = uid and n.status = 'CREDITED' and n.ledger_tx_id is not null
     )
     or exists (select 1 from jackpot_entries where user_id = uid)
     or exists (select 1 from coinflip_entries where user_id = uid)
     or exists (select 1 from roulette_bets where user_id = uid)
     or exists (select 1 from slot_entries where user_id = uid) then
    perform public._audit(uid, 'partner_acquisition_rejected', null, jsonb_build_object('reason', 'existing_user'));
    return jsonb_build_object('ok', false, 'reason', 'existing_user');
  end if;
  select * into link from partner_acquisition_codes where code = p_code;
  if link.id is null or not public._is_active_partner(link.partner_user_id) then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;
  if link.partner_user_id = uid then
    return jsonb_build_object('ok', false, 'reason', 'self');
  end if;
  insert into partner_referrals (user_id, partner_user_id, source, acquisition_code_id)
  values (uid, link.partner_user_id, 'acquisition', link.id)
  on conflict (user_id) do nothing
  returning user_id into inserted;
  if inserted is null then
    return jsonb_build_object('ok', true, 'attributed', false, 'reason', 'kept');
  end if;
  perform public._audit(uid, 'partner_referral_attributed', null,
    jsonb_build_object('partner', link.partner_user_id, 'code', link.code, 'source', 'acquisition'));
  return jsonb_build_object('ok', true, 'attributed', true);
end $$;
revoke all on function public.partner_acquisition_claim(text) from public, anon;
grant execute on function public.partner_acquisition_claim(text) to authenticated, service_role;

create or replace function public.partner_acquisition_mine()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare uid uuid := public._lb_require_partner(); link text;
begin
  select code into link from partner_acquisition_codes where partner_user_id = uid;
  if link is null then return jsonb_build_object('ok', false); end if;
  return jsonb_build_object('ok', true, 'code', link);
end $$;
revoke all on function public.partner_acquisition_mine() from public, anon;
grant execute on function public.partner_acquisition_mine() to authenticated, service_role;

create or replace function public._lb_sync(p_campaign uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  c public.leaderboard_campaigns;
  n integer;
  caught boolean := true;
begin
  select * into c from leaderboard_campaigns where id = p_campaign for update;
  if not found or c.status not in ('active', 'closing') then return true; end if;

  insert into leaderboard_wager_events (campaign_id, player_id, source_game_type, source_event_id, source_game_id, qualifying_cents, event_at)
  select c.id, e.user_id, 'jackpot', e.id, e.game_id, e.amount, e.created_at
  from jackpot_entries e
  join jackpot_games g on g.id = e.game_id
  where 'jackpot' = any (c.games)
    and g.status = 'COMPLETED' and g.account_type = 'real'
    and e.created_at >= c.starts_at and e.created_at < c.ends_at
    and e.amount >= c.min_wager_cents and e.user_id <> c.partner_user_id
    and (
      c.audience is distinct from 'attributed'
      or exists (
        select 1 from partner_referrals r
        where r.user_id = e.user_id and r.partner_user_id = c.partner_user_id
      )
    )
    and not exists (
      select 1 from leaderboard_wager_events w
      where w.campaign_id = c.id and w.source_game_type = 'jackpot' and w.source_event_id = e.id
    )
  order by e.created_at
  limit 2000;
  get diagnostics n = row_count;
  if n >= 2000 then caught := false; end if;

  insert into leaderboard_wager_events (campaign_id, player_id, source_game_type, source_event_id, source_game_id, qualifying_cents, event_at)
  select c.id, e.user_id, 'coinflip', e.id, e.game_id, e.amount, e.created_at
  from coinflip_entries e
  join coinflip_games g on g.id = e.game_id
  where 'coinflip' = any (c.games)
    and g.status = 'COMPLETED' and g.account_type = 'real'
    and e.created_at >= c.starts_at and e.created_at < c.ends_at
    and e.amount >= c.min_wager_cents and e.user_id <> c.partner_user_id
    and (
      c.audience is distinct from 'attributed'
      or exists (
        select 1 from partner_referrals r
        where r.user_id = e.user_id and r.partner_user_id = c.partner_user_id
      )
    )
    and not exists (
      select 1 from leaderboard_wager_events w
      where w.campaign_id = c.id and w.source_game_type = 'coinflip' and w.source_event_id = e.id
    )
  order by e.created_at
  limit 2000;
  get diagnostics n = row_count;
  if n >= 2000 then caught := false; end if;

  insert into leaderboard_wager_events (campaign_id, player_id, source_game_type, source_event_id, source_game_id, qualifying_cents, event_at)
  select c.id, b.user_id, 'roulette', b.id, b.game_id, b.amount, b.created_at
  from roulette_bets b
  join roulette_games g on g.id = b.game_id
  where 'roulette' = any (c.games)
    and g.status = 'COMPLETED' and g.account_type = 'real'
    and b.status in ('WON', 'LOST')
    and b.created_at >= c.starts_at and b.created_at < c.ends_at
    and b.amount >= c.min_wager_cents and b.user_id <> c.partner_user_id
    and (
      c.audience is distinct from 'attributed'
      or exists (
        select 1 from partner_referrals r
        where r.user_id = b.user_id and r.partner_user_id = c.partner_user_id
      )
    )
    and not exists (
      select 1 from leaderboard_wager_events w
      where w.campaign_id = c.id and w.source_game_type = 'roulette' and w.source_event_id = b.id
    )
  order by b.created_at
  limit 2000;
  get diagnostics n = row_count;
  if n >= 2000 then caught := false; end if;

  insert into leaderboard_wager_events (campaign_id, player_id, source_game_type, source_event_id, source_game_id, qualifying_cents, event_at)
  select c.id, e.user_id, 'slott', e.id, e.game_id, e.amount, e.created_at
  from slot_entries e
  join slot_games g on g.id = e.game_id
  where 'slott' = any (c.games)
    and g.status = 'COMPLETED' and g.account_type = 'real'
    and e.created_at >= c.starts_at and e.created_at < c.ends_at
    and e.amount >= c.min_wager_cents and e.user_id <> c.partner_user_id
    and (
      c.audience is distinct from 'attributed'
      or exists (
        select 1 from partner_referrals r
        where r.user_id = e.user_id and r.partner_user_id = c.partner_user_id
      )
    )
    and not exists (
      select 1 from leaderboard_wager_events w
      where w.campaign_id = c.id and w.source_game_type = 'slott' and w.source_event_id = e.id
    )
  order by e.created_at
  limit 2000;
  get diagnostics n = row_count;
  if n >= 2000 then caught := false; end if;

  update leaderboard_wager_events w set voided = true
  where w.campaign_id = c.id and not w.voided and c.audience = 'attributed'
    and not exists (
      select 1 from partner_referrals r
      where r.user_id = w.player_id and r.partner_user_id = c.partner_user_id
    );

  update leaderboard_wager_events w set voided = true
  where w.campaign_id = c.id and not w.voided and (
    (w.source_game_type = 'jackpot' and not exists (
      select 1 from jackpot_entries e join jackpot_games g on g.id = e.game_id
      where e.id = w.source_event_id and g.status = 'COMPLETED' and g.account_type = 'real'))
    or (w.source_game_type = 'coinflip' and not exists (
      select 1 from coinflip_entries e join coinflip_games g on g.id = e.game_id
      where e.id = w.source_event_id and g.status = 'COMPLETED' and g.account_type = 'real'))
    or (w.source_game_type = 'roulette' and not exists (
      select 1 from roulette_bets b join roulette_games g on g.id = b.game_id
      where b.id = w.source_event_id and g.status = 'COMPLETED' and g.account_type = 'real' and b.status in ('WON', 'LOST')))
    or (w.source_game_type = 'slott' and not exists (
      select 1 from slot_entries e join slot_games g on g.id = e.game_id
      where e.id = w.source_event_id and g.status = 'COMPLETED' and g.account_type = 'real'))
  );

  insert into leaderboard_entries (campaign_id, player_id, qualifying_cents, last_event_at)
  select w.campaign_id, w.player_id, sum(w.qualifying_cents), max(w.event_at)
  from leaderboard_wager_events w
  where w.campaign_id = c.id and not w.voided
  group by w.campaign_id, w.player_id
  on conflict (campaign_id, player_id) do update
    set qualifying_cents = excluded.qualifying_cents,
        last_event_at = excluded.last_event_at,
        updated_at = clock_timestamp();

  update leaderboard_entries e set qualifying_cents = 0, rank = null, updated_at = clock_timestamp()
  where e.campaign_id = c.id and not exists (
    select 1 from leaderboard_wager_events w
    where w.campaign_id = e.campaign_id and w.player_id = e.player_id and not w.voided
  );

  with ranked as (
    select player_id, row_number() over (
      order by qualifying_cents desc, last_event_at asc, player_id asc
    ) as n
    from leaderboard_entries
    where campaign_id = c.id and qualifying_cents > 0
  )
  update leaderboard_entries e
    set rank = ranked.n, updated_at = clock_timestamp()
  from ranked
  where e.campaign_id = c.id and e.player_id = ranked.player_id and e.rank is distinct from ranked.n;

  update leaderboard_campaigns set ranked_at = clock_timestamp(), updated_at = clock_timestamp() where id = c.id;
  return caught;
end $$;

create or replace function public._lb_inflight(p_campaign uuid) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare c public.leaderboard_campaigns;
begin
  select * into c from leaderboard_campaigns where id = p_campaign;
  if not found then return false; end if;
  if 'jackpot' = any (c.games) and exists (
    select 1 from jackpot_entries e join jackpot_games g on g.id = e.game_id
    where g.account_type = 'real' and g.status not in ('COMPLETED', 'CANCELLED')
      and e.created_at >= c.starts_at and e.created_at < c.ends_at
      and e.amount >= c.min_wager_cents and e.user_id <> c.partner_user_id
      and (
        c.audience is distinct from 'attributed'
        or exists (
          select 1 from partner_referrals r
          where r.user_id = e.user_id and r.partner_user_id = c.partner_user_id
        )
      )
  ) then return true; end if;
  if 'coinflip' = any (c.games) and exists (
    select 1 from coinflip_entries e join coinflip_games g on g.id = e.game_id
    where g.account_type = 'real' and g.status not in ('COMPLETED', 'CANCELLED')
      and e.created_at >= c.starts_at and e.created_at < c.ends_at
      and e.amount >= c.min_wager_cents and e.user_id <> c.partner_user_id
      and (
        c.audience is distinct from 'attributed'
        or exists (
          select 1 from partner_referrals r
          where r.user_id = e.user_id and r.partner_user_id = c.partner_user_id
        )
      )
  ) then return true; end if;
  if 'roulette' = any (c.games) and exists (
    select 1 from roulette_bets b join roulette_games g on g.id = b.game_id
    where g.account_type = 'real' and b.status = 'ACCEPTED' and g.status not in ('COMPLETED', 'CANCELLED')
      and b.created_at >= c.starts_at and b.created_at < c.ends_at
      and b.amount >= c.min_wager_cents and b.user_id <> c.partner_user_id
      and (
        c.audience is distinct from 'attributed'
        or exists (
          select 1 from partner_referrals r
          where r.user_id = b.user_id and r.partner_user_id = c.partner_user_id
        )
      )
  ) then return true; end if;
  if 'slott' = any (c.games) and exists (
    select 1 from slot_entries e join slot_games g on g.id = e.game_id
    where g.account_type = 'real' and g.status not in ('COMPLETED', 'CANCELLED')
      and e.created_at >= c.starts_at and e.created_at < c.ends_at
      and e.amount >= c.min_wager_cents and e.user_id <> c.partner_user_id
      and (
        c.audience is distinct from 'attributed'
        or exists (
          select 1 from partner_referrals r
          where r.user_id = e.user_id and r.partner_user_id = c.partner_user_id
        )
      )
  ) then return true; end if;
  return false;
end $$;

create or replace function public._lb_rules(c public.leaderboard_campaigns) returns jsonb
language sql stable set search_path = public as $$
  select jsonb_build_array(
    'Runs ' || to_char(c.starts_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI') || ' UTC to '
      || to_char(c.ends_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI') || ' UTC.',
    'Games: ' || array_to_string(c.games, ', ') || '.',
    case when c.audience = 'attributed'
      then 'Only players who joined through this host''s partner link are on this board.'
      else 'Any player who stakes in this window can place, except the host.'
    end,
    'Your rank is the total you staked on finished games in that window.',
    'Cancelled games, refunds, test-credit games, and the host''s own stakes do not count. Only the match stake counts.',
    'Promo, referral, and partner credits are not extra wagers. A real stake still counts.',
    case when c.min_wager_cents > 0
      then 'Each stake must be at least ' || trim(to_char(c.min_wager_cents / 100.0, 'FM999999990.00')) || ' USD.'
      else 'Any stake the game accepts counts.' end,
    'Stakes are in USD.',
    'A higher total ranks higher. If the totals match, the earlier last stake ranks higher.',
    'Prizes are fixed USD amounts for a place or a range of places.',
    'A prize is added to your balance and stays locked until you wager that same amount on Jackpot, Coinflip, Roulette, or Slott.',
    'Rankings and prizes are final when the race closes.'
  )
$$;

create or replace function public.leaderboard_partner_save(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := public._lb_require_partner();
  t public.leaderboard_templates;
  c public.leaderboard_campaigns;
  cid uuid;
  g text[];
  seconds numeric;
  pool bigint;
  expected timestamptz;
begin
  if jsonb_typeof(p) <> 'object' or jsonb_typeof(p -> 'games') <> 'array' or jsonb_typeof(p -> 'tiers') <> 'array' then
    raise exception 'BAD_INPUT';
  end if;
  if p ->> 'name' is null or char_length(btrim(p ->> 'name')) not between 3 and 60 or (p ->> 'name') ~ '[[:cntrl:]]' then
    raise exception 'BAD_NAME';
  end if;
  if coalesce(char_length(p ->> 'description'), 0) > 800 or coalesce(p ->> 'description', '') ~ '[[:cntrl:]]' then
    raise exception 'BAD_DESCRIPTION';
  end if;
  if coalesce(p ->> 'visibility', 'public') not in ('public', 'unlisted') then raise exception 'BAD_VISIBILITY'; end if;
  perform public._lb_check_timezone(coalesce(p ->> 'timezone', 'UTC'));
  select * into t from leaderboard_templates where id = (p ->> 'template_id')::uuid and status = 'active';
  if not found then raise exception 'TEMPLATE_UNAVAILABLE'; end if;
  select coalesce(array_agg(distinct x order by x), '{}') into g
  from jsonb_array_elements_text(p -> 'games') as x;
  if g is null or cardinality(g) = 0 or exists (select 1 from unnest(g) game where game <> all (t.allowed_games)) then
    raise exception 'GAME_NOT_ALLOWED';
  end if;
  if (p ->> 'starts_at')::timestamptz is null or (p ->> 'ends_at')::timestamptz is null then raise exception 'BAD_SCHEDULE'; end if;
  seconds := extract(epoch from ((p ->> 'ends_at')::timestamptz - (p ->> 'starts_at')::timestamptz));
  if seconds < t.min_duration_seconds or seconds > t.max_duration_seconds then raise exception 'BAD_DURATION'; end if;
  if coalesce((p ->> 'min_wager_cents')::bigint, 0) < 0 or coalesce((p ->> 'min_wager_cents')::bigint, 0) > 100000000 then
    raise exception 'BAD_MIN_WAGER';
  end if;
  if jsonb_array_length(coalesce(p -> 'tiers', '[]'::jsonb)) > t.max_tiers then raise exception 'TOO_MANY_TIERS'; end if;

  cid := nullif(p ->> 'id', '')::uuid;
  if cid is null then
    insert into leaderboard_campaigns (
      partner_user_id, template_id, template_version, name, description, visibility, timezone,
      starts_at, ends_at, min_wager_cents, games, prize_pool_cents, audience
    ) values (
      uid, t.id, t.version, btrim(p ->> 'name'), coalesce(p ->> 'description', ''),
      coalesce(p ->> 'visibility', 'public'), p ->> 'timezone',
      (p ->> 'starts_at')::timestamptz, (p ->> 'ends_at')::timestamptz,
      coalesce((p ->> 'min_wager_cents')::bigint, 0), g, 1, 'attributed'
    ) returning * into c;
    pool := public._lb_replace_tiers(c.id, p -> 'tiers', t.max_tiers);
    if pool > t.max_prize_pool_cents then raise exception 'PRIZE_CAP'; end if;
    update leaderboard_campaigns set prize_pool_cents = pool, updated_at = clock_timestamp() where id = c.id;
  else
    select * into c from leaderboard_campaigns where id = cid and partner_user_id = uid for update;
    if not found then raise exception 'NOT_FOUND'; end if;
    if c.status not in ('draft', 'rejected') then raise exception 'NOT_EDITABLE'; end if;
    if nullif(p ->> 'expected_updated_at', '') is not null
       and c.updated_at is distinct from (p ->> 'expected_updated_at')::timestamptz then
      raise exception 'CONFLICT';
    end if;
    expected := c.updated_at;
    update leaderboard_campaigns set
      template_id = t.id, template_version = t.version, name = btrim(p ->> 'name'),
      description = coalesce(p ->> 'description', ''), visibility = coalesce(p ->> 'visibility', 'public'),
      timezone = p ->> 'timezone', starts_at = (p ->> 'starts_at')::timestamptz, ends_at = (p ->> 'ends_at')::timestamptz,
      min_wager_cents = coalesce((p ->> 'min_wager_cents')::bigint, 0), games = g,
      audience = 'attributed',
      status = 'draft', rejection_reason = null, updated_at = clock_timestamp()
    where id = c.id and updated_at = expected;
    if not found then raise exception 'CONFLICT'; end if;
    pool := public._lb_replace_tiers(c.id, p -> 'tiers', t.max_tiers);
    if pool > t.max_prize_pool_cents then raise exception 'PRIZE_CAP'; end if;
    update leaderboard_campaigns set prize_pool_cents = pool where id = c.id;
  end if;
  perform public._audit(uid, 'leaderboard_saved', null, jsonb_build_object('campaign_id', coalesce(cid, c.id), 'pool', pool));
  return public.leaderboard_partner_get(coalesce(cid, c.id));
exception when invalid_text_representation then
  raise exception 'BAD_INPUT';
end $$;

create or replace function public.leaderboard_partner_duplicate(p_campaign uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := public._lb_require_partner();
  c public.leaderboard_campaigns;
  n uuid;
  start_at timestamptz;
begin
  select * into c from leaderboard_campaigns where id = p_campaign and partner_user_id = uid;
  if not found then raise exception 'NOT_FOUND'; end if;
  start_at := clock_timestamp() + interval '1 day';
  insert into leaderboard_campaigns (
    partner_user_id, template_id, template_version, name, description, visibility, timezone,
    starts_at, ends_at, min_wager_cents, games, prize_pool_cents, audience
  ) values (
    uid, c.template_id, c.template_version, left(c.name, 52) || ' copy', c.description, c.visibility, c.timezone,
    start_at, start_at + (c.ends_at - c.starts_at), c.min_wager_cents, c.games, c.prize_pool_cents, 'attributed'
  ) returning id into n;
  insert into leaderboard_prize_tiers (campaign_id, rank_start, rank_end, reward_cents)
  select n, rank_start, rank_end, reward_cents from leaderboard_prize_tiers where campaign_id = c.id;
  perform public._audit(uid, 'leaderboard_duplicated', null, jsonb_build_object('campaign_id', n, 'from', c.id));
  return public.leaderboard_partner_get(n);
end $$;

create or replace function public.leaderboard_public_partner(p_username text) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(row_to_json(x) order by x.starts_at desc), '[]'::jsonb) from (
    select c.id, c.name, c.status, c.starts_at, c.ends_at, c.timezone, c.prize_pool_cents, c.ranked_at,
      p.username as partner_username,
      (select count(*) from leaderboard_entries e where e.campaign_id = c.id and e.qualifying_cents > 0) as participants
    from profiles p
    join leaderboard_campaigns c on c.partner_user_id = p.id
    where p_username ~ '^[A-Za-z0-9_]{3,20}$'
      and lower(p.username) = lower(p_username)
      and c.visibility = 'public'
      and c.status = 'active'
      and c.audience = 'attributed'
    order by c.starts_at desc
    limit 20
  ) x
$$;
revoke all on function public.leaderboard_public_partner(text) from public;
grant execute on function public.leaderboard_public_partner(text) to anon, authenticated, service_role;

create or replace function public.leaderboard_partner_cohort() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  uid uuid := public._lb_require_partner();
  referred bigint;
  depositors bigint;
  deposit_cents bigint;
  campaign uuid;
  wager bigint;
  rows jsonb;
begin
  select count(*) into referred from partner_referrals where partner_user_id = uid;
  select count(*) filter (where cents > 0), coalesce(sum(cents), 0)
    into depositors, deposit_cents
  from public._partner_deposits(uid, null, null);
  select c.id into campaign
  from leaderboard_campaigns c
  where c.partner_user_id = uid and c.status = 'active' and c.audience = 'attributed'
  order by c.ends_at
  limit 1;
  select coalesce(sum(e.qualifying_cents), 0) into wager
  from leaderboard_entries e
  where e.campaign_id = campaign and e.qualifying_cents > 0;
  select coalesce(jsonb_agg(jsonb_build_object(
    'rank', x.rank, 'username', x.username, 'qualifying_cents', x.qualifying_cents
  ) order by x.rank), '[]'::jsonb) into rows
  from (
    select e.rank, pr.username, e.qualifying_cents
    from leaderboard_entries e
    join profiles pr on pr.id = e.player_id
    where e.campaign_id = campaign and e.qualifying_cents > 0 and e.rank is not null
    order by e.rank
    limit 10
  ) x;
  return jsonb_build_object(
    'referred_players', referred,
    'depositors', coalesce(depositors, 0),
    'deposit_cents', coalesce(deposit_cents, 0),
    'eligible_wager_cents', coalesce(wager, 0),
    'campaign_id', campaign,
    'rows', rows
  );
end $$;
revoke all on function public.leaderboard_partner_cohort() from public, anon;
grant execute on function public.leaderboard_partner_cohort() to authenticated, service_role;

create or replace function public.partner_admin_detail(p_user uuid, p_from timestamptz, p_to timestamptz)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare uid uuid := public._assert_admin(); p public.partners; now_ts timestamptz := clock_timestamp(); avail bigint;
begin
  if p_from is not null and p_to is not null and p_from >= p_to then raise exception 'BAD_RANGE'; end if;
  select * into p from public.partners where user_id = p_user;
  if p.user_id is null then raise exception 'NOT_PARTNER'; end if;
  avail := (select coalesce(sum(balance), 0) from public.wallet_accounts where owner_id = p.user_id and kind = 'user_available' and asset = 'USD' and account_type = 'real');
  return jsonb_build_object(
    'user_id', p.user_id,
    'username', (select username from public.profiles where id = p.user_id),
    'email', (select email from auth.users where id = p.user_id),
    'active', p.active,
    'commission_bps', p.commission_bps,
    'note', p.note,
    'created_at', p.created_at,
    'removed_at', p.removed_at,
    'withdrawal', case when p.active then 'blocked' when public._partner_release_hold(p.user_id) > 0 then 'held' else 'normal' end,
    'held_cents', case when p.active then null else least(avail, public._partner_release_block(p.user_id, avail)) end,
    'available_cents', avail,
    'locked_cents', (select coalesce(sum(balance), 0) from public.wallet_accounts where owner_id = p.user_id and kind = 'user_locked' and asset = 'USD' and account_type = 'real'),
    'credits_cents', (select coalesce(sum(amount_cents), 0) from public.partner_topups where user_id = p.user_id),
    'codes', coalesce((select jsonb_agg(x order by x.created_at desc) from (
      select c.id, c.code, c.reward_cents, c.max_claims, c.claim_count, c.expires_at, c.active, c.created_at,
        (select count(*) from public.partner_referrals r where r.promo_code_id = c.id) as attributed_users
      from public.promo_codes c where c.partner_user_id = p.user_id
    ) x), '[]'::jsonb),
    'topups', coalesce((select jsonb_agg(x order by x.created_at desc) from (
      select t.id, t.amount_cents, t.note, t.created_at, ap.username as admin
      from public.partner_topups t left join public.profiles ap on ap.id = t.admin_id
      where t.user_id = p.user_id order by t.created_at desc limit 100
    ) x), '[]'::jsonb),
    'windows', jsonb_build_object(
      'd7', public._partner_window(p.user_id, p.commission_bps, now_ts - interval '7 days', null),
      'd30', public._partner_window(p.user_id, p.commission_bps, now_ts - interval '30 days', null),
      'd90', public._partner_window(p.user_id, p.commission_bps, now_ts - interval '90 days', null),
      'all', public._partner_window(p.user_id, p.commission_bps, null, null),
      'range', public._partner_window(p.user_id, p.commission_bps, p_from, p_to)
    ),
    'attributed_users', (select count(*) from public.partner_referrals where partner_user_id = p.user_id),
    'users', coalesce((select jsonb_agg(x order by x.range_cents desc, x.attributed_at desc) from (
      select r.user_id, pr.username, coalesce(c.code, ac.code) as code, r.created_at as attributed_at,
        coalesce(rng.cents, 0) as range_cents, coalesce(rng.deposits, 0) as range_deposits, coalesce(al.cents, 0) as all_cents
      from public.partner_referrals r
      join public.profiles pr on pr.id = r.user_id
      left join public.promo_codes c on c.id = r.promo_code_id
      left join public.partner_acquisition_codes ac on ac.id = r.acquisition_code_id
      left join public._partner_deposits(p.user_id, p_from, p_to) rng on rng.user_id = r.user_id
      left join public._partner_deposits(p.user_id, null, null) al on al.user_id = r.user_id
      where r.partner_user_id = p.user_id
      order by coalesce(rng.cents, 0) desc, r.created_at desc
      limit 200
    ) x), '[]'::jsonb)
  );
end $$;

create or replace function public.leaderboard_partner_submit(p_campaign uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := public._lb_require_partner(); c public.leaderboard_campaigns; t public.leaderboard_templates; seconds numeric;
begin
  select * into c from leaderboard_campaigns where id = p_campaign and partner_user_id = uid for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if c.status <> 'draft' then raise exception 'NOT_EDITABLE'; end if;
  if c.starts_at <= clock_timestamp() + interval '5 minutes' then raise exception 'START_TOO_SOON'; end if;
  select * into t from leaderboard_templates where id = c.template_id and status = 'active';
  if not found then raise exception 'TEMPLATE_UNAVAILABLE'; end if;
  seconds := extract(epoch from (c.ends_at - c.starts_at));
  if seconds < t.min_duration_seconds or seconds > t.max_duration_seconds then raise exception 'BAD_DURATION'; end if;
  if c.prize_pool_cents > t.max_prize_pool_cents then raise exception 'PRIZE_CAP'; end if;
  if exists (select 1 from unnest(c.games) g where g <> all (t.allowed_games)) then raise exception 'GAME_NOT_ALLOWED'; end if;
  update leaderboard_campaigns
    set status = 'pending_approval', audience = 'attributed', updated_at = clock_timestamp()
    where id = c.id and status = 'draft';
  perform public._audit(uid, 'leaderboard_submitted', null, jsonb_build_object('campaign_id', c.id));
  return public.leaderboard_partner_get(c.id);
end $$;

-- Promo rewards stay on promo_claims. A promo code does not write partner_referrals.
create or replace function public.promo_claim(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  canonical text;
  promo public.promo_codes;
  claim_id uuid := gen_random_uuid();
  tx uuid;
  key text;
  v_asset text;
  v_type text;
  v_bank public.account_kind;
  bank uuid;
  attempts int;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  perform public._assert_live_session();
  if not exists (select 1 from public.profiles where id = uid) then raise exception 'AUTH_REQUIRED'; end if;
  perform pg_advisory_xact_lock(hashtext('promo_claim:' || uid::text));
  insert into public.promo_claim_attempts (user_id) values (uid);
  select count(*) into attempts from public.promo_claim_attempts
  where user_id = uid and created_at > clock_timestamp() - interval '10 minutes';
  if attempts > 5 then
    perform public._audit(uid, 'promo_claim_rate_limited', null, '{}'::jsonb);
    return jsonb_build_object('ok', false, 'reason', 'unavailable');
  end if;
  canonical := public._promo_code(p_code);
  if canonical is null then
    return jsonb_build_object('ok', false, 'reason', 'unavailable');
  end if;
  select * into promo from public.promo_codes where promo_codes.code = canonical for update;
  if promo.id is null then
    perform public._audit(uid, 'promo_claim_rejected', null, jsonb_build_object('code', canonical));
    return jsonb_build_object('ok', false, 'reason', 'unavailable');
  end if;
  if exists (select 1 from public.promo_claims c where c.promo_code_id = promo.id and c.user_id = uid) then
    perform public._audit(uid, 'promo_claim_rejected', null, jsonb_build_object('code', canonical, 'reason', 'already_claimed'));
    return jsonb_build_object('ok', false, 'reason', 'already_claimed');
  end if;
  if promo.partner_user_id is not null
     and (promo.partner_user_id = uid or not public._is_active_partner(promo.partner_user_id)) then
    perform public._audit(uid, 'promo_claim_rejected', null, jsonb_build_object('code', canonical, 'reason', 'partner_code'));
    return jsonb_build_object('ok', false, 'reason', 'unavailable');
  end if;
  if not promo.active
     or (promo.expires_at is not null and promo.expires_at <= clock_timestamp())
     or promo.claim_count >= promo.max_claims then
    perform public._audit(uid, 'promo_claim_rejected', null, jsonb_build_object('code', canonical));
    return jsonb_build_object('ok', false, 'reason', 'unavailable');
  end if;
  if public._money_state() <> 'PRE_MIGRATION'
     and exists (select 1 from public.wallet_accounts where owner_id = uid and kind = 'user_available' and asset = 'USD' and account_type = 'real') then
    v_asset := 'USD'; v_type := 'real'; v_bank := 'house_bankroll';
  elsif exists (select 1 from public.wallet_accounts where owner_id = uid and kind = 'user_available' and asset = 'TEST_USD' and account_type = 'test_credit') then
    v_asset := 'TEST_USD'; v_type := 'test_credit'; v_bank := 'test_faucet';
  else
    raise exception 'NO_WALLET';
  end if;
  if v_bank = 'house_bankroll' then
    bank := public._system_account(v_bank, v_asset, v_type);
    perform 1 from public.wallet_accounts where id = bank for update;
  end if;
  key := 'promo:claim:' || claim_id::text;
  insert into public.ledger_transactions (kind, idempotency_key, account_type, user_id, memo)
  values ('promo_reward', key, v_type, uid, 'Promo reward')
  returning id into tx;
  perform public._post(tx, public._system_account(v_bank, v_asset, v_type), -promo.reward_cents);
  perform public._post(tx, public._user_account(uid, 'user_available', v_asset, v_type), promo.reward_cents);
  insert into public.promo_claims (id, promo_code_id, user_id, reward_cents, required_wager_cents, ledger_tx_id)
  values (claim_id, promo.id, uid, promo.reward_cents, promo.reward_cents, tx);
  update public.promo_codes set claim_count = claim_count + 1 where id = promo.id and claim_count < max_claims;
  if not found then raise exception 'PROMO_EXHAUSTED'; end if;
  perform public._audit(uid, 'promo_claimed', null, jsonb_build_object('code', canonical, 'cents', promo.reward_cents, 'tx', tx, 'claim', claim_id));
  return jsonb_build_object('ok', true, 'reward_cents', promo.reward_cents, 'required_wager_cents', promo.reward_cents);
exception
  when unique_violation then
    if uid is not null and promo.id is not null
       and exists (select 1 from public.promo_claims c where c.promo_code_id = promo.id and c.user_id = uid) then
      return jsonb_build_object('ok', false, 'reason', 'already_claimed');
    end if;
    return jsonb_build_object('ok', false, 'reason', 'unavailable');
end $$;
