-- pool-phys-v5 keeps the v4 launch and stops the ball on the cushion nose.
-- The nose is inside the cloth rectangle that was fitted to the pocket holes,
-- so a v4 ball was rolling onto the frame. Older physics ids keep the outer wall.
-- Insets, micrometres: left 59642, right 58288, top 63875, bottom 58570.

create or replace function public.pool_fresh_state(p_seed bytea) returns jsonb
language plpgsql immutable set search_path = public as $$
declare
  mask numeric := '18446744073709551616'::numeric;
  s numeric := 0;
  balls int[] := array[1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15];
  i int; j int; tmp int; nxt numeric; left_id int; right_id int; swap_at int;
  slots int[] := '{}'; k int := 1; slot int; row int; col int;
  spacing int := 28575 * 2 + 900;
  apex_x int := (2540000 * 3) / 4;
  apex_y int := 1270000 / 2;
  rack jsonb := '[]'::jsonb;
  ordered jsonb;
  left_group text; right_group text; slot_group text;
begin
  if p_seed is null or octet_length(p_seed) <> 32 then raise exception 'SEED_MISSING'; end if;
  for i in 0..7 loop
    s := s * 256 + get_byte(p_seed, i);
  end loop;
  if s = 0 then s := 1; end if;
  for i in reverse 13..1 loop
    s := public.pool_xor64(s, mod(s * 8192, mask));
    s := public.pool_xor64(s, div(s, 128));
    s := public.pool_xor64(s, mod(s * 131072, mask));
    nxt := s;
    j := mod(nxt, i + 1)::int;
    tmp := balls[i + 1];
    balls[i + 1] := balls[j + 1];
    balls[j + 1] := tmp;
  end loop;
  left_id := balls[11];
  right_id := balls[15];
  left_group := case when left_id between 1 and 7 then 'solids' when left_id between 9 and 15 then 'stripes' else null end;
  right_group := case when right_id between 1 and 7 then 'solids' when right_id between 9 and 15 then 'stripes' else null end;
  if left_group is not null and left_group = right_group then
    swap_at := null;
    for i in 12..14 loop
      slot_group := case when balls[i] between 1 and 7 then 'solids' when balls[i] between 9 and 15 then 'stripes' else null end;
      if slot_group is distinct from left_group then
        swap_at := i;
        exit;
      end if;
    end loop;
    if swap_at is not null then
      tmp := balls[15];
      balls[15] := balls[swap_at];
      balls[swap_at] := tmp;
    end if;
  end if;
  k := 1;
  for slot in 0..14 loop
    if slot = 4 then slots := slots || 8;
    else
      slots := slots || balls[k];
      k := k + 1;
    end if;
  end loop;
  rack := rack || jsonb_build_array(jsonb_build_object(
    'id', 0, 'x', 2540000 / 4, 'y', apex_y, 'vx', 0, 'vy', 0, 'spin', 0, 'pocketed', false));
  slot := 1;
  for row in 0..4 loop
    for col in 0..row loop
      rack := rack || jsonb_build_array(jsonb_build_object(
        'id', slots[slot],
        'x', apex_x + (row * spacing * 866) / 1000,
        'y', apex_y + ((2 * col - row) * spacing) / 2,
        'vx', 0, 'vy', 0, 'spin', 0, 'pocketed', false));
      slot := slot + 1;
    end loop;
  end loop;
  select jsonb_agg(b order by (b->>'id')::int) into ordered from jsonb_array_elements(rack) b;
  return jsonb_build_object(
    'v', 1,
    'rules', 'pvp-8ball-v1',
    'physics', 'pool-phys-v5',
    'balls', ordered,
    'open', true,
    'groupA', null,
    'turn', 'A',
    'ballInHand', true,
    'kitchenOnly', true,
    'breakShot', true,
    'timeouts', jsonb_build_object('A', 0, 'B', 0),
    'winner', null,
    'reason', null,
    'shot', 0);
end $$;

-- Rebuild one shot from the stored input. Raises instead of returning a
-- rejected placement or a missing 8-ball call. The caller settles only this.

