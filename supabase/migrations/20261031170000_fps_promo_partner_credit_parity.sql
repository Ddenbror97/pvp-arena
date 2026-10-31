-- Let FPS use the same controlled promo, referral, leaderboard-prize and
-- partner-credit accounting already used by pool and poker.
--
-- Entries still debit the user's real USD wallet. The existing withdraw-basis
-- ledger records the eligible/bonus split, settlement returns the same mixed
-- basis to the winner, and the completed-match hooks advance playthrough and
-- partner-profit holds. This changes eligibility, not ledger conservation.

begin;

alter table public.promo_wagers drop constraint if exists promo_wagers_game_check;
alter table public.promo_wagers add constraint promo_wagers_game_check
  check (game in ('jackpot', 'coinflip', 'roulette', 'slott', 'poker', 'pool', 'fps'));
alter table public.referral_reward_wagers drop constraint if exists referral_reward_wagers_game_check;
alter table public.referral_reward_wagers add constraint referral_reward_wagers_game_check
  check (game in ('jackpot', 'coinflip', 'roulette', 'slott', 'poker', 'pool', 'fps'));
alter table public.leaderboard_prize_wagers drop constraint if exists leaderboard_prize_wagers_game_check;
alter table public.leaderboard_prize_wagers add constraint leaderboard_prize_wagers_game_check
  check (game in ('jackpot', 'coinflip', 'roulette', 'slott', 'poker', 'pool', 'fps'));
alter table public.referral_play_events drop constraint if exists referral_play_events_game_check;
alter table public.referral_play_events add constraint referral_play_events_game_check
  check (game in ('jackpot', 'coinflip', 'roulette', 'slott', 'poker', 'pool', 'fps'));
alter table public.partner_profit_events drop constraint if exists partner_profit_events_game_check;
alter table public.partner_profit_events add constraint partner_profit_events_game_check
  check (game in ('coinflip', 'jackpot', 'slott', 'poker', 'pool', 'fps'));

create or replace function public._fps_debit(p_match uuid,p_user uuid,p_slot int,p_key text) returns void
language plpgsql security definer set search_path = public as $$
declare g fps_matches; tx uuid; a uuid; l uuid; bal bigint;
begin
  select * into strict g from fps_matches where id=p_match;
  if g.stake>0 then
    perform public._coinflip_lock_wallets(array[p_user],g.asset,g.account_type);
    a := public._user_account(p_user,'user_available',g.asset,g.account_type);
    l := public._user_account(p_user,'user_locked',g.asset,g.account_type);
    select balance into bal from wallet_accounts where id=a;
    if a is null or l is null or bal is null or bal<g.stake then raise exception 'INSUFFICIENT_BALANCE'; end if;
    insert into ledger_transactions(kind,idempotency_key,account_type,user_id,game_id,memo)
      values('fps_entry','fps:'||g.id||':entry:'||p_slot,g.account_type,p_user,g.ledger_game_id,'FPS stake')
      returning id into tx;
    perform public._post(tx,a,-g.stake);
    perform public._post(tx,l,g.stake);
    perform public._withdraw_basis_sync();
  end if;
  insert into fps_entries(match_id,user_id,slot,amount,ledger_tx_id,idempotency_key)
    values(g.id,p_user,p_slot,g.stake,tx,p_key);
  insert into fps_audit(match_id,action,actor_id,details,ledger_tx_id)
    values(g.id,case when p_slot=1 then 'CREATED' else 'JOINED' end,p_user,
      jsonb_build_object('stake',g.stake,'best_of',g.best_of,'fee_bps',g.fee_bps),tx);
end $$;

