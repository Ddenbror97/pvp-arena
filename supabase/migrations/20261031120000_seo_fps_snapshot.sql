begin;
set local lock_timeout = '3s';
set local statement_timeout = '15s';

-- Bounded, index-backed public result sample; no private/practice/forfeit rows.
create index if not exists fps_public_score_completed
on public.fps_matches (completed_at desc, id desc)
where status='COMPLETED' and not private and stake>0 and reason='ROUNDS' and result_recorded;

create function public.seo_fps_snapshot() returns jsonb
language sql stable security invoker set search_path = public
set statement_timeout = '2500ms'
as $$
  with sample as materialized (
    select id,stake,best_of,score_a,score_b,payout_amount,fee_amount,completed_at
    from public.fps_matches
    where status='COMPLETED' and not private and stake>0 and reason='ROUNDS' and result_recorded
      and completed_at >= now()-interval '30 days'
    order by completed_at desc,id desc limit 100
  )
  select jsonb_build_object(
    'generatedAt',now(),'windowDays',30,'sampleLimit',100,
    'config',(select jsonb_build_object('enabled',enabled,'cashEnabled',cash_enabled,
      'practiceAllowed',practice_allowed,'feeBps',fee_bps,'stakes',stakes) from public.fps_config where id=1),
    'matches',(select count(*) from sample),
    'potCents',(select coalesce(sum(stake*2),0)::text from sample),
    'recent',(select coalesce(jsonb_agg(jsonb_build_object(
      'stake',stake,'bestOf',best_of,'scoreA',score_a,'scoreB',score_b,
      'payout',payout_amount,'fee',fee_amount,'completedAt',completed_at)
      order by completed_at desc,id desc),'[]'::jsonb)
      from (select * from sample order by completed_at desc,id desc limit 8) r)
  );
$$;
revoke all on function public.seo_fps_snapshot() from public,anon,authenticated;
grant execute on function public.seo_fps_snapshot() to service_role;
comment on function public.seo_fps_snapshot() is 'Server-only bounded SEO sample: public paid ROUNDS settlements only, no identifiers.';
commit;
