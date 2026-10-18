-- Leaderboards count only wagers paid from deposited money, on every board.
--
-- Counting has worked this way since 20261013231000 (_lb_wager_deposit_cents in _lb_sync for all
-- campaigns). This makes the published rules and the frozen rule label say so plainly:
-- the old rules line suggested promo balance starts counting once you deposit, which it never does.
-- Open campaigns approved under the old 'wager_turnover' label are relabelled (audited); their
-- counting does not change.

create or replace function public._lb_rules(c public.leaderboard_campaigns)
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_build_array(
    'Runs ' || to_char(c.starts_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI') || ' UTC to '
      || to_char(c.ends_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI') || ' UTC.',
    'Games: ' || array_to_string(c.games, ', ') || '.',
    case when c.audience = 'attributed'
      then 'Players who joined through this host''s partner link or promo code are on this board.'
      else 'Any player who stakes in this window can place, except the host.'
    end,
    'Your rank is the total you wager from deposited money on finished games in that window.',
    'Only stakes paid from money you deposited, and winnings made with it, count. Promo codes, referral, partner, and prize credits never count, and neither do winnings from them.',
    'Cancelled games, refunds, test-credit games, and the host''s own stakes do not count. Only the match stake counts.',
    case when c.min_wager_cents > 0
      then 'Each counted stake must include at least ' || trim(to_char(c.min_wager_cents / 100.0, 'FM999999990.00')) || ' USD from deposited money.'
      else 'Any deposit-funded stake the game accepts counts.' end,
    'Stakes are in USD.',
    'A higher total ranks higher. If the totals match, the earlier last stake ranks higher.',
    'Prizes are fixed USD amounts for a place or a range of places.',
    'A prize is added to your balance and stays locked until you wager that same amount on Jackpot, Coinflip, Roulette, or Slott.',
    'Rankings and prizes are final when the race closes.'
  )
$$;
revoke all on function public._lb_rules(public.leaderboard_campaigns) from public, anon, authenticated;
grant execute on function public._lb_rules(public.leaderboard_campaigns) to service_role;

create or replace function public.leaderboard_admin_decide(p_campaign uuid, p_action text, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := public._lb_require_admin();
  c public.leaderboard_campaigns;
  t public.leaderboard_templates;
  bank bigint;
  short boolean;
  reason text := btrim(coalesce(p_reason, ''));
begin
  if p_action not in ('approve', 'reject', 'suspend', 'resume', 'cancel', 'retry') then raise exception 'BAD_ACTION'; end if;
  select * into c from leaderboard_campaigns where id = p_campaign for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if p_action = 'approve' then
    if c.status <> 'pending_approval' then raise exception 'NOT_ALLOWED'; end if;
    if c.starts_at <= clock_timestamp() then raise exception 'START_PASSED'; end if;
    select * into t from leaderboard_templates where id = c.template_id and status = 'active';
    if not found then raise exception 'TEMPLATE_UNAVAILABLE'; end if;
    if c.prize_pool_cents > t.max_prize_pool_cents then raise exception 'PRIZE_CAP'; end if;
    select coalesce(balance, 0) into bank from wallet_accounts
      where owner_id is null and kind = 'house_bankroll' and asset = 'USD' and account_type = 'real';
    bank := coalesce(bank, 0);
    short := bank < c.prize_pool_cents;
    if short and char_length(reason) < 8 then raise exception 'BANKROLL_SHORT'; end if;
    update leaderboard_campaigns set
      status = 'scheduled', funding_status = 'checked', bankroll_at_check_cents = bank, funding_shortfall = short,
      rules_frozen_at = clock_timestamp(), approved_by = uid, approved_at = clock_timestamp(),
      config_snapshot = jsonb_build_object(
        'games', c.games, 'min_wager_cents', c.min_wager_cents, 'starts_at', c.starts_at, 'ends_at', c.ends_at,
        'timezone', c.timezone, 'prize_pool_cents', c.prize_pool_cents, 'template_version', t.version,
        'ranking', 'deposit_wager', 'tie_break', 'total desc, last wager asc, player id asc'
      ),
      template_version = t.version, updated_at = clock_timestamp()
    where id = c.id and status = 'pending_approval';
    perform public._audit(uid, 'leaderboard_approved', null,
      jsonb_build_object('campaign_id', c.id, 'bankroll_cents', bank, 'shortfall', short, 'reason', nullif(reason, '')));
  elsif p_action = 'reject' then
    if c.status <> 'pending_approval' then raise exception 'NOT_ALLOWED'; end if;
    if char_length(reason) < 8 then raise exception 'REASON_REQUIRED'; end if;
    update leaderboard_campaigns
      set status = 'rejected', rejection_reason = reason, updated_at = clock_timestamp()
      where id = c.id and status = 'pending_approval';
    perform public._audit(uid, 'leaderboard_rejected', null, jsonb_build_object('campaign_id', c.id, 'reason', reason));
  elsif p_action = 'suspend' then
    if c.status not in ('scheduled', 'active') then raise exception 'NOT_ALLOWED'; end if;
    if char_length(reason) < 8 then raise exception 'REASON_REQUIRED'; end if;
    update leaderboard_campaigns set status = 'suspended', rejection_reason = reason, updated_at = clock_timestamp() where id = c.id;
    perform public._audit(uid, 'leaderboard_suspended', null, jsonb_build_object('campaign_id', c.id, 'reason', reason));
  elsif p_action = 'resume' then
    if c.status <> 'suspended' then raise exception 'NOT_ALLOWED'; end if;
    if clock_timestamp() >= c.ends_at then raise exception 'WINDOW_CLOSED'; end if;
    update leaderboard_campaigns
      set status = case when clock_timestamp() >= c.starts_at then 'active' else 'scheduled' end,
          rejection_reason = null, updated_at = clock_timestamp()
      where id = c.id and status = 'suspended';
    perform public._audit(uid, 'leaderboard_resumed', null, jsonb_build_object('campaign_id', c.id));
  elsif p_action = 'cancel' then
    if c.awards_created or c.status in ('settling', 'under_review', 'completed') then raise exception 'AWARDS_EXIST'; end if;
    if c.status not in ('pending_approval', 'scheduled', 'active', 'suspended', 'closing', 'rejected', 'draft') then
      raise exception 'NOT_ALLOWED';
    end if;
    if char_length(reason) < 8 then raise exception 'REASON_REQUIRED'; end if;
    update leaderboard_campaigns
      set status = 'cancelled', rejection_reason = reason, closed_at = coalesce(closed_at, clock_timestamp()), updated_at = clock_timestamp()
      where id = c.id;
    perform public._audit(uid, 'leaderboard_cancelled', null, jsonb_build_object('campaign_id', c.id, 'by', 'admin', 'reason', reason));
  elsif p_action = 'retry' then
    if c.status <> 'under_review' then raise exception 'NOT_ALLOWED'; end if;
    update leaderboard_prize_awards set payout_status = 'pending', last_error = null
      where campaign_id = c.id and payout_status = 'failed';
    update leaderboard_campaigns set status = 'settling', updated_at = clock_timestamp() where id = c.id and status = 'under_review';
    perform public._audit(uid, 'leaderboard_retry', null, jsonb_build_object('campaign_id', c.id, 'reason', nullif(reason, '')));
  end if;
  return public.leaderboard_admin_get(c.id);
end $$;

-- Frozen rules are immutable by trigger; relabel open campaigns once, in this transaction only.
alter table public.leaderboard_campaigns disable trigger leaderboard_campaign_guard;
with relabelled as (
  update public.leaderboard_campaigns
    set config_snapshot = config_snapshot || jsonb_build_object('ranking', 'deposit_wager'),
        updated_at = clock_timestamp()
  where config_snapshot ->> 'ranking' = 'wager_turnover'
    and status in ('scheduled', 'active', 'closing', 'suspended')
  returning id
)
select public._audit(null, 'leaderboard_rules_relabelled', null,
  jsonb_build_object('campaign_id', id, 'ranking', 'deposit_wager', 'from', 'wager_turnover',
    'note', 'Counting unchanged since 20261013231000: deposit-funded stakes only.'))
from relabelled;
alter table public.leaderboard_campaigns enable trigger leaderboard_campaign_guard;
