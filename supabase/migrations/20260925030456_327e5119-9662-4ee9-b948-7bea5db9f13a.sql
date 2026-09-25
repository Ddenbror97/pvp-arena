CREATE TABLE public.money_migrations (
  version text PRIMARY KEY,
  state text NOT NULL CHECK (state IN ('MIGRATED','FINALIZED','ROLLED_BACK')),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  applied_at timestamptz NOT NULL DEFAULT now(),
  finalized_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.money_migrations TO service_role;
ALTER TABLE public.money_migrations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.money_domain_config (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  money_domain text NOT NULL,
  asset text NOT NULL,
  account_type text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((money_domain = 'TEST_USD' AND asset = 'TEST_USD' AND account_type = 'test_credit')
      OR (money_domain = 'REAL_USD' AND asset = 'USD' AND account_type = 'real'))
);
GRANT SELECT ON public.money_domain_config TO anon, authenticated;
GRANT ALL ON public.money_domain_config TO service_role;
ALTER TABLE public.money_domain_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read the money domain" ON public.money_domain_config FOR SELECT USING (true);
INSERT INTO public.money_domain_config (money_domain, asset, account_type) VALUES ('TEST_USD','TEST_USD','test_credit');

ALTER TABLE public.crypto_settings
  ADD COLUMN real_play_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN money_domain_frozen boolean NOT NULL DEFAULT false;

ALTER TABLE public.wallet_accounts ADD CONSTRAINT wallet_accounts_domain_pair
  CHECK ((account_type = 'test_credit' AND asset = 'TEST_USD') OR (account_type = 'real' AND asset = 'USD'));
ALTER TABLE public.wallet_accounts ADD CONSTRAINT wallet_accounts_domain_kind
  CHECK (NOT (account_type = 'real' AND kind = 'test_faucet')
     AND NOT (account_type = 'test_credit' AND kind IN ('external_custody','house_bankroll')));
ALTER TABLE public.wallet_accounts DROP CONSTRAINT wallet_accounts_balance_nonneg;
ALTER TABLE public.wallet_accounts ADD CONSTRAINT wallet_accounts_balance_nonneg
  CHECK (kind IN ('test_faucet','external_custody','house_bankroll') OR balance >= 0);

ALTER TABLE public.jackpot_games ADD COLUMN money_domain text NOT NULL DEFAULT 'TEST_USD';
ALTER TABLE public.coinflip_games ADD COLUMN money_domain text NOT NULL DEFAULT 'TEST_USD';
ALTER TABLE public.roulette_games ADD COLUMN money_domain text NOT NULL DEFAULT 'TEST_USD';
ALTER TABLE public.jackpot_games ADD CONSTRAINT jackpot_games_domain CHECK ((money_domain='TEST_USD' AND asset='TEST_USD' AND account_type='test_credit') OR (money_domain='REAL_USD' AND asset='USD' AND account_type='real'));
ALTER TABLE public.coinflip_games ADD CONSTRAINT coinflip_games_domain CHECK ((money_domain='TEST_USD' AND asset='TEST_USD' AND account_type='test_credit') OR (money_domain='REAL_USD' AND asset='USD' AND account_type='real'));
ALTER TABLE public.roulette_games ADD CONSTRAINT roulette_games_domain CHECK ((money_domain='TEST_USD' AND asset='TEST_USD' AND account_type='test_credit') OR (money_domain='REAL_USD' AND asset='USD' AND account_type='real'));

CREATE OR REPLACE FUNCTION public._money_domain_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
begin
  if new.money_domain is distinct from old.money_domain or new.asset is distinct from old.asset or new.account_type is distinct from old.account_type then
    raise exception 'IMMUTABLE_FIELD money_domain';
  end if;
  return new;
end $$;
CREATE TRIGGER money_domain_immutable BEFORE UPDATE ON public.jackpot_games FOR EACH ROW EXECUTE FUNCTION public._money_domain_immutable();
CREATE TRIGGER money_domain_immutable BEFORE UPDATE ON public.coinflip_games FOR EACH ROW EXECUTE FUNCTION public._money_domain_immutable();
CREATE TRIGGER money_domain_immutable BEFORE UPDATE ON public.roulette_games FOR EACH ROW EXECUTE FUNCTION public._money_domain_immutable();

CREATE OR REPLACE FUNCTION public._money_state() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  select coalesce((select case when state = 'ROLLED_BACK' then 'PRE_MIGRATION' else state end from money_migrations where version = 'real_usd_v1'), 'PRE_MIGRATION')
$$;
CREATE OR REPLACE FUNCTION public._real_play_allowed() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  select public._money_state() = 'FINALIZED' and coalesce(s.money_domain_frozen, false) and coalesce(s.real_play_enabled, false) and coalesce(s.crypto_system_enabled, false)
         and (select account_type from money_domain_config) = 'real'
  from crypto_settings s
$$;
CREATE OR REPLACE FUNCTION public._play_domain_open() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  select case (select account_type from money_domain_config)
    when 'test_credit' then public._money_state() = 'PRE_MIGRATION' and not coalesce((select money_domain_frozen from crypto_settings), false)
    when 'real' then public._real_play_allowed()
    else false end
$$;

CREATE OR REPLACE FUNCTION public._ledger_domain_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
declare t ledger_transactions; a wallet_accounts; frozen boolean;
begin
  select * into t from ledger_transactions where id = new.tx_id;
  select * into a from wallet_accounts where id = new.account_id;
  if t.id is null or a.id is null then raise exception 'LEDGER_DOMAIN_UNKNOWN'; end if;
  if a.account_type <> t.account_type then raise exception 'LEDGER_DOMAIN_MIX tx % (%) account % (%)', t.id, t.account_type, a.id, a.account_type; end if;
  if (a.account_type = 'test_credit' and a.asset <> 'TEST_USD') or (a.account_type = 'real' and a.asset <> 'USD') then raise exception 'LEDGER_DOMAIN_MIX asset'; end if;
  if exists (select 1 from ledger_postings p join wallet_accounts w on w.id = p.account_id
             where p.tx_id = new.tx_id and (w.account_type <> a.account_type or w.asset <> a.asset)) then
    raise exception 'LEDGER_DOMAIN_MIX mixed postings';
  end if;
  if t.account_type = 'real' then
    if t.kind in ('test_credit_grant','test_credit_reset') or a.kind = 'test_faucet' then raise exception 'LEDGER_DOMAIN_MIX test kind on real money'; end if;
    if public._money_state() = 'PRE_MIGRATION' then raise exception 'LEDGER_NOT_READY'; end if;
  else
    if t.kind in ('deposit','withdrawal') or a.kind in ('external_custody','house_bankroll') then raise exception 'LEDGER_DOMAIN_MIX real kind on test money'; end if;
    select money_domain_frozen into frozen from crypto_settings;
    if coalesce(frozen, false) then raise exception 'TEST_DOMAIN_FROZEN'; end if;
  end if;
  return new;
end $$;
CREATE TRIGGER ledger_domain_guard BEFORE INSERT ON public.ledger_postings FOR EACH ROW EXECUTE FUNCTION public._ledger_domain_guard();

CREATE OR REPLACE FUNCTION public.ensure_profile(p_username text, p_age_confirmed boolean)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare uid uuid := auth.uid(); c public.jackpot_config; tx uuid; avail uuid;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if exists (select 1 from profiles where id = uid) then return jsonb_build_object('created', false); end if;
  if not coalesce(p_age_confirmed,false) then raise exception 'AGE_CONFIRMATION_REQUIRED'; end if;
  if p_username is null or p_username !~ '^[A-Za-z0-9_]{3,20}$' then raise exception 'INVALID_USERNAME'; end if;
  if exists (select 1 from profiles where lower(username) = lower(p_username)) then raise exception 'USERNAME_TAKEN'; end if;
  select * into c from jackpot_config;
  insert into profiles (id, username, avatar_url, age_confirmed_at)
    values (uid, p_username, 'https://api.dicebear.com/9.x/shapes/svg?seed=' || p_username, now());
  insert into wallet_accounts (owner_id, kind, asset, account_type) values
    (uid, 'user_available', 'USD', 'real'), (uid, 'user_locked', 'USD', 'real');
  if public._money_state() = 'PRE_MIGRATION' then
    insert into wallet_accounts (owner_id, kind, asset, account_type) values
      (uid, 'user_available', c.asset, c.account_type), (uid, 'user_locked', c.asset, c.account_type);
    avail := _user_account(uid, 'user_available', c.asset, c.account_type);
    insert into ledger_transactions (kind, idempotency_key, account_type, user_id, memo)
      values ('test_credit_grant', 'signup:' || uid, c.account_type, uid, 'Welcome test credits (no cash value)') returning id into tx;
    perform _post(tx, _system_account('test_faucet', c.asset, c.account_type), -c.test_grant_amount);
    perform _post(tx, avail, c.test_grant_amount);
  end if;
  perform _audit(uid, 'profile_created', null, jsonb_build_object('username', p_username));
  return jsonb_build_object('created', true);
end $function$;

CREATE OR REPLACE FUNCTION public.money_real_invariants() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  with acc as (
    select
      coalesce(sum(balance) filter (where kind = 'external_custody'),0) custody,
      coalesce(sum(balance) filter (where kind = 'user_available'),0) avail,
      coalesce(sum(balance) filter (where kind = 'user_locked'),0) locked,
      coalesce(sum(balance) filter (where kind = 'game_escrow'),0) escrow,
      coalesce(sum(balance) filter (where kind = 'house_revenue'),0) house,
      coalesce(sum(balance) filter (where kind = 'house_bankroll'),0) bankroll,
      coalesce(sum(balance),0) total
    from wallet_accounts where account_type = 'real'
  ), post as (
    select coalesce(sum(p.amount),0) s from ledger_postings p join wallet_accounts w on w.id = p.account_id where w.account_type = 'real'
  ), flows as (
    select
      coalesce((select sum(usd_cents) from crypto_deposits where status = 'CREDITED'),0) deposits,
      coalesce((select sum(usd_cents + fee_usd_cents) from crypto_withdrawals where status = 'CONFIRMED'),0) withdrawals
  )
  select jsonb_build_object(
    'postings_sum', post.s, 'balances_sum', acc.total,
    'custody', acc.custody, 'player_available', acc.avail, 'player_locked', acc.locked,
    'game_escrow', acc.escrow, 'house_revenue', acc.house, 'house_bankroll', acc.bankroll,
    'credited_deposits', flows.deposits, 'settled_withdrawals', flows.withdrawals,
    'ok_postings_zero', post.s = 0 and acc.total = 0,
    'ok_custody_equals_liabilities', -acc.custody = acc.avail + acc.locked + acc.escrow + acc.house + acc.bankroll,
    'ok_custody_equals_flows', -acc.custody = flows.deposits - flows.withdrawals
  ) from acc, post, flows
$$;

CREATE OR REPLACE FUNCTION public.crypto_reconcile(p_onchain_cents bigint, p_details jsonb)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare liab bigint; pend bigint; inv jsonb;
begin
  select coalesce(-sum(balance),0) into liab from wallet_accounts where kind = 'external_custody' and account_type = 'real';
  select coalesce(sum(usd_cents),0) into pend from crypto_withdrawals where status in ('SUBMITTING','SUBMITTED');
  inv := public.money_real_invariants();
  if not (inv->>'ok_postings_zero')::boolean or not (inv->>'ok_custody_equals_liabilities')::boolean then
    perform _crypto_incident('crypto_reconcile', 'crypto_reconcile:invariant:' || to_char(now(),'YYYYMMDD'), p_details || jsonb_build_object('invariants', inv));
    return jsonb_build_object('ok', false, 'ledger_cents', liab, 'onchain_cents', p_onchain_cents, 'invariants', inv);
  end if;
  if p_onchain_cents + pend < liab then
    perform _crypto_incident('crypto_reconcile', 'crypto_reconcile:shortfall:' || to_char(now(),'YYYYMMDD'),
      p_details || jsonb_build_object('ledger_cents', liab, 'onchain_cents', p_onchain_cents, 'in_flight_cents', pend));
    return jsonb_build_object('ok', false, 'ledger_cents', liab, 'onchain_cents', p_onchain_cents, 'invariants', inv);
  end if;
  return jsonb_build_object('ok', true, 'ledger_cents', liab, 'onchain_cents', p_onchain_cents, 'invariants', inv);
end $function$;

CREATE OR REPLACE FUNCTION public._money_deposit_snapshot() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'tx_hash', tx_hash, 'log_index', log_index, 'status', status, 'units', units, 'usd_cents', usd_cents,
    'from', from_address, 'to', to_address, 'block', block_number, 'confirmed_at', confirmed_at, 'ledger_tx_id', ledger_tx_id, 'user_id', user_id) order by tx_hash), '[]'::jsonb)
  from crypto_deposits
  where tx_hash in ('0xc948435f306a17ee06a42ae73a9233e33b0af77993ed30d9ae13c75278f2d947','0xade51fcf975f1a9227b779afe2e9ddb1d3085ee1ccc71a42b44f0d11ca6e69fc')
