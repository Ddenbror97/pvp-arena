-- RLS initplan optimization (Supabase advisor: auth.uid() per row).
-- Same predicates and roles as before; only wraps row-independent auth calls in
-- (select ...) so Postgres evaluates them once per statement.
--
-- Identical to the RLS section in 20261012190000_perf-hot-paths.sql. That version
-- is in the repo migration chain for CI/test; production had not recorded it in
-- schema_migrations as of 2026-10-13. This forward migration is safe to apply
-- on environments that already ran 20261012190000 (policies are drop/create).

drop policy if exists "own roles readable" on public.user_roles;
create policy "own roles readable" on public.user_roles
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "own accounts" on public.wallet_accounts;
create policy "own accounts" on public.wallet_accounts
  for select to authenticated
  using (owner_id = (select auth.uid()));

drop policy if exists "own postings" on public.ledger_postings;
create policy "own postings" on public.ledger_postings
  for select to authenticated
  using (exists (
    select 1 from public.wallet_accounts a
    where a.id = account_id and a.owner_id = (select auth.uid())
  ));

drop policy if exists "own tx" on public.ledger_transactions;
create policy "own tx" on public.ledger_transactions
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.ledger_postings p
      join public.wallet_accounts a on a.id = p.account_id
      where p.tx_id = ledger_transactions.id and a.owner_id = (select auth.uid())
    )
  );

drop policy if exists "admins read audit" on public.audit_logs;
create policy "admins read audit" on public.audit_logs
  for select to authenticated
  using (public.has_role((select auth.uid()), 'admin'));

drop policy if exists "Users read own wallets" on public.user_wallets;
create policy "Users read own wallets" on public.user_wallets
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users read own deposit address" on public.crypto_deposit_addresses;
create policy "Users read own deposit address" on public.crypto_deposit_addresses
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Admins read jackpot payouts" on public.jackpot_payouts;
create policy "Admins read jackpot payouts" on public.jackpot_payouts
  for select to authenticated
  using (public.has_role((select auth.uid()), 'admin'));

drop policy if exists "Players read own roulette bets" on public.roulette_bets;
create policy "Players read own roulette bets" on public.roulette_bets
  for select to authenticated
  using (
    (select auth.uid()) = user_id
    or public.has_role((select auth.uid()), 'admin')
  );

drop policy if exists "Admins read coinflip payouts" on public.coinflip_payouts;
create policy "Admins read coinflip payouts" on public.coinflip_payouts
  for select to authenticated
  using (public.has_role((select auth.uid()), 'admin'));

drop policy if exists "Admins read roulette payouts" on public.roulette_payouts;
create policy "Admins read roulette payouts" on public.roulette_payouts
  for select to authenticated
  using (public.has_role((select auth.uid()), 'admin'));

drop policy if exists "Players read own coinflip entries" on public.coinflip_entries;
create policy "Players read own coinflip entries" on public.coinflip_entries
  for select to authenticated
  using (
    (select auth.uid()) = user_id
    or public.has_role((select auth.uid()), 'admin')
  );

drop policy if exists "Players read own deposits" on public.crypto_deposits;
create policy "Players read own deposits" on public.crypto_deposits
  for select to authenticated
  using (
    (select auth.uid()) = user_id
    or public.has_role((select auth.uid()), 'admin'::public.app_role)
  );

drop policy if exists "own invite" on public.referral_invites;
create policy "own invite" on public.referral_invites
  for select to authenticated
  using (inviter_user_id = (select auth.uid()));

drop policy if exists prestige_own on public.user_prestige;
create policy prestige_own on public.user_prestige
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists cosmetics_own on public.user_cosmetics;
create policy cosmetics_own on public.user_cosmetics
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists xp_own on public.xp_events;
create policy xp_own on public.xp_events
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists claims_own on public.user_reward_claims;
create policy claims_own on public.user_reward_claims
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "own avatar uploads" on public.user_avatars;
create policy "own avatar uploads" on public.user_avatars
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists daily_chest_state_own on public.daily_chest_state;
create policy daily_chest_state_own on public.daily_chest_state
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists daily_chest_opens_own on public.daily_chest_opens;
create policy daily_chest_opens_own on public.daily_chest_opens
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists fee_free_tickets_own on public.fee_free_tickets;
create policy fee_free_tickets_own on public.fee_free_tickets
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "slot entries own" on public.slot_entries;
create policy "slot entries own" on public.slot_entries
  for select to authenticated
  using (
    (select auth.uid()) = user_id
    or public.has_role((select auth.uid()), 'admin')
  );

drop policy if exists "slot payouts admin" on public.slot_payouts;
create policy "slot payouts admin" on public.slot_payouts
  for select to authenticated
  using (public.has_role((select auth.uid()), 'admin'));

drop policy if exists "slot budget admin" on public.slot_bonus_budget;
create policy "slot budget admin" on public.slot_bonus_budget
  for select to authenticated
  using (public.has_role((select auth.uid()), 'admin'));

drop policy if exists "slot promo config admin" on public.slot_promo_config;
create policy "slot promo config admin" on public.slot_promo_config
  for select to authenticated
  using (public.has_role((select auth.uid()), 'admin'));

drop policy if exists "admins read integrity incidents" on public.integrity_incidents;
create policy "admins read integrity incidents" on public.integrity_incidents
  for select to authenticated
  using (public.has_role((select auth.uid()), 'admin'));

drop policy if exists "admins read integrity runs" on public.integrity_runs;
create policy "admins read integrity runs" on public.integrity_runs
  for select to authenticated
  using (public.has_role((select auth.uid()), 'admin'));