create or replace function public.pool_play(p_state jsonb, p_input jsonb) returns jsonb
language plpgsql immutable set search_path = public as $$
declare
  n int := 0;
  ball jsonb;
  ids int[] := '{}'; xs bigint[] := '{}'; ys bigint[] := '{}';
  vxs bigint[] := '{}'; vys bigint[] := '{}'; spins bigint[] := '{}';
  pocketed boolean[] := '{}'; before_pocketed boolean[] := '{}';
  i int; j int; tick int;
  cue int; power int; speed bigint; ang int; cosv int; sinv int; side int; follow int;
  any_move boolean; nx bigint; ny bigint; dist2 bigint; dist bigint; overlap bigint;
  sx bigint; sy bigint; rvx bigint; rvy bigint; approach bigint; impulse bigint; ix bigint; iy bigint;
  sgn bigint; first_id int := null; hit_object boolean; hole int; px bigint; py bigint; pr bigint;
  dx bigint; dy bigint; open_mouth boolean; left_x bigint := 28575; right_x bigint := 2540000 - 28575;
  top_y bigint := 28575; bot_y bigint := 1270000 - 28575; jaw int := 22000;
  sp bigint; english bigint; drag bigint; hit boolean;
  rail_hit int[] := '{}'; pocket_ids int[] := '{}'; pocket_holes int[] := '{}';
  cue_scratch boolean := false; rail_after boolean := false;
  me text; opp text; mine text; cleared boolean; eight boolean; obj_pocket boolean;
  foul text := null; first_group text; gid int; g text; keep boolean; pocketed_own boolean; pocketed_open boolean;
  called int; eight_hole int; balls jsonb := '[]'::jsonb; shot int; open_table boolean; group_a text;
  turn text; ball_in_hand boolean; kitchen boolean; break_shot boolean; winner text; reason text;
  place_x bigint; place_y bigint; legal boolean;