$$;

CREATE OR REPLACE FUNCTION public._money_migrate_v1() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
declare snap jsonb; s crypto_settings; r record; cancelled jsonb := '[]'::jsonb; draining jsonb := '[]'::jsonb; test_before jsonb; inv jsonb; n int;
begin
  perform pg_advisory_xact_lock(hashtext('money_migration'));
  if public._money_state() <> 'PRE_MIGRATION' then return jsonb_build_object('status','ALREADY_APPLIED','state',public._money_state()); end if;
  select * into s from crypto_settings for update;
  if exists (select 1 from ledger_transactions where account_type = 'real') then raise exception 'PRECONDITION real ledger transactions exist'; end if;
  if exists (select 1 from wallet_accounts where account_type = 'real' and balance <> 0) then raise exception 'PRECONDITION real balances not zero'; end if;
  if exists (select 1 from crypto_withdrawals where status not in ('REJECTED','RELEASED','CONFIRMED','FAILED','CANCELLED')) then raise exception 'PRECONDITION open withdrawals'; end if;
  if s.withdrawals_enabled or not s.watch_only or s.real_play_enabled or s.money_domain_frozen then raise exception 'PRECONDITION switches'; end if;
  snap := public._money_deposit_snapshot();
  if jsonb_array_length(snap) <> 2 or exists (select 1 from jsonb_array_elements(snap) e where e->>'status' <> 'CONFIRMED' or e->>'ledger_tx_id' is not null) then
    raise exception 'PRECONDITION deposits %', snap;
  end if;
  if exists (select 1 from crypto_deposits where status = 'CREDITED' or ledger_tx_id is not null) then raise exception 'PRECONDITION credited deposit exists'; end if;
  if exists (select 1 from coinflip_games where status not in ('COMPLETED','CANCELLED')) then raise exception 'PRECONDITION open coinflip'; end if;
  if exists (select 1 from jackpot_games where status not in ('COMPLETED','CANCELLED') and (status <> 'WAITING' or pot_amount <> 0 or entry_count <> 0)) then raise exception 'PRECONDITION jackpot with stakes'; end if;
  if exists (select 1 from roulette_games where status in ('LOCKED','SPINNING','SETTLEMENT') and bet_count <> 0) then raise exception 'PRECONDITION roulette in flight with bets'; end if;
  select jsonb_object_agg(id, balance) into test_before from wallet_accounts where account_type = 'test_credit';

  for r in select id from jackpot_games where status = 'WAITING' loop
    update jackpot_games set status = 'CANCELLED' where id = r.id;
    perform _audit(null, 'game_cancelled_money_migration', r.id, jsonb_build_object('reason','MONEY_MIGRATION'));
    cancelled := cancelled || jsonb_build_object('game','jackpot','id',r.id);
  end loop;
  for r in select id from roulette_games where status = 'BETTING' loop
    perform _roulette_refund(r.id, 'MONEY_MIGRATION');
    cancelled := cancelled || jsonb_build_object('game','roulette','id',r.id);
  end loop;
  for r in select id, status from roulette_games where status in ('WAITING','LOCKED','SPINNING','SETTLEMENT') loop
    draining := draining || jsonb_build_object('game','roulette','id',r.id,'status',r.status,'bets',0);
  end loop;

  insert into wallet_accounts (owner_id, kind, asset, account_type)
    select p.id, k.kind, 'USD', 'real' from profiles p cross join (values ('user_available'::account_kind), ('user_locked'::account_kind)) k(kind)
    on conflict do nothing;
  perform _system_account('house_revenue','USD','real');
  perform _system_account('game_escrow','USD','real');
  perform _system_account('external_custody','USD','real');
  perform _system_account('house_bankroll','USD','real');

  update money_domain_config set money_domain = 'REAL_USD', asset = 'USD', account_type = 'real', updated_at = now();
  insert into money_migrations (version, state, details) values ('real_usd_v1', 'MIGRATED',
    jsonb_build_object('deposit_snapshot', snap, 'cancelled', cancelled, 'draining_empty', draining, 'test_balances_before', test_before))
  on conflict (version) do update set state = 'MIGRATED', details = excluded.details, applied_at = now(), finalized_at = null, updated_at = now();

  select count(*) into n from profiles p where not exists (select 1 from wallet_accounts w where w.owner_id = p.id and w.kind = 'user_available' and w.account_type = 'real')
     or not exists (select 1 from wallet_accounts w where w.owner_id = p.id and w.kind = 'user_locked' and w.account_type = 'real');
  if n <> 0 then raise exception 'POSTCONDITION real accounts missing'; end if;
  if exists (select 1 from wallet_accounts where account_type = 'real' and balance <> 0) then raise exception 'POSTCONDITION real balance'; end if;
  inv := public.money_real_invariants();
  if (inv->>'postings_sum')::bigint <> 0 or (inv->>'custody')::bigint <> 0 then raise exception 'POSTCONDITION real ledger %', inv; end if;
  if exists (select 1 from wallet_accounts where account_type = 'test_credit' and kind in ('game_escrow','user_locked') and balance <> 0) then raise exception 'POSTCONDITION test escrow/locked not zero'; end if;
  if exists (select 1 from wallet_accounts w where account_type = 'test_credit' and balance <> (test_before->>w.id::text)::bigint) then raise exception 'POSTCONDITION test balances changed'; end if;
  if exists (select 1 from jackpot_games where account_type = 'test_credit' and status in ('WAITING','ACTIVE','DRAWING')) then raise exception 'POSTCONDITION open jackpot'; end if;
  if exists (select 1 from roulette_games where account_type = 'test_credit' and status in ('WAITING','BETTING')) then raise exception 'POSTCONDITION open roulette betting'; end if;
  if public._money_deposit_snapshot() <> snap then raise exception 'POSTCONDITION deposits changed'; end if;
  perform _audit(null, 'money_migration_applied', null, jsonb_build_object('version','real_usd_v1','cancelled',cancelled,'draining',draining));
  return jsonb_build_object('status','MIGRATED','cancelled',cancelled,'draining',draining,'invariants',inv);
