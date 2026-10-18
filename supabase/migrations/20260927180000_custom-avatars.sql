-- Custom avatar uploads. The Worker validates, normalizes and checks every
-- upload in one request; only then does it store the final 256×256 WebP and
-- call avatar_activate. Originals are never stored. Browser roles cannot
-- write the bucket, the table or profiles.avatar_url directly.
-- profiles.avatar_url stays the single public reference every surface reads.

-- prod-only:begin
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 262144, array['image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = 262144, allowed_mime_types = array['image/webp'];
-- prod-only:end

create table public.user_avatars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'processing'
    check (status in ('processing', 'active', 'replaced', 'removed', 'superseded', 'rejected', 'failed')),
  reject_reason text check (reject_reason is null or reject_reason ~ '^[A-Z_]{2,40}$'),
  storage_path text unique check (storage_path is null or storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$'),
  width int check (width is null or width between 1 and 1024),
  height int check (height is null or height between 1 and 1024),
  mime_type text check (mime_type is null or mime_type = 'image/webp'),
  file_size_bytes int check (file_size_bytes is null or file_size_bytes between 1 and 262144),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index user_avatars_user_created on public.user_avatars (user_id, created_at desc);
create unique index user_avatars_one_active on public.user_avatars (user_id) where status = 'active';
create unique index user_avatars_one_processing on public.user_avatars (user_id) where status = 'processing';

alter table public.user_avatars enable row level security;
revoke all on public.user_avatars from public, anon, authenticated;
grant all on public.user_avatars to service_role;
grant select (id, status, width, height, mime_type, file_size_bytes, created_at, updated_at) on public.user_avatars to authenticated;
create policy "own avatar uploads" on public.user_avatars for select to authenticated using (user_id = auth.uid());

-- Paths of files no longer referenced; cleared here, deleted from storage by the caller.
create or replace function public.avatar_take_stale_paths(p_user uuid) returns text[]
language plpgsql security definer set search_path = '' as $$
declare paths text[];
begin
  select coalesce(array_agg(storage_path), '{}') into paths
  from public.user_avatars where user_id = p_user and status <> 'active' and storage_path is not null;
  update public.user_avatars set storage_path = null, updated_at = now()
  where user_id = p_user and status <> 'active' and storage_path is not null;
  return paths;
end $$;

-- Marks earlier in-flight uploads superseded and opens a new one. 10/hour, 30/day.
create or replace function public.avatar_begin(p_user uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  perform 1 from public.profiles where id = p_user for update;
  if not found then raise exception 'AUTH_REQUIRED'; end if;
  if (select count(*) from public.user_avatars where user_id = p_user and created_at > now() - interval '1 hour') >= 10
     or (select count(*) from public.user_avatars where user_id = p_user and created_at > now() - interval '1 day') >= 30 then
    raise exception 'RATE_LIMITED';
  end if;
  update public.user_avatars set status = 'superseded', updated_at = now()
  where user_id = p_user and status = 'processing';
  insert into public.user_avatars (user_id) values (p_user) returning id into v_id;
  return v_id;
end $$;

create or replace function public.avatar_fail(p_id uuid, p_status text, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_status not in ('rejected', 'failed') then raise exception 'INVALID_STATUS'; end if;
  update public.user_avatars set status = p_status, reject_reason = p_reason, updated_at = now()
  where id = p_id and status = 'processing';
end $$;

-- Activates an upload only if it is still the user's latest in-flight upload.
create or replace function public.avatar_activate(p_id uuid, p_path text, p_url text, p_width int, p_height int, p_bytes int)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid; v_status text;
begin
  select user_id, status into v_user, v_status from public.user_avatars where id = p_id;
  if v_user is null then raise exception 'NOT_FOUND'; end if;
  perform 1 from public.profiles where id = v_user for update;
  select status into v_status from public.user_avatars where id = p_id;
  if v_status <> 'processing' then
    return jsonb_build_object('activated', false);
  end if;
  if p_path is distinct from (v_user::text || '/' || p_id::text || '.webp')
     or p_url !~ ('^https://[A-Za-z0-9.-]+(:[0-9]+)?/storage/v1/object/public/avatars/' || v_user::text || '/' || p_id::text || '\.webp$')
     or length(p_url) > 500 then
    raise exception 'INVALID_AVATAR';
  end if;
  update public.user_avatars set status = 'replaced', updated_at = now() where user_id = v_user and status = 'active';
  update public.user_avatars
    set status = 'active', storage_path = p_path, width = p_width, height = p_height,
        mime_type = 'image/webp', file_size_bytes = p_bytes, updated_at = now()
  where id = p_id;
  update public.profiles set avatar_url = p_url where id = v_user;
  return jsonb_build_object('activated', true, 'stale_paths', to_jsonb(public.avatar_take_stale_paths(v_user)));
end $$;

-- Back to the default avatar; cancels anything in flight.
create or replace function public.avatar_remove(p_user uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_name text;
begin
  select username into v_name from public.profiles where id = p_user for update;
  if v_name is null then raise exception 'AUTH_REQUIRED'; end if;
  update public.user_avatars set status = 'superseded', updated_at = now() where user_id = p_user and status = 'processing';
  update public.user_avatars set status = 'removed', updated_at = now() where user_id = p_user and status = 'active';
  update public.profiles set avatar_url = 'https://api.dicebear.com/9.x/shapes/svg?seed=' || v_name where id = p_user;
  return jsonb_build_object('stale_paths', to_jsonb(public.avatar_take_stale_paths(p_user)));
end $$;

-- Built-in avatar pick. Same allowlist as update_avatar; also cancels uploads.
create or replace function public.avatar_set_preset(p_user uuid, p_avatar_url text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if p_avatar_url is null or length(p_avatar_url) > 200
     or p_avatar_url !~ '^https://api\.dicebear\.com/9\.x/(shapes|rings|glass|identicon|bottts-neutral|thumbs)/svg\?seed=[A-Za-z0-9_]{1,40}$' then
    raise exception 'INVALID_AVATAR';
  end if;
  perform 1 from public.profiles where id = p_user for update;
  if not found then raise exception 'AUTH_REQUIRED'; end if;
  update public.user_avatars set status = 'superseded', updated_at = now() where user_id = p_user and status = 'processing';
  update public.user_avatars set status = 'replaced', updated_at = now() where user_id = p_user and status = 'active';
  update public.profiles set avatar_url = p_avatar_url where id = p_user;
  return jsonb_build_object('stale_paths', to_jsonb(public.avatar_take_stale_paths(p_user)));
end $$;

-- The browser RPC keeps working and now also cancels in-flight uploads.
create or replace function public.update_avatar(p_avatar_url text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_avatar_url is null or length(p_avatar_url) > 200
     or p_avatar_url !~ '^https://api\.dicebear\.com/9\.x/(shapes|rings|glass|identicon|bottts-neutral|thumbs)/svg\?seed=[A-Za-z0-9_]{1,40}$' then
    raise exception 'INVALID_AVATAR';
  end if;
  perform 1 from profiles where id = auth.uid() for update;
  update user_avatars set status = 'superseded', updated_at = now() where user_id = auth.uid() and status = 'processing';
  update user_avatars set status = 'replaced', updated_at = now() where user_id = auth.uid() and status = 'active';
  update profiles set avatar_url = p_avatar_url where id = auth.uid();
end $$;

revoke execute on function public.avatar_take_stale_paths(uuid) from public, anon, authenticated;
revoke execute on function public.avatar_begin(uuid) from public, anon, authenticated;
revoke execute on function public.avatar_fail(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.avatar_activate(uuid, text, text, int, int, int) from public, anon, authenticated;
revoke execute on function public.avatar_remove(uuid) from public, anon, authenticated;
revoke execute on function public.avatar_set_preset(uuid, text) from public, anon, authenticated;
grant execute on function public.avatar_take_stale_paths(uuid) to service_role;
grant execute on function public.avatar_begin(uuid) to service_role;
grant execute on function public.avatar_fail(uuid, text, text) to service_role;
grant execute on function public.avatar_activate(uuid, text, text, int, int, int) to service_role;
grant execute on function public.avatar_remove(uuid) to service_role;
grant execute on function public.avatar_set_preset(uuid, text) to service_role;
revoke execute on function public.update_avatar(text) from public, anon;
grant execute on function public.update_avatar(text) to authenticated;