begin
  if coalesce(p_state->>'physics', 'pool-phys-v1') = 'pool-phys-v5' then
    left_x := 28575 + 59642;
    right_x := 2540000 - 58288 - 28575;
    top_y := 28575 + 58570;
    bot_y := 1270000 - 63875 - 28575;
    jaw := 28000;
  end if;
  if p_state is null or jsonb_array_length(p_state->'balls') <> 16 then raise exception 'BAD_STATE'; end if;
  if p_state->>'winner' is not null then raise exception 'MATCH_FINISHED'; end if;
  if p_input is null or (p_input->>'angleMilli') is null or (p_input->>'power') is null
     or (p_input->>'spinX') is null or (p_input->>'spinY') is null then
    raise exception 'BAD_SHOT';
  end if;
  if (p_input->>'angleMilli')::int < 0 or (p_input->>'angleMilli')::int > 359999
     or (p_input->>'power')::int < 1 or (p_input->>'power')::int > 10000
     or (p_input->>'spinX')::int < -1000 or (p_input->>'spinX')::int > 1000
     or (p_input->>'spinY')::int < -1000 or (p_input->>'spinY')::int > 1000 then
    raise exception 'BAD_SHOT';
  end if;
  for ball in select value from jsonb_array_elements(p_state->'balls') loop
    n := n + 1;
    ids := ids || (ball->>'id')::int;
    xs := xs || (ball->>'x')::bigint;
    ys := ys || (ball->>'y')::bigint;
    vxs := vxs || 0::bigint;
    vys := vys || 0::bigint;
    spins := spins || 0::bigint;
    pocketed := pocketed || ((ball->>'pocketed') = 'true');
    before_pocketed := before_pocketed || ((ball->>'pocketed') = 'true');
  end loop;
  me := p_state->>'turn';
  if me not in ('A', 'B') then raise exception 'BAD_STATE'; end if;
  mine := case
    when p_state->>'groupA' is null then null
    when me = 'A' then p_state->>'groupA'
    when p_state->>'groupA' = 'solids' then 'stripes'
    else 'solids'
  end;
  cleared := mine is not null;
  if cleared then
    for i in 1..n loop
      if ids[i] between 1 and 7 and mine = 'solids' and not before_pocketed[i] then cleared := false; end if;
      if ids[i] between 9 and 15 and mine = 'stripes' and not before_pocketed[i] then cleared := false; end if;
    end loop;
  end if;
  if cleared and (p_state->>'breakShot') is distinct from 'true' and p_input->>'calledPocket' is null then
    raise exception 'CALL_POCKET';
  end if;
  if (p_state->>'ballInHand') = 'true' then
    if p_input->>'placeX' is null or p_input->>'placeY' is null then raise exception 'PLACE_CUE'; end if;
    place_x := (p_input->>'placeX')::bigint;
    place_y := (p_input->>'placeY')::bigint;
    legal := place_x = trunc(place_x) and place_y = trunc(place_y)
      and place_x >= left_x and place_y >= top_y
      and place_x <= right_x and place_y <= bot_y
      and ((p_state->>'kitchenOnly') is distinct from 'true' or place_x <= 2540000 / 4);
    if legal then
      for i in 1..n loop
        if pocketed[i] or ids[i] = 0 then continue; end if;
        if (xs[i] - place_x) * (xs[i] - place_x) + (ys[i] - place_y) * (ys[i] - place_y)
           < (28575::bigint * 2 + 200) * (28575 * 2 + 200) then
          legal := false;
        end if;
      end loop;
    end if;
    if not legal then raise exception 'ILLEGAL_PLACEMENT'; end if;
    for i in 1..n loop
      if ids[i] = 0 then
        xs[i] := place_x;
        ys[i] := place_y;
        pocketed[i] := false;
      end if;
    end loop;
  end if;

  cue := null;
  for i in 1..n loop
    if ids[i] = 0 then cue := i; end if;
  end loop;
  if cue is null or pocketed[cue] then raise exception 'CUE_MISSING'; end if;
  power := least(10000, greatest(1, (p_input->>'power')::int));
  speed := (power::bigint * 14000) / 10000;
  if coalesce(p_state->>'physics', 'pool-phys-v1') = 'pool-phys-v3' and power > 6000 then
    speed := speed + ((power - 6000)::bigint * 14000) / 4000;
  end if;
  if coalesce(p_state->>'physics', 'pool-phys-v1') in ('pool-phys-v4', 'pool-phys-v5') then
    if power > 6000 then
      speed := speed + ((power - 6000)::bigint * 14000) / 4000;
    end if;
    speed := (speed * 60) / 100;
    if speed < 1 then speed := 1; end if;
  end if;
  ang := (p_input->>'angleMilli')::int;
  cosv := public.pool_sin_micro(ang + 90000);
  sinv := public.pool_sin_micro(ang);
  vxs[cue] := (speed * cosv) / 1000000;
  vys[cue] := (speed * sinv) / 1000000;
  side := least(1000, greatest(-1000, (p_input->>'spinX')::int));
  follow := least(1000, greatest(-1000, (p_input->>'spinY')::int));
  spins[cue] := side;
  vxs[cue] := vxs[cue] + trunc(((-sinv::numeric) * side * speed) / 1000000 / 8);
  vys[cue] := vys[cue] + trunc((cosv::numeric * side * speed) / 1000000 / 8);

  for tick in 0..1919 loop
    any_move := false;
    for i in 1..n loop
      if pocketed[i] or (vxs[i] = 0 and vys[i] = 0) then continue; end if;
      any_move := true;
      xs[i] := xs[i] + vxs[i];
      ys[i] := ys[i] + vys[i];
    end loop;
    exit when not any_move;
    for i in 1..n - 1 loop
      for j in i + 1..n loop
        if pocketed[i] or pocketed[j] then continue; end if;
        nx := xs[j] - xs[i];
        ny := ys[j] - ys[i];
        dist2 := nx * nx + ny * ny;
        if dist2 = 0 or dist2 >= (28575::bigint * 2) * (28575 * 2) then continue; end if;
        dist := public.pool_isqrt(dist2);
        if dist = 0 then dist := 1; end if;
        overlap := 28575 * 2 - dist;
        sx := trunc((nx::numeric * overlap) / dist / 2);
        sy := trunc((ny::numeric * overlap) / dist / 2);
        sgn := case when nx = 0 then 1 else sign(nx) end;
        xs[i] := xs[i] - case when sx = 0 then sgn else sx end;
        ys[i] := ys[i] - sy;
        xs[j] := xs[j] + case when sx = 0 then sgn else sx end;
        ys[j] := ys[j] + sy;
        rvx := vxs[i] - vxs[j];
        rvy := vys[i] - vys[j];
        approach := trunc((rvx * nx + rvy * ny)::numeric / dist);
        if approach <= 0 then continue; end if;
        if first_id is null and (ids[i] = 0 or ids[j] = 0) then
          first_id := case when ids[i] = 0 then ids[j] else ids[i] end;
          if ids[i] = 0 and follow <> 0 then
            vxs[i] := vxs[i] + trunc((follow::numeric * nx) / dist / 6);
            vys[i] := vys[i] + trunc((follow::numeric * ny) / dist / 6);
          end if;
          if ids[j] = 0 and follow <> 0 then
            vxs[j] := vxs[j] - trunc((follow::numeric * nx) / dist / 6);
            vys[j] := vys[j] - trunc((follow::numeric * ny) / dist / 6);
          end if;
        end if;
        impulse := trunc((approach * 1920)::numeric / 1000 / 2);
        ix := trunc((impulse * nx)::numeric / dist);
        iy := trunc((impulse * ny)::numeric / dist);
        vxs[i] := vxs[i] - ix;
        vys[i] := vys[i] - iy;
        vxs[j] := vxs[j] + ix;
        vys[j] := vys[j] + iy;
      end loop;
    end loop;
    hit_object := first_id is not null;
    for i in 1..n loop
      if pocketed[i] then continue; end if;
      hole := null;
      for j in 0..5 loop
        px := case j when 0 then 48000 when 1 then 1270000 when 2 then 2492000 when 3 then 48000 when 4 then 1270000 else 2492000 end;
        py := case j when 0 then 48000 when 1 then 18000 when 2 then 48000 when 3 then 1222000 when 4 then 1252000 else 1222000 end;
        pr := case when j in (1, 4) then 48000 else 54000 end;
        if (xs[i] - px) * (xs[i] - px) + (ys[i] - py) * (ys[i] - py) <= pr::bigint * pr then
          hole := j;
          exit;
        end if;
      end loop;
      if hole is not null then
        pocketed[i] := true;
        vxs[i] := 0;
        vys[i] := 0;
        pocket_ids := pocket_ids || ids[i];
        pocket_holes := pocket_holes || hole;
        if ids[i] = 0 then cue_scratch := true; end if;
        continue;
      end if;
      open_mouth := false;
      for j in 0..5 loop
        px := case j when 0 then 48000 when 1 then 1270000 when 2 then 2492000 when 3 then 48000 when 4 then 1270000 else 2492000 end;
        py := case j when 0 then 48000 when 1 then 18000 when 2 then 48000 when 3 then 1222000 when 4 then 1252000 else 1222000 end;
        pr := case when j in (1, 4) then 48000 else 54000 end;
        if (xs[i] - px) * (xs[i] - px) + (ys[i] - py) * (ys[i] - py) <= (pr + jaw)::bigint * (pr + jaw) then
          open_mouth := true;
          exit;
        end if;
      end loop;
      sp := public.pool_isqrt(vxs[i] * vxs[i] + vys[i] * vys[i]);
      english := trunc((spins[i] * sp)::numeric / 5000);
      hit := false;
      if xs[i] < left_x then
        if not (open_mouth and coalesce(p_state->>'physics', 'pool-phys-v1') = 'pool-phys-v5') then
          xs[i] := left_x;
        end if;
        if not open_mouth then
          vxs[i] := -trunc((vxs[i] * 750)::numeric / 1000);
          vys[i] := vys[i] + english;
          hit := true;
        end if;
      elsif xs[i] > right_x then
        if not (open_mouth and coalesce(p_state->>'physics', 'pool-phys-v1') = 'pool-phys-v5') then
          xs[i] := right_x;
        end if;
        if not open_mouth then
          vxs[i] := -trunc((vxs[i] * 750)::numeric / 1000);
          vys[i] := vys[i] - english;
          hit := true;
        end if;
      end if;
      if ys[i] < top_y then
        if not (open_mouth and coalesce(p_state->>'physics', 'pool-phys-v1') = 'pool-phys-v5') then
          ys[i] := top_y;
        end if;
        if not open_mouth then
          vys[i] := -trunc((vys[i] * 750)::numeric / 1000);
          vxs[i] := vxs[i] + english;
          hit := true;
        end if;
      elsif ys[i] > bot_y then
        if not (open_mouth and coalesce(p_state->>'physics', 'pool-phys-v1') = 'pool-phys-v5') then
          ys[i] := bot_y;
        end if;
        if not open_mouth then
          vys[i] := -trunc((vys[i] * 750)::numeric / 1000);
          vxs[i] := vxs[i] - english;
          hit := true;
        end if;
      end if;
      if hit then
        if ids[i] <> 0 and not (ids[i] = any(rail_hit)) then rail_hit := rail_hit || ids[i]; end if;
        if hit_object then rail_after := true; end if;
      end if;
      sp := public.pool_isqrt(vxs[i] * vxs[i] + vys[i] * vys[i]);
      if sp < 70 then
        vxs[i] := 0;
        vys[i] := 0;
      else
        drag := case
          when coalesce(p_state->>'physics', 'pool-phys-v1') = 'pool-phys-v1' then 32 + sp / 160
          when coalesce(p_state->>'physics', 'pool-phys-v1') in ('pool-phys-v3', 'pool-phys-v4', 'pool-phys-v5') then 2 + sp / 1500
          else 4 + sp / 900
        end;
        english := sp - drag;
        if english <= 0 then
          vxs[i] := 0;
          vys[i] := 0;
        else
          vxs[i] := trunc((vxs[i] * english)::numeric / sp);
          vys[i] := trunc((vys[i] * english)::numeric / sp);
        end if;
      end if;
      spins[i] := trunc((spins[i] * 985)::numeric / 1000);
    end loop;
  end loop;

  opp := case me when 'A' then 'B' else 'A' end;
  eight := 8 = any(pocket_ids);
  obj_pocket := exists (select 1 from unnest(pocket_ids) pid where pid <> 0);
  shot := coalesce((p_state->>'shot')::int, 0) + 1;
  open_table := (p_state->>'open') = 'true';
  group_a := p_state->>'groupA';
  turn := me;
  ball_in_hand := false;
  kitchen := false;
  break_shot := false;
  winner := null;
  reason := null;

  if eight and cue_scratch then
    winner := opp;
    reason := case when (p_state->>'breakShot') = 'true' then 'EIGHT_AND_SCRATCH_ON_BREAK' else 'SCRATCH_ON_EIGHT' end;
    turn := opp;
  elsif eight and (p_state->>'breakShot') = 'true' then
    winner := me;
    reason := 'EIGHT_ON_BREAK';
  elsif eight and not cleared then
    winner := opp;
    reason := 'EIGHT_EARLY';
    turn := opp;
  elsif eight and cleared then
    winner := me;
    reason := 'EIGHT_BALL';
    called := (p_input->>'calledPocket')::int;
    eight_hole := null;
    for i in 1..coalesce(array_length(pocket_ids, 1), 0) loop
      if pocket_ids[i] = 8 then eight_hole := pocket_holes[i]; end if;
    end loop;
    if eight_hole is distinct from called then
      winner := opp;
      reason := 'EIGHT_WRONG_POCKET';
      turn := opp;
    end if;
  else
    if (p_state->>'breakShot') = 'true' and not obj_pocket and coalesce(array_length(rail_hit, 1), 0) < 4 then
      foul := 'ILLEGAL_BREAK';
    end if;
    if foul is null and first_id is null then foul := 'NO_CONTACT'; end if;
    if foul is null and mine is not null and not cleared then
      g := case
        when first_id between 1 and 7 then 'solids'
        when first_id between 9 and 15 then 'stripes'
        else null
      end;
      if g is distinct from mine then foul := 'WRONG_BALL'; end if;
    end if;
    if foul is null and cleared and first_id is distinct from 8 then foul := 'WRONG_BALL'; end if;
    if foul is null and cue_scratch then foul := 'SCRATCH'; end if;
    if foul is null and not obj_pocket and not rail_after and (p_state->>'breakShot') is distinct from 'true' then
      foul := 'NO_RAIL';
    end if;
    if foul is null and open_table then
      first_group := null;
      for i in 1..coalesce(array_length(pocket_ids, 1), 0) loop
        gid := pocket_ids[i];
        if gid between 1 and 7 then first_group := 'solids'; exit; end if;
        if gid between 9 and 15 then first_group := 'stripes'; exit; end if;
      end loop;
      if first_group is not null then
        open_table := false;
        group_a := case
          when me = 'A' then first_group
          when first_group = 'solids' then 'stripes'
          else 'solids'
        end;
      end if;
    end if;
    g := case
      when group_a is null then null
      when turn = 'A' then group_a
      when group_a = 'solids' then 'stripes'
      else 'solids'
    end;
    pocketed_own := false;
    pocketed_open := false;
    if g is not null then
      for i in 1..coalesce(array_length(pocket_ids, 1), 0) loop
        if (g = 'solids' and pocket_ids[i] between 1 and 7) or (g = 'stripes' and pocket_ids[i] between 9 and 15) then
          pocketed_own := true;
        end if;
      end loop;
    end if;
    if (p_state->>'open') = 'true' then
      for i in 1..coalesce(array_length(pocket_ids, 1), 0) loop
        if pocket_ids[i] between 1 and 7 or pocket_ids[i] between 9 and 15 then pocketed_open := true; end if;
      end loop;
    end if;
    keep := foul is null and (pocketed_own or pocketed_open);
    if foul is not null then
      turn := opp;
      ball_in_hand := true;
      kitchen := false;
    elsif not keep then
      turn := opp;
    end if;
  end if;

  for i in 1..n loop
    balls := balls || jsonb_build_array(jsonb_build_object(
      'id', ids[i], 'x', xs[i], 'y', ys[i], 'vx', 0, 'vy', 0, 'spin', 0, 'pocketed', pocketed[i]));
  end loop;
  return jsonb_build_object(
    'v', coalesce(p_state->'v', '1'::jsonb),
    'rules', coalesce(p_state->'rules', '"pvp-8ball-v1"'::jsonb),
    'physics', coalesce(p_state->'physics', '"pool-phys-v1"'::jsonb),
    'balls', balls,
    'open', open_table,
    'groupA', group_a,
    'turn', turn,
    'ballInHand', ball_in_hand,
    'kitchenOnly', kitchen,
    'breakShot', break_shot,
    'timeouts', coalesce(p_state->'timeouts', '{"A":0,"B":0}'::jsonb),
    'winner', winner,
    'reason', reason,
    'shot', shot);