end $$;

CREATE OR REPLACE FUNCTION public._money_finalize_v1() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
declare m money_migrations; s crypto_settings; snap jsonb;
begin
  perform pg_advisory_xact_lock(hashtext('money_migration'));
  select * into m from money_migrations where version = 'real_usd_v1' for update;
  if m.state = 'FINALIZED' then return jsonb_build_object('status','ALREADY_FINALIZED'); end if;
  if m.state is distinct from 'MIGRATED' then raise exception 'FINALIZE requires MIGRATED'; end if;
  select * into s from crypto_settings for update;
  if s.withdrawals_enabled or not s.watch_only or s.real_play_enabled then raise exception 'FINALIZE switches'; end if;
  if exists (select 1 from jackpot_games where account_type='test_credit' and status not in ('COMPLETED','CANCELLED'))
     or exists (select 1 from coinflip_games where account_type='test_credit' and status not in ('COMPLETED','CANCELLED'))
     or exists (select 1 from roulette_games where account_type='test_credit' and status not in ('COMPLETED','CANCELLED')) then
    raise exception 'FINALIZE open test games remain';
  end if;
  if exists (select 1 from wallet_accounts where account_type = 'test_credit' and kind in ('game_escrow','user_locked') and balance <> 0) then raise exception 'FINALIZE test escrow not zero'; end if;
  snap := public._money_deposit_snapshot();
  if snap <> m.details->'deposit_snapshot' then raise exception 'FINALIZE deposits changed'; end if;
  if exists (select 1 from wallet_accounts where account_type = 'real' and balance <> 0) then raise exception 'FINALIZE real balance not zero'; end if;
  update crypto_settings set money_domain_frozen = true;
  update money_migrations set state = 'FINALIZED', finalized_at = now(), updated_at = now() where version = 'real_usd_v1';
  perform _audit(null, 'money_migration_finalized', null, jsonb_build_object('version','real_usd_v1'));
  return jsonb_build_object('status','FINALIZED');