create or replace function public._playthrough_stake(p_user uuid, p_game text, p_source text)
returns bigint language plpgsql stable security definer set search_path = public as $$
declare stake bigint;
begin
  if p_user is null or p_source is null or length(p_source) > 80 then return null; end if;
  if p_game = 'slott' then
    select e.amount into stake from public.slot_entries e join public.slot_games g on g.id=e.game_id
      where e.id=p_source::uuid and e.user_id=p_user and e.amount>0 and g.status='COMPLETED';
    return stake;
  end if;
  if p_game = 'poker' then
    if split_part(p_source,':',2)::uuid is distinct from p_user then return null; end if;
    select hp.wagered into stake from public.poker_hand_players hp join public.poker_hands h on h.id=hp.hand_id
      where hp.hand_id=split_part(p_source,':',1)::bigint and hp.user_id=p_user and hp.wagered>0
        and h.status='COMPLETED' and h.account_type='real' and coalesce(array_length(h.board,1),0)>=3;
    return stake;
  end if;
  if p_game = 'pool' then
    if split_part(p_source,':',2)::uuid is distinct from p_user then return null; end if;
    select e.amount into stake from public.pool_entries e join public.pool_matches g on g.id=e.match_id
      where e.match_id=split_part(p_source,':',1)::bigint and e.user_id=p_user and e.amount>0
        and g.status='COMPLETED' and g.account_type='real';
    return stake;
  end if;
  if p_game = 'fps' then
    if split_part(p_source,':',2)::uuid is distinct from p_user then return null; end if;
    select e.amount into stake
      from public.fps_entries e join public.fps_matches g on g.id=e.match_id
      where g.ledger_game_id=split_part(p_source,':',1)::bigint and e.user_id=p_user and e.amount>0
        and g.status='COMPLETED' and g.account_type='real';
    return stake;
  end if;
  if p_game not in ('jackpot','coinflip','roulette') then return null; end if;
  return public.referral_settled_stake(p_user,p_game,p_source);
exception when invalid_text_representation or numeric_value_out_of_range then return null;
end $$;
revoke all on function public._playthrough_stake(uuid,text,text) from public,anon,authenticated;

create or replace function public._fps_completed_hooks() returns trigger
language plpgsql security definer set search_path = public as $$
declare e record; loser uuid; tx uuid;
begin
  if new.account_type<>'real' or new.winner_id is null then return null; end if;
  for e in select user_id,amount from public.fps_entries where match_id=new.id and amount>0 order by user_id loop
    begin
      perform public.referral_note_play(e.user_id,'fps',new.ledger_game_id::text||':'||e.user_id::text,e.amount);
    exception when others then
      perform public._audit(e.user_id,'referral_hook_error',new.ledger_game_id,jsonb_build_object('game','fps'));
    end;
  end loop;
  if public._is_active_partner(new.winner_id) then return null; end if;
  loser := case when new.winner_id=new.creator_id then new.opponent_id else new.creator_id end;
  if loser is null or not public._is_active_partner(loser) then return null; end if;
  select ledger_tx_id into tx from public.fps_audit where match_id=new.id and action='COMPLETED';
  perform public._partner_profit_record('fps',new.ledger_game_id,loser,new.winner_id,new.stake,new.stake,new.fee_amount,
    new.payout_amount-new.stake,tx);
  return null;
end $$;
revoke all on function public._fps_completed_hooks() from public,anon,authenticated;
drop trigger if exists fps_completed_hooks on public.fps_matches;
create trigger fps_completed_hooks after update of status on public.fps_matches
  for each row when (new.status='COMPLETED' and old.status is distinct from 'COMPLETED')
  execute function public._fps_completed_hooks();