end $$;


create or replace function public.pool_recorded_prior(p_match bigint) returns jsonb
language plpgsql stable set search_path = public as $$
declare
  seed bytea;
  st jsonb;
  phys text;
  ev record;
begin
  select server_seed into seed from pool_secrets where match_id = p_match;
  if seed is null then raise exception 'SEED_MISSING'; end if;
  st := public.pool_fresh_state(seed);
  -- A match keeps the physics id stored on its rack when the server re-folds it.
  select state->>'physics' into phys from pool_matches where id = p_match;
  if phys in ('pool-phys-v1', 'pool-phys-v2', 'pool-phys-v3', 'pool-phys-v4', 'pool-phys-v5') then
    st := jsonb_set(st, '{physics}', to_jsonb(phys));
  end if;
  for ev in
    select kind, seat, input from pool_events where match_id = p_match order by seq
  loop
    if ev.kind = 'shot' then
      st := public.pool_play(st, ev.input);
    elsif ev.kind = 'timeout' then
      st := public.pool_apply_timeout(st);
    elsif ev.kind = 'forfeit' then
      st := public.pool_apply_forfeit(st, ev.seat);
    else
      raise exception 'BAD_EVENT';
    end if;
  end loop;
  return st;
end $$;

revoke all on function public.pool_play(jsonb, jsonb) from public, anon, authenticated, service_role;
revoke all on function public.pool_fresh_state(bytea) from public, anon, authenticated, service_role;
revoke all on function public.pool_recorded_prior(bigint) from public, anon, authenticated, service_role;