end $$;

CREATE OR REPLACE FUNCTION public._money_rollback_v1() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
declare m money_migrations;
begin
  perform pg_advisory_xact_lock(hashtext('money_migration'));
  select * into m from money_migrations where version = 'real_usd_v1' for update;
  if m.state is distinct from 'MIGRATED' then raise exception 'ROLLBACK only allowed in MIGRATED (state %)', coalesce(m.state,'PRE_MIGRATION'); end if;
  if exists (select 1 from ledger_transactions where account_type = 'real') then raise exception 'ROLLBACK real ledger activity exists'; end if;
  if exists (select 1 from jackpot_games where account_type='real') or exists (select 1 from coinflip_games where account_type='real') or exists (select 1 from roulette_games where account_type='real') then
    raise exception 'ROLLBACK real games exist';
  end if;
  update money_domain_config set money_domain = 'TEST_USD', asset = 'TEST_USD', account_type = 'test_credit', updated_at = now();
  update money_migrations set state = 'ROLLED_BACK', updated_at = now() where version = 'real_usd_v1';
  perform _audit(null, 'money_migration_rolled_back', null, jsonb_build_object('version','real_usd_v1'));
  return jsonb_build_object('status','ROLLED_BACK');
end $$;

-- Minimal in-place edits to existing functions (fails if any expected text is missing).
CREATE OR REPLACE FUNCTION public._patch_fn(p_name text, p_from text[], p_to text[]) RETURNS void LANGUAGE plpgsql SET search_path TO 'public' AS $$
declare r record; def text; i int;
begin
  for r in select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = p_name loop
    def := pg_get_functiondef(r.oid);
    for i in 1..array_length(p_from, 1) loop
      if position(p_from[i] in def) = 0 then raise exception 'patch % not found in %', i, p_name; end if;
      def := overlay(def placing p_to[i] from position(p_from[i] in def) for length(p_from[i]));
    end loop;
    execute def;
  end loop;
