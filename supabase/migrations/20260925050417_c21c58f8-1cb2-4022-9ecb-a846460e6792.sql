CREATE OR REPLACE FUNCTION public.real_play_open()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $$
  select coalesce(public._play_domain_open(), false)
$$;
REVOKE ALL ON FUNCTION public.real_play_open() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.real_play_open() TO anon, authenticated;