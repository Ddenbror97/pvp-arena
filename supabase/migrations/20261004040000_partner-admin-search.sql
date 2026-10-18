-- Admin partner search was prefix-only on username, or exact email. That hid most accounts.
create or replace function public.partner_admin_search(p_query text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare uid uuid := public._assert_admin();
  q text := btrim(coalesce(p_query, ''));
  escaped text;
begin
  if char_length(q) < 2 or char_length(q) > 120 then return jsonb_build_object('rows', '[]'::jsonb); end if;
  escaped := replace(replace(replace(q, '\', '\\'), '%', '\%'), '_', '\_');
  return jsonb_build_object('rows', coalesce((select jsonb_agg(x) from (
    select pr.id as user_id, pr.username, u.email,
      coalesce(pa.active, false) as is_partner
    from public.profiles pr
    left join auth.users u on u.id = pr.id
    left join public.partners pa on pa.user_id = pr.id
    where pr.username ilike '%' || escaped || '%' escape '\'
       or (u.email is not null and u.email ilike '%' || escaped || '%' escape '\')
       or (q ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' and pr.id = q::uuid)
    order by (pr.username ilike escaped || '%' escape '\') desc, pr.username
    limit 15
  ) x), '[]'::jsonb));
end $$;
revoke all on function public.partner_admin_search(text) from public, anon;
grant execute on function public.partner_admin_search(text) to authenticated;
