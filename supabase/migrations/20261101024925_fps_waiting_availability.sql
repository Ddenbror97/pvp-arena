begin;

-- An authenticated tab leases its own waiting seat. No public presence/table access.
create table fps_private.waiting_presence (
  match_id uuid primary key references public.fps_matches(id) on delete cascade,
  seen_at timestamptz not null default clock_timestamp()
);
alter table fps_private.waiting_presence enable row level security;
revoke all on fps_private.waiting_presence from public,anon,authenticated,service_role;

create table fps_private.ready_windows (
  match_id uuid primary key references public.fps_matches(id) on delete cascade,
  deadline timestamptz not null,
  started_at timestamptz
);
alter table fps_private.ready_windows enable row level security;
revoke all on fps_private.ready_windows from public,anon,authenticated,service_role;

-- Online creators may browse or warm up; absolute cap still prevents indefinite holds.
alter table public.fps_matches alter column expires_at set default clock_timestamp()+interval '24 hours';

create function fps_private.guard_available_join() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if old.status='WAITING' and new.status='FUNDED' then
    if coalesce((select seen_at from fps_private.waiting_presence where match_id=old.id),old.created_at)
        <=clock_timestamp()-interval '120 seconds' then
      raise exception 'CREATOR_AWAY';
    end if;
    insert into fps_private.ready_windows(match_id,deadline)
      values(old.id,clock_timestamp()+interval '60 seconds');
  end if;
  return new;
end $$;
revoke all on function fps_private.guard_available_join() from public,anon,authenticated,service_role;
create trigger fps_available_join before update on public.fps_matches
for each row execute function fps_private.guard_available_join();

create function public.fps_queue_status() returns jsonb
language plpgsql security definer set search_path=public as $$
declare u uuid:=public._fps_user(); g fps_matches; cash jsonb; practice jsonb; closed uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended('fps-user:'||u,0));
  select * into g from fps_matches where (creator_id=u or opponent_id=u)
    and status in ('WAITING','FUNDED') order by created_at desc limit 1 for update;
  if found then
    if g.status='WAITING' and (g.expires_at<=clock_timestamp() or
      coalesce((select seen_at from fps_private.waiting_presence where match_id=g.id),g.created_at)
        <=clock_timestamp()-interval '120 seconds') then
      perform public._fps_refund(g.id,'WAITING_EXPIRED');
      closed:=g.id;
    else
      if g.status='WAITING' and g.creator_id=u then
        insert into fps_private.waiting_presence(match_id) values(g.id)
        on conflict(match_id) do update set seen_at=excluded.seen_at
          where fps_private.waiting_presence.seen_at<clock_timestamp()-interval '20 seconds';
      end if;
      cash:=public._fps_json(g.id,u)||jsonb_build_object('ready_deadline',
        (select deadline from fps_private.ready_windows where match_id=g.id and started_at is null));
    end if;
  end if;
  select fps_private.practice_json(id) into practice from fps_private.practice_matches
    where owner_id=u and status='FUNDED' and expires_at>clock_timestamp();
  return jsonb_build_object('cash',cash,'practice',practice,'closed',closed);
end $$;
revoke all on function public.fps_queue_status() from public,anon,authenticated,service_role;
grant execute on function public.fps_queue_status() to authenticated;

-- Change only the cash WAITING exclusion: practice still cannot overlap active cash play.
do $$
declare definition text:=pg_get_functiondef('public.fps_practice_start(text)'::regprocedure);
  original text:='from fps_matches where status in (''WAITING'',''FUNDED'')';
begin
  if strpos(definition,original)=0 then raise exception 'Unexpected practice function'; end if;
  execute replace(definition,original,'from fps_matches where status=''FUNDED''');
end $$;

create or replace function public.fps_lobby() returns jsonb
language plpgsql security definer set search_path=public as $$
declare result jsonb:=fps_private.fps_lobby(); p jsonb;
begin
  if auth.uid() is not null then
    select fps_private.practice_json(id) into p from fps_private.practice_matches
      where owner_id=auth.uid() and status='FUNDED' and expires_at>clock_timestamp();
    result:=result||jsonb_build_object('practice',p);
    if result->>'mine' is null and p is not null then result:=jsonb_set(result,'{mine}',p); end if;
  end if;
  result:=jsonb_set(result,'{open}',coalesce((select jsonb_agg(r) from jsonb_array_elements(result->'open') r
    join fps_matches m on m.id=(r->>'id')::uuid
    left join fps_private.waiting_presence p on p.match_id=m.id
    where (r->>'stake')::bigint>0 and coalesce(p.seen_at,m.created_at)>clock_timestamp()-interval '120 seconds'),'[]'::jsonb));
  return result;
end $$;

-- The runtime commits this once, before the first countdown, never on the hot tick path.
create function public.fps_mark_started(p_match uuid,p_runtime text) returns void
language plpgsql security definer set search_path=public as $$
declare g fps_matches; w fps_private.ready_windows;
begin
  if auth.jwt()->>'role' is distinct from 'service_role' then raise exception 'FORBIDDEN'; end if;
  select * into strict g from fps_matches where id=p_match for update;
  if g.status<>'FUNDED' or p_runtime is distinct from p_match::text then raise exception 'MATCH_NOT_READY'; end if;
  select * into w from fps_private.ready_windows where match_id=p_match;
  if found and w.started_at is null then
    if w.deadline<=clock_timestamp() then raise exception 'READY_WINDOW_EXPIRED'; end if;
    update fps_private.ready_windows set started_at=clock_timestamp() where match_id=p_match;
  end if;
end $$;
revoke all on function public.fps_mark_started(uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.fps_mark_started(uuid,text) to service_role;

create or replace function public.fps_expire(p_limit int default 100) returns jsonb
language plpgsql security definer set search_path=public as $$
declare g fps_matches; n int:=0;
begin
  if auth.jwt()->>'role' is distinct from 'service_role' then raise exception 'FORBIDDEN'; end if;
  if p_limit is null or p_limit not between 1 and 100 then raise exception 'INVALID_LIMIT'; end if;
  for g in select m.* from fps_matches m
    left join fps_private.waiting_presence p on p.match_id=m.id
    left join fps_private.ready_windows w on w.match_id=m.id
    where m.status in ('WAITING','FUNDED') and not m.result_recorded and
      (m.expires_at<=clock_timestamp() or
       (m.status='WAITING' and coalesce(p.seen_at,m.created_at)<=clock_timestamp()-interval '120 seconds') or
       (m.status='FUNDED' and w.started_at is null and w.deadline<=clock_timestamp()))
    order by m.expires_at,m.id limit p_limit for update of m skip locked loop
    perform public._fps_refund(g.id,case when g.status='WAITING' then 'WAITING_EXPIRED'
      when g.expires_at<=clock_timestamp() then 'SERVER_RESTART' else 'NO_SHOW' end);
    n:=n+1;
  end loop;
  return jsonb_build_object('expired',n);
end $$;

commit;
