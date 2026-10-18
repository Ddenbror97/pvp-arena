-- Admin list of account sign-ups. Email and balance stay behind the admin
-- role, live session, and PIN step-up. No passwords, seeds, or metadata blobs.

create or replace function public.admin_signups(p_args jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  day_start timestamptz := date_trunc('day', now() at time zone 'utc') at time zone 'utc';
  lim int := 25;
  v_q text;
  v_escaped text;
  v_range text;
  v_since timestamptz;
  v_cursor_at timestamptz;
  v_cursor_id uuid;
  rows jsonb;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'FORBIDDEN';
  end if;
  perform public._assert_live_session();
  perform public._require_admin_stepup();
  if p_args is null then p_args := '{}'::jsonb; end if;

  begin
    if coalesce(p_args->>'limit', '') <> '' then
      if p_args->>'limit' !~ '^[0-9]{1,3}$' then raise exception 'BAD_REQUEST'; end if;
      lim := (p_args->>'limit')::int;
    end if;
    if lim < 1 or lim > 50 then lim := 25; end if;

    v_range := nullif(lower(coalesce(p_args->>'range', '')), '');
    if v_range is null then v_range := 'all'; end if;
    if v_range not in ('today', 'week', 'month', 'all') then raise exception 'BAD_REQUEST'; end if;
    v_since := case v_range
      when 'today' then day_start
      when 'week' then clock_timestamp() - interval '7 days'
      when 'month' then clock_timestamp() - interval '30 days'
      else null
    end;

    v_q := nullif(btrim(left(coalesce(p_args->>'q', ''), 80)), '');
    if v_q is not null and char_length(v_q) < 2 then v_q := null; end if;
    v_escaped := case when v_q is null then null
      else replace(replace(replace(v_q, chr(92), chr(92) || chr(92)), '%', chr(92) || '%'), '_', chr(92) || '_') end;

    if coalesce(p_args->>'cursor', '') <> '' then
      if p_args->>'cursor' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
        raise exception 'BAD_REQUEST';
      end if;
      if coalesce(p_args->>'cursor_at', '') !~ '^[0-9]{4}-' then raise exception 'BAD_REQUEST'; end if;
      v_cursor_id := (p_args->>'cursor')::uuid;
      v_cursor_at := (p_args->>'cursor_at')::timestamptz;
    end if;
  exception
    when invalid_text_representation or datetime_field_overflow then
      raise exception 'BAD_REQUEST';
  end;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc, x.id desc), '[]'::jsonb)
  into rows
  from (
    select u.id,
           coalesce(pr.username, nullif(u.raw_user_meta_data->>'username', '')) as username,
           u.email,
           u.created_at,
           u.email_confirmed_at as confirmed_at,
           u.last_sign_in_at,
           coalesce(w.balance, 0) as balance_cents
    from auth.users u
    left join public.profiles pr on pr.id = u.id
    left join public.wallet_accounts w
      on w.owner_id = u.id
     and w.kind = 'user_available'
     and w.asset = 'USD'
     and w.account_type = 'real'
    where (v_since is null or u.created_at >= v_since)
      and (
        v_escaped is null
        or pr.username ilike '%' || v_escaped || '%' escape chr(92)
        or coalesce(u.raw_user_meta_data->>'username', '') ilike '%' || v_escaped || '%' escape chr(92)
        or (u.email is not null and u.email ilike '%' || v_escaped || '%' escape chr(92))
      )
      and (
        v_cursor_at is null
        or u.created_at < v_cursor_at
        or (u.created_at = v_cursor_at and u.id < v_cursor_id)
      )
    order by u.created_at desc, u.id desc
    limit lim
  ) x;

  return jsonb_build_object(
    'today', (select count(*) from auth.users where created_at >= day_start),
    'week', (select count(*) from auth.users where created_at >= clock_timestamp() - interval '7 days'),
    'month', (select count(*) from auth.users where created_at >= clock_timestamp() - interval '30 days'),
    'total', (select count(*) from auth.users),
    'pending', (select count(*) from auth.users where email_confirmed_at is null),
    'rows', rows,
    'next', case
      when jsonb_array_length(rows) = lim then jsonb_build_object(
        'id', rows->(lim - 1)->>'id',
        'created_at', rows->(lim - 1)->>'created_at'
      )
      else null
    end
  );
exception
  when others then
    if sqlerrm in ('FORBIDDEN', 'BAD_REQUEST', 'SESSION_REVOKED', 'SESSION_EXPIRED', 'ADMIN_STEP_UP') then
      raise;
    end if;
    raise warning 'admin_signups failed: %', left(sqlerrm, 200);
    raise exception 'ADMIN_UNAVAILABLE' using errcode = 'XX000';
end $$;

revoke all on function public.admin_signups(jsonb) from public, anon;
grant execute on function public.admin_signups(jsonb) to authenticated;