-- Mixed eligible/bonus stakes are settled through withdraw_basis_stake. A
-- completed FPS match must therefore validate that the basis exists, rather
-- than requiring a 100% eligible-cash entry.
create or replace function public.fps_finish(p_match uuid,p_winner uuid,p_score_a int,p_score_b int,p_reason text,p_runtime text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g fps_matches; intent fps_result_intents; e fps_entries; ids uuid[]; tx uuid; pot bigint; fee bigint; payout bigint;
  ra int; rb int; delta int; expected numeric;
begin
  select * into g from fps_matches where id=p_match for update;
  if not found then raise exception 'MATCH_NOT_FOUND'; end if;
  perform public._fps_validate_result(g,p_winner,p_score_a,p_score_b,p_reason,p_runtime);
  select * into intent from fps_result_intents where match_id=g.id;
  if found then
    if row(intent.runtime_id,intent.winner_id,intent.score_a,intent.score_b,intent.reason) is distinct from
      row(p_runtime,p_winner,case when p_winner is null then 0 else p_score_a end,case when p_winner is null then 0 else p_score_b end,p_reason)
      then raise exception 'RESULT_CONFLICT'; end if;
  elsif g.result_recorded then raise exception 'RESULT_INTENT_MISSING'; end if;
  if g.status in ('COMPLETED','CANCELLED') then
    if g.winner_id is distinct from p_winner or g.reason is distinct from p_reason or
      (g.status='COMPLETED' and (g.score_a is distinct from p_score_a or g.score_b is distinct from p_score_b))
      then raise exception 'RESULT_CONFLICT'; end if;
    return public._fps_json(g.id,null);
  end if;
  if g.status<>'FUNDED' then raise exception 'MATCH_NOT_FUNDED'; end if;
  if p_winner is null then perform public._fps_refund(g.id,p_reason); return public._fps_json(g.id,null); end if;
  if not g.result_recorded and g.expires_at<=clock_timestamp() then raise exception 'MATCH_EXPIRED'; end if;
  perform 1 from fps_entries where match_id=g.id order by user_id for update;
  select array_agg(user_id order by user_id),sum(amount) into ids,pot from fps_entries where match_id=g.id;
  if cardinality(ids)<>2 or pot<>g.stake*2 then raise exception 'POT_MISMATCH'; end if;
  fee:=pot*500/10000; payout:=pot-fee;
  if pot>0 then
    perform public._coinflip_lock_wallets(ids,g.asset,g.account_type);
    perform public._lock_system_accounts(array['house_revenue']::public.account_kind[],g.asset,g.account_type);
    perform public._withdraw_basis_sync();
    if (select count(*) from withdraw_basis_stake where game='fps' and game_id=g.ledger_game_id and user_id=any(ids)
      and eligible+bonus=g.stake)<>2 then raise exception 'CASH_BASIS_MISMATCH'; end if;
    insert into ledger_transactions(kind,idempotency_key,account_type,user_id,game_id,memo)
      values('fps_settlement','fps:'||g.id||':settlement',g.account_type,p_winner,g.ledger_game_id,'FPS payout and 5% fee') returning id into tx;
    for e in select * from fps_entries where match_id=g.id order by user_id loop
      perform public._post(tx,public._user_account(e.user_id,'user_locked',g.asset,g.account_type),-e.amount);
    end loop;
    perform public._post(tx,public._user_account(p_winner,'user_available',g.asset,g.account_type),payout);
    perform public._post(tx,public._system_account('house_revenue',g.asset,g.account_type),fee);
    perform public._withdraw_basis_sync();
  end if;
  if g.stake>0 and not g.private then
    insert into fps_ratings(user_id) select unnest(ids) order by 1 on conflict do nothing;
    perform 1 from fps_ratings where user_id=any(ids) order by user_id for update;
    select rating into ra from fps_ratings where user_id=g.creator_id; select rating into rb from fps_ratings where user_id=g.opponent_id;
    expected:=1/(1+power(10::numeric,least(800,greatest(-800,rb-ra))::numeric/400)); delta:=round(24*((case when p_winner=g.creator_id then 1 else 0 end)-expected));
    update fps_ratings set rating=rating+case when user_id=g.creator_id then delta else -delta end,played=played+1,wins=wins+case when user_id=p_winner then 1 else 0 end where user_id=any(ids);
  end if;
  insert into fps_audit(match_id,action,details,ledger_tx_id) values(g.id,'COMPLETED',jsonb_build_object('winner',p_winner,'score_a',p_score_a,'score_b',p_score_b,'reason',p_reason,'pot',pot,'fee',fee),tx);
  -- The completion trigger reads this transaction id for partner-profit holds.
  update fps_matches set status='COMPLETED',winner_id=p_winner,score_a=p_score_a,score_b=p_score_b,reason=p_reason,payout_amount=payout,fee_amount=fee,completed_at=clock_timestamp() where id=g.id;
  return public._fps_json(g.id,null);
end $$;

commit;
