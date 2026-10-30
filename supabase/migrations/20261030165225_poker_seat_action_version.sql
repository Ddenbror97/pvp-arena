-- Seat actions are visible changes even when the idle worker only reschedules.
-- Keep the installed function bodies and ACLs, including all hardening patches.
-- Each real action publishes at least one new version; no-op returns remain early.
begin;
do $migration$
declare target text; definition text; needle text; replacement text; table_expr text;
begin
  foreach target in array array[
    'public.poker_sit(bigint,smallint,smallint,bigint,text,text)',
    'public.poker_sit_out(bigint,boolean,text)'
  ] loop
    table_expr := case when target like 'public.poker_sit(%' then 't.id' else 'p_table' end;
    needle := format('if t.hand_id is null then perform public._poker_tick_table(%s); else perform public._poker_touch(%s); end if;', table_expr, table_expr);
    replacement := format('if t.hand_id is null then perform public._poker_tick_table(%s); end if; if (select version from poker_tables where id = %s) = t.version then perform public._poker_touch(%s); end if;', table_expr, table_expr, table_expr);
    select pg_get_functiondef(target::regprocedure) into definition;
    if position(needle in definition) = 0 then
      raise exception 'POKER_SEAT_VERSION_PATCH_TARGET_MISSING: %', target;
    end if;
    execute replace(definition, needle, replacement);
  end loop;
end
$migration$;
commit;
