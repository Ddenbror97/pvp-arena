create table public.user_wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  chain_type text not null default 'EVM' check (chain_type = 'EVM'),
  address text not null check (address ~ '^0x[0-9a-fA-F]{40}$'),
  normalized_address text not null check (normalized_address ~ '^0x[0-9a-f]{40}$' and normalized_address = lower(address)),
  wallet_provider text not null default 'metamask' check (wallet_provider = 'metamask'),
  is_verified boolean not null default false,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  verified_at timestamptz,
  last_seen_at timestamptz,
  constraint user_wallets_user_addr_key unique (user_id, normalized_address),
  constraint user_wallets_verified_consistent check ((is_verified and verified_at is not null) or (not is_verified and verified_at is null))
);
create unique index user_wallets_one_verified_owner on public.user_wallets (normalized_address) where is_verified;
create unique index user_wallets_one_primary on public.user_wallets (user_id) where is_primary;

grant select on public.user_wallets to authenticated;
grant all on public.user_wallets to service_role;
alter table public.user_wallets enable row level security;
create policy "Users read own wallets" on public.user_wallets for select to authenticated using (auth.uid() = user_id);

create table public.wallet_verification_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  wallet_address text not null check (wallet_address ~ '^0x[0-9a-fA-F]{40}$'),
  normalized_address text not null check (normalized_address = lower(wallet_address)),
  nonce text not null unique check (nonce ~ '^[0-9a-f]{64}$'),
  message_version integer not null default 1 check (message_version = 1),
  issued_at timestamptz not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint wvc_lifetime check (expires_at > issued_at and expires_at <= issued_at + interval '10 minutes')
);
create index wvc_user_recent on public.wallet_verification_challenges (user_id, created_at desc);
grant all on public.wallet_verification_challenges to service_role;
alter table public.wallet_verification_challenges enable row level security;

create or replace function public.wallet_touch(p_user uuid, p_address text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_user is null or p_address !~ '^0x[0-9a-fA-F]{40}$' then raise exception 'INVALID_INPUT'; end if;
  if not exists (select 1 from public.profiles where id = p_user) then raise exception 'PROFILE_REQUIRED'; end if;
  insert into public.user_wallets (user_id, address, normalized_address, last_seen_at)
    values (p_user, p_address, lower(p_address), clock_timestamp())
  on conflict (user_id, normalized_address) do update set last_seen_at = excluded.last_seen_at, updated_at = clock_timestamp();
end $$;

create or replace function public.wallet_issue_challenge(p_user uuid, p_address text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare ts timestamptz := clock_timestamp(); c public.wallet_verification_challenges;
begin
  if p_user is null or p_address !~ '^0x[0-9a-fA-F]{40}$' then return jsonb_build_object('ok', false, 'code', 'INVALID_INPUT'); end if;
  if not exists (select 1 from public.profiles where id = p_user) then return jsonb_build_object('ok', false, 'code', 'PROFILE_REQUIRED'); end if;
  if (select count(*) from public.wallet_verification_challenges where user_id = p_user and created_at > ts - interval '10 minutes') >= 10 then
    return jsonb_build_object('ok', false, 'code', 'RATE_LIMITED');
  end if;
  if exists (select 1 from public.user_wallets where normalized_address = lower(p_address) and is_verified and user_id <> p_user) then
    return jsonb_build_object('ok', false, 'code', 'ALREADY_LINKED');
  end if;
  -- An earlier open challenge for the same wallet can no longer be used.
  update public.wallet_verification_challenges set expires_at = greatest(issued_at + interval '1 microsecond', least(expires_at, ts))
    where user_id = p_user and normalized_address = lower(p_address) and consumed_at is null and expires_at > ts;
  insert into public.wallet_verification_challenges (user_id, wallet_address, normalized_address, nonce, issued_at, expires_at)
    values (p_user, p_address, lower(p_address), encode(extensions.gen_random_bytes(32), 'hex'), ts, ts + interval '10 minutes')
    returning * into c;
  return jsonb_build_object('ok', true, 'id', c.id, 'address', c.wallet_address, 'nonce', c.nonce, 'issued_at', c.issued_at, 'expires_at', c.expires_at, 'version', c.message_version);
end $$;

create or replace function public.wallet_get_challenge(p_id uuid, p_user uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', id, 'address', wallet_address, 'nonce', nonce, 'issued_at', issued_at, 'expires_at', expires_at, 'version', message_version,
    'consumed', consumed_at is not null, 'expired', expires_at <= clock_timestamp())
  from public.wallet_verification_challenges where id = p_id and user_id = p_user
$$;

create or replace function public.wallet_consume_and_verify(p_id uuid, p_user uuid, p_normalized text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c public.wallet_verification_challenges; ts timestamptz;
begin
  select * into c from public.wallet_verification_challenges where id = p_id for update;
  ts := clock_timestamp();
  if not found or c.user_id is distinct from p_user then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND'); end if;
  if c.consumed_at is not null then return jsonb_build_object('ok', false, 'code', 'CONSUMED'); end if;
  if c.expires_at <= ts then return jsonb_build_object('ok', false, 'code', 'EXPIRED'); end if;
  if c.normalized_address <> p_normalized then return jsonb_build_object('ok', false, 'code', 'ADDRESS_MISMATCH'); end if;
  begin
    update public.wallet_verification_challenges set consumed_at = ts where id = c.id;
    update public.user_wallets set is_primary = false, updated_at = ts where user_id = p_user and is_primary and normalized_address <> c.normalized_address;
    insert into public.user_wallets (user_id, address, normalized_address, is_verified, is_primary, verified_at, last_seen_at)
      values (p_user, c.wallet_address, c.normalized_address, true, true, ts, ts)
    on conflict (user_id, normalized_address) do update set address = excluded.address, is_verified = true, is_primary = true,
      verified_at = coalesce(public.user_wallets.verified_at, excluded.verified_at), last_seen_at = excluded.last_seen_at, updated_at = ts;
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'code', 'ALREADY_LINKED');
  end;
  return jsonb_build_object('ok', true, 'address', c.wallet_address, 'verified_at', ts);
end $$;

create or replace function public.wallet_log(p_event text, p_user uuid, p_details jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_event not in ('WALLET_CONNECTION_STARTED','WALLET_CONNECTED','WALLET_VERIFICATION_REQUESTED','WALLET_VERIFICATION_FAILED','WALLET_VERIFIED','WALLET_DISCONNECTED') then
    raise exception 'INVALID_EVENT';
  end if;
  insert into public.auth_events (event, user_id, details) values (p_event, p_user, coalesce(p_details, '{}'::jsonb));
end $$;

revoke execute on function public.wallet_touch(uuid, text) from public, anon, authenticated;
revoke execute on function public.wallet_issue_challenge(uuid, text) from public, anon, authenticated;
revoke execute on function public.wallet_get_challenge(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.wallet_consume_and_verify(uuid, uuid, text) from public, anon, authenticated;
revoke execute on function public.wallet_log(text, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.wallet_touch(uuid, text) to service_role;
grant execute on function public.wallet_issue_challenge(uuid, text) to service_role;
grant execute on function public.wallet_get_challenge(uuid, uuid) to service_role;
grant execute on function public.wallet_consume_and_verify(uuid, uuid, text) to service_role;
grant execute on function public.wallet_log(text, uuid, jsonb) to service_role;