end $$;

SELECT public._patch_fn('_ensure_open_game',
  ARRAY[$q$declare gid bigint; c public.jackpot_config; seed bytea;$q$, E'  select * into c from jackpot_config;\n', $q$insert into jackpot_games (asset, account_type,$q$, $q$values (c.asset, c.account_type,$q$],
  ARRAY[$q$declare gid bigint; c public.jackpot_config; seed bytea; md public.money_domain_config;$q$, E'  select * into c from jackpot_config;\n  select * into md from money_domain_config;\n  if not public._play_domain_open() then return null; end if;\n', $q$insert into jackpot_games (money_domain, asset, account_type,$q$, $q$values (md.money_domain, md.asset, md.account_type,$q$]);

SELECT public._patch_fn('jackpot_join',
  ARRAY[$q$if gid is null then raise exception 'GAME_CLOSED'; end if;$q$, $q$if g.status not in ('WAITING','ACTIVE') then raise exception 'GAME_CLOSED'; end if;$q$],
  ARRAY[E'if gid is null then\n    if not public._play_domain_open() then raise exception ''REAL_MONEY_DISABLED''; end if;\n    raise exception ''GAME_CLOSED'';\n  end if;',
        E'if g.status not in (''WAITING'',''ACTIVE'') then raise exception ''GAME_CLOSED''; end if;\n  if g.account_type <> (select account_type from money_domain_config) or not public._play_domain_open() then raise exception ''REAL_MONEY_DISABLED''; end if;']);

SELECT public._patch_fn('coinflip_create',
  ARRAY[$q$c public.coinflip_config; jc public.jackpot_config;$q$, E'  select * into jc from jackpot_config;\n  if jc.real_money_enabled or jc.account_type <> ''test_credit'' then raise exception ''REAL_MONEY_DISABLED''; end if;', $q$insert into coinflip_games (creator_id,$q$, $q$values (uid, p_side, p_amount,$q$],
  ARRAY[$q$c public.coinflip_config; jc public.money_domain_config;$q$, E'  select * into jc from money_domain_config;\n  if not public._play_domain_open() then raise exception ''REAL_MONEY_DISABLED''; end if;', $q$insert into coinflip_games (money_domain, creator_id,$q$, $q$values (jc.money_domain, uid, p_side, p_amount,$q$]);

SELECT public._patch_fn('_roulette_ensure_open',
  ARRAY[$q$jc public.jackpot_config;$q$, E'  select * into jc from public.jackpot_config;\n  if jc.real_money_enabled or jc.account_type <> ''test_credit'' then raise exception ''REAL_MONEY_DISABLED''; end if;', $q$insert into public.roulette_games (status,$q$, $q$values ('BETTING', c.wheel_version,$q$],
  ARRAY[$q$jc public.money_domain_config;$q$, E'  select * into jc from public.money_domain_config;\n  if not public._play_domain_open() then return null; end if;', $q$insert into public.roulette_games (money_domain, status,$q$, $q$values (jc.money_domain, 'BETTING', c.wheel_version,$q$]);

SELECT public._patch_fn('roulette_bet',
  ARRAY[E'  gid := public._roulette_ensure_open();\n', $q$if g.account_type <> 'test_credit' then raise exception 'REAL_MONEY_DISABLED'; end if;$q$],
  ARRAY[E'  gid := public._roulette_ensure_open();\n  if gid is null then raise exception ''REAL_MONEY_DISABLED''; end if;\n', $q$if g.account_type <> (select account_type from public.money_domain_config) or not public._play_domain_open() then raise exception 'REAL_MONEY_DISABLED'; end if;$q$]);

SELECT public._patch_fn('_roulette_settle',
  ARRAY[$q$bank := public._system_account('test_faucet', g.asset, g.account_type);$q$],
  ARRAY[$q$bank := public._system_account(case when g.account_type = 'real' then 'house_bankroll'::public.account_kind else 'test_faucet'::public.account_kind end, g.asset, g.account_type);$q$]);

SELECT public._patch_fn('crypto_credit_deposit',
  ARRAY[$q$  key := 'deposit:' ||$q$],
  ARRAY[E'  if public._money_state() <> ''FINALIZED'' then\n    update crypto_deposits set status = ''CONFIRMED'', usd_cents = cents, price_snapshot_id = psid, confirmed_at = coalesce(confirmed_at, now()) where id = d.id;\n    return jsonb_build_object(''status'',''LEDGER_NOT_READY'',''cents'',cents);\n  end if;\n  key := ''deposit:'' ||']);

SELECT public._patch_fn('crypto_request_withdrawal',
  ARRAY[E'begin\n  select * into s from crypto_settings;'],
  ARRAY[E'begin\n  if public._money_state() <> ''FINALIZED'' then raise exception ''LEDGER_NOT_READY''; end if;\n  select * into s from crypto_settings;']);

SELECT public._patch_fn('claim_test_credits', ARRAY[E'\nbegin\n'], ARRAY[E'\nbegin\n  if public._money_state() <> ''PRE_MIGRATION'' then raise exception ''TEST_CREDITS_RETIRED''; end if;\n']);
SELECT public._patch_fn('reset_test_credits', ARRAY[E'\nbegin\n'], ARRAY[E'\nbegin\n  if public._money_state() <> ''PRE_MIGRATION'' then raise exception ''TEST_CREDITS_RETIRED''; end if;\n']);

DROP FUNCTION public._patch_fn(text, text[], text[]);

REVOKE ALL ON FUNCTION public._money_migrate_v1(), public._money_finalize_v1(), public._money_rollback_v1(), public._money_deposit_snapshot(),
  public._ledger_domain_guard(), public._money_domain_immutable(), public.money_real_invariants(), public._money_state(),
  public._real_play_allowed(), public._play_domain_open() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.money_real_invariants(), public._money_state() TO service_role;