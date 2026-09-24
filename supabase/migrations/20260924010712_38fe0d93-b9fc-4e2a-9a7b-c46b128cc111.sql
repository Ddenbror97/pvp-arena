create table public.game_chat_messages (
  id uuid primary key default gen_random_uuid(),
  game_type text not null check (game_type in ('jackpot','coinflip')),
  user_id uuid not null references public.profiles(id) on delete cascade,
  message text not null check (char_length(message) between 1 and 500),
  status text not null default 'visible' check (status in ('visible','hidden','deleted')),
  moderation_reason text,
  -- Reserved for future moderation providers. NOT an authoritative or standardised safety score.
  moderation_score numeric,
  moderation_categories text[],
  moderation_provider text,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  moderated_at timestamptz,
  moderated_by uuid
);
create index game_chat_room_idx on public.game_chat_messages (game_type, created_at desc, id desc) where status = 'visible';
create index game_chat_user_idx on public.game_chat_messages (user_id, created_at desc);
create index game_chat_status_idx on public.game_chat_messages (status, created_at desc);
grant select on public.game_chat_messages to authenticated;
grant all on public.game_chat_messages to service_role;
alter table public.game_chat_messages enable row level security;
create policy "chat read visible" on public.game_chat_messages for select to authenticated using (status = 'visible');

create table public.game_chat_user_restrictions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  muted_until timestamptz,
  banned boolean not null default false,
  reason text,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant all on public.game_chat_user_restrictions to service_role;
alter table public.game_chat_user_restrictions enable row level security;

create table public.game_chat_moderation_events (
  id bigint generated always as identity primary key,
  message_id uuid references public.game_chat_messages(id) on delete set null,
  user_id uuid,
  action text not null check (action in ('BLOCKED','HIDDEN','RESTORED','DELETED','MUTED','UNMUTED','BANNED','UNBANNED','RATE_LIMITED','SPAM_DETECTED')),
  reason_code text,
  moderator_id uuid,
  created_at timestamptz not null default now()
);
create index game_chat_events_user_idx on public.game_chat_moderation_events (user_id, created_at desc);
grant all on public.game_chat_moderation_events to service_role;
alter table public.game_chat_moderation_events enable row level security;

