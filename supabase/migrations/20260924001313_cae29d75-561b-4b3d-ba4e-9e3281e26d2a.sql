create or replace function public._ledger_balanced()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select coalesce(sum(amount), 0) from public.ledger_postings where tx_id = new.tx_id) <> 0 then
    raise exception 'LEDGER_UNBALANCED tx %', new.tx_id;
  end if;
  return null;
end
$$;

revoke all on function public._ledger_balanced() from public, anon, authenticated;
grant execute on function public._ledger_balanced() to service_role;