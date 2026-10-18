-- A payout waiting on hot-wallet funds is not signed yet. The player can
-- still cancel it. crypto_withdrawal_signed only matches APPROVED or
-- LIQUIDITY_PENDING, so a cancel and a sign cannot both commit.
create or replace function public.crypto_cancel_withdrawal(p_user uuid, p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare w crypto_withdrawals;
begin
  select * into w from crypto_withdrawals where id = p_id and user_id = p_user for update;
  if w is null then raise exception 'NOT_FOUND'; end if;
  if w.status not in ('PENDING', 'APPROVED', 'LIQUIDITY_PENDING') then raise exception 'CANNOT_CANCEL'; end if;
  perform _crypto_release(w.id, 'RELEASED', 'cancelled by user');
  return jsonb_build_object('status', 'RELEASED');
end;
$$;
