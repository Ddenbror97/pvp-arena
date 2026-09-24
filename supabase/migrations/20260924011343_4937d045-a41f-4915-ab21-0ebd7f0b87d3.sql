revoke all on public.game_chat_messages from anon, authenticated;
revoke all on public.game_chat_user_restrictions from anon, authenticated;
revoke all on public.game_chat_moderation_events from anon, authenticated;
grant select on public.game_chat_messages to authenticated;