-- Server-authoritative send. Called only by the trusted server with the session's user id.
create or replace function public.chat_send(p_user uuid, p_game text, p_message text, p_severity text, p_reason text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_now timestamptz := clock_timestamp();
  v_r public.game_chat_user_restrictions;
  v_id uuid;
  v_status text;
begin
  if p_user is null or p_game not in ('jackpot','coinflip') or p_message is null
     or char_length(p_message) < 1 or char_length(p_message) > 500
     or p_severity not in ('LOW','MEDIUM','HIGH') then
    return jsonb_build_object('ok', false, 'code', 'CHAT_INVALID');
  end if;
  if not exists (select 1 from public.profiles where id = p_user) then
    return jsonb_build_object('ok', false, 'code', 'CHAT_INVALID');
  end if;
  -- Serialise each user's sends so parallel requests cannot slip past the limits.
  perform pg_advisory_xact_lock(hashtext('chat:' || p_user::text));

  select * into v_r from public.game_chat_user_restrictions where user_id = p_user;
  if found and v_r.banned then
    return jsonb_build_object('ok', false, 'code', 'CHAT_MUTED');
  end if;
  if found and v_r.muted_until is not null and v_r.muted_until > v_now then
    return jsonb_build_object('ok', false, 'code', 'CHAT_MUTED');
  end if;

  if (select count(*) from public.game_chat_messages where user_id = p_user and created_at > v_now - interval '10 seconds') >= 5
     or (select count(*) from public.game_chat_messages where user_id = p_user and created_at > v_now - interval '1 minute') >= 20
     or (select count(*) from public.game_chat_messages where user_id = p_user and created_at > v_now - interval '1 hour') >= 100 then
    insert into public.game_chat_moderation_events (user_id, action, reason_code) values (p_user, 'RATE_LIMITED', 'rate');
    return jsonb_build_object('ok', false, 'code', 'CHAT_RATE_LIMITED');
  end if;

  if exists (select 1 from public.game_chat_messages
             where user_id = p_user and game_type = p_game and lower(message) = lower(p_message)
               and created_at > v_now - interval '30 seconds') then
    insert into public.game_chat_moderation_events (user_id, action, reason_code) values (p_user, 'SPAM_DETECTED', 'duplicate');
    return jsonb_build_object('ok', false, 'code', 'CHAT_RATE_LIMITED');
  end if;

  v_status := case when p_severity = 'LOW' then 'visible' else 'hidden' end;
  insert into public.game_chat_messages (game_type, user_id, message, status, moderation_reason, moderation_provider, created_at, moderated_at)
  values (p_game, p_user, p_message, v_status, nullif(p_reason, ''), 'rules', v_now, case when v_status = 'hidden' then v_now end)
  returning id into v_id;

  if p_severity = 'HIGH' then
    insert into public.game_chat_moderation_events (message_id, user_id, action, reason_code) values (v_id, p_user, 'BLOCKED', p_reason);
    return jsonb_build_object('ok', false, 'code', 'CHAT_BLOCKED');
  elsif p_severity = 'MEDIUM' then
    insert into public.game_chat_moderation_events (message_id, user_id, action, reason_code) values (v_id, p_user, 'HIDDEN', p_reason);
    return jsonb_build_object('ok', false, 'code', 'CHAT_BLOCKED');
  end if;
  return jsonb_build_object('ok', true, 'id', v_id, 'created_at', v_now);
end $$;

-- Moderator-ready helpers (no UI yet). Service role only.
create or replace function public.chat_set_status(p_message uuid, p_status text, p_moderator uuid, p_reason text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_row public.game_chat_messages;
begin
  if p_status not in ('visible','hidden','deleted') then return jsonb_build_object('ok', false, 'code', 'CHAT_INVALID'); end if;
  select * into v_row from public.game_chat_messages where id = p_message for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND'); end if;
  if v_row.status = p_status then return jsonb_build_object('ok', true, 'unchanged', true); end if;
  update public.game_chat_messages
     set status = p_status, moderated_at = clock_timestamp(), moderated_by = p_moderator,
         moderation_reason = coalesce(nullif(p_reason, ''), moderation_reason),
         deleted_at = case when p_status = 'deleted' then clock_timestamp() else deleted_at end
   where id = p_message;
  insert into public.game_chat_moderation_events (message_id, user_id, action, reason_code, moderator_id)
  values (p_message, v_row.user_id, case p_status when 'visible' then 'RESTORED' when 'hidden' then 'HIDDEN' else 'DELETED' end, p_reason, p_moderator);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.chat_set_restriction(p_user uuid, p_muted_until timestamptz, p_banned boolean, p_moderator uuid, p_reason text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_old public.game_chat_user_restrictions;
begin
  if not exists (select 1 from public.profiles where id = p_user) then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND'); end if;
  select * into v_old from public.game_chat_user_restrictions where user_id = p_user for update;
  insert into public.game_chat_user_restrictions (user_id, muted_until, banned, reason, updated_by)
  values (p_user, p_muted_until, coalesce(p_banned, false), p_reason, p_moderator)
  on conflict (user_id) do update set muted_until = excluded.muted_until, banned = excluded.banned,
    reason = excluded.reason, updated_by = excluded.updated_by, updated_at = now();
  if coalesce(p_banned, false) <> coalesce(v_old.banned, false) then
    insert into public.game_chat_moderation_events (user_id, action, reason_code, moderator_id)
    values (p_user, case when p_banned then 'BANNED' else 'UNBANNED' end, p_reason, p_moderator);
  end if;
  if p_muted_until is distinct from v_old.muted_until then
    insert into public.game_chat_moderation_events (user_id, action, reason_code, moderator_id)
    values (p_user, case when p_muted_until is not null and p_muted_until > now() then 'MUTED' else 'UNMUTED' end, p_reason, p_moderator);
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- Database-triggered broadcast. Delivery failure must never roll back persistence.
create or replace function public._chat_broadcast()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_p public.profiles;
begin
  begin
    if new.status = 'visible' and (tg_op = 'INSERT' or old.status <> 'visible') then
      select * into v_p from public.profiles where id = new.user_id;
      perform realtime.send(
        jsonb_build_object('id', new.id, 'game_type', new.game_type, 'user_id', new.user_id,
          'display_name', v_p.username, 'avatar_url', v_p.avatar_url,
          'avatar_initials', upper(left(coalesce(v_p.username, '?'), 2)),
          'message', new.message, 'created_at', new.created_at),
        'message', 'chat:' || new.game_type, true);
    elsif tg_op = 'UPDATE' and old.status = 'visible' and new.status <> 'visible' then
      perform realtime.send(jsonb_build_object('id', new.id), 'removed', 'chat:' || new.game_type, true);
    end if;
  exception when others then
    raise warning 'chat broadcast failed: %', sqlstate;
  end;
  return null;
end $$;
create trigger game_chat_broadcast after insert or update of status on public.game_chat_messages
  for each row execute function public._chat_broadcast();

revoke all on function public.chat_send(uuid, text, text, text, text) from public, anon, authenticated;
revoke all on function public.chat_set_status(uuid, text, uuid, text) from public, anon, authenticated;
revoke all on function public.chat_set_restriction(uuid, timestamptz, boolean, uuid, text) from public, anon, authenticated;
revoke all on function public._chat_broadcast() from public, anon, authenticated;
grant execute on function public.chat_send(uuid, text, text, text, text) to service_role;
grant execute on function public.chat_set_status(uuid, text, uuid, text) to service_role;
grant execute on function public.chat_set_restriction(uuid, timestamptz, boolean, uuid, text) to service_role;

-- realtime-auth:begin
-- Private chat rooms: signed-in users may RECEIVE on the two chat topics and use presence there.
-- There is deliberately NO insert policy for broadcast: browsers cannot publish chat messages.
create policy "chat rooms receive" on realtime.messages for select to authenticated
  using (realtime.topic() in ('chat:jackpot', 'chat:coinflip') and realtime.messages.extension in ('broadcast', 'presence'));
create policy "chat rooms presence" on realtime.messages for insert to authenticated
  with check (realtime.topic() in ('chat:jackpot', 'chat:coinflip') and realtime.messages.extension = 'presence');
-- realtime-auth:end