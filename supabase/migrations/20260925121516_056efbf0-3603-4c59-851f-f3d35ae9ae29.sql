create or replace function public._roulette_domain_valid() returns boolean language sql stable security definer set search_path = '' as $$
  select case (select account_type from public.money_domain_config)
    when 'test_credit' then public._money_state() = 'PRE_MIGRATION' and not coalesce((select money_domain_frozen from public.crypto_settings), false)
    when 'real' then public._money_state() = 'FINALIZED' and coalesce((select money_domain_frozen from public.crypto_settings), false)
    else false end
$$;
alter function public.real_play_open() set search_path = '';