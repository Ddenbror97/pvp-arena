alter function public._immutable() set search_path = public;
alter function public._game_guard() set search_path = public;
alter function public.server_time() set search_path = public;
create policy "no client access" on public.jackpot_game_secrets for select to authenticated using (false);