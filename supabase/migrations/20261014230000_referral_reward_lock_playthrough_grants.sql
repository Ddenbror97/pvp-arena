-- referral_reward_lock_playthrough() is trigger-only (before insert on referral_rewards).
-- Default EXECUTE on SECURITY DEFINER functions exposes it to PostgREST; revoke browser roles.

revoke all on function public.referral_reward_lock_playthrough() from public, anon, authenticated;
grant execute on function public.referral_reward_lock_playthrough() to service_role;
