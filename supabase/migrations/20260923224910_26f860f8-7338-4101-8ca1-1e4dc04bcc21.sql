create or replace function public.jackpot_draw_ticket(p_seed bytea, p_game_id bigint, p_draw_version int, p_n bigint,
  out ticket bigint, out counter int)
language plpgsql immutable set search_path = public, extensions as $$
declare h bytea; r numeric; lim numeric; two64 numeric := 18446744073709551616; i int;
begin
  if p_n is null or p_n <= 0 then raise exception 'INVALID_RANGE'; end if;
  lim := div(two64, p_n::numeric) * p_n;
  counter := 0;
  loop
    h := extensions.hmac(convert_to('PVPCasino:jackpot:v1:' || p_game_id || ':' || p_draw_version || ':' || counter, 'UTF8'), p_seed, 'sha256');
    r := 0;
    for i in 0..7 loop r := r * 256 + get_byte(h, i); end loop;
    if r < lim then ticket := mod(r, p_n::numeric)::bigint; return; end if;
    counter := counter + 1;
    if counter > 1000 then raise exception 'DRAW_EXHAUSTED'; end if;
  end loop;
end $$;