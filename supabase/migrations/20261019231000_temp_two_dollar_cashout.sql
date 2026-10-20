-- Temporary test floor. Base cashouts of $2 are allowed.
-- Bonus becomes withdrawable once crypto deposits reach that same cashout minimum.
-- Promo, referral, prize, and partner holds stay in place.
-- Restore the $20 floor by setting both minimums below back to 2000.
-- The room formula follows crypto_settings.min_withdrawal_cents, so that restore
-- also puts the deposit gate back at $20.

update public.crypto_settings
set min_withdrawal_cents = 200;

drop trigger if exists chain_networks_readonly on public.chain_networks;
update public.chain_networks
set min_withdrawal_cents = 200
where chain_id = 8453;
create trigger chain_networks_readonly
  before update or delete on public.chain_networks
  for each row execute function public.crypto_allowlist_guard();

create or replace function public._withdraw_basis(p_user uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_deposits bigint := 0;
  v_eligible bigint := 0;
  v_bonus bigint := 0;
  v_room bigint := 0;
  v_floor bigint := 0;
begin
  perform 1 from wallet_accounts
    where owner_id = p_user and account_type = 'real' and kind in ('user_available', 'user_locked')
    order by kind
    for update;
  perform public._withdraw_basis_sync();
  select b.deposits, b.eligible, b.bonus
    into v_deposits, v_eligible, v_bonus
    from withdraw_basis_bucket b
    where b.user_id = p_user;
  v_deposits := coalesce(v_deposits, 0);
  v_eligible := greatest(coalesce(v_eligible, 0), 0);
  v_bonus := greatest(coalesce(v_bonus, 0), 0);
  select min_withdrawal_cents into v_floor from crypto_settings limit 1;
  v_floor := coalesce(v_floor, 0);
  v_room := v_eligible + case when v_deposits >= v_floor then v_bonus else 0 end;
  return jsonb_build_object(
    'deposits', v_deposits,
    'eligible', v_eligible,
    'bonus', v_bonus,
    'room', v_room
  );
end $$;

revoke all on function public._withdraw_basis(uuid) from public, anon, authenticated;
grant execute on function public._withdraw_basis(uuid) to service_role;

create or replace function public._withdraw_basis_peek(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'deposits', coalesce(b.deposits, 0),
    'eligible', greatest(coalesce(b.eligible, 0), 0),
    'bonus', greatest(coalesce(b.bonus, 0), 0),
    'room', greatest(coalesce(b.eligible, 0), 0)
      + case
          when coalesce(b.deposits, 0) >= coalesce((select min_withdrawal_cents from crypto_settings limit 1), 0)
          then greatest(coalesce(b.bonus, 0), 0)
          else 0
        end
  )
  from (select 1) _
  left join public.withdraw_basis_bucket b on b.user_id = p_user;
$$;

revoke all on function public._withdraw_basis_peek(uuid) from public, anon, authenticated;
grant execute on function public._withdraw_basis_peek(uuid) to service_role;

create or replace function public._withdraw_basis_buckets_json()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    jsonb_object_agg(
      user_id::text,
      jsonb_build_object(
        'deposits', deposits,
        'eligible', eligible,
        'bonus', bonus,
        'room', eligible + case
          when deposits >= coalesce((select min_withdrawal_cents from crypto_settings limit 1), 0)
          then bonus else 0 end
      )
    ),
    '{}'::jsonb
  )
  from withdraw_basis_bucket;
$$;

revoke all on function public._withdraw_basis_buckets_json() from public, anon, authenticated;
grant execute on function public._withdraw_basis_buckets_json() to service_role;
