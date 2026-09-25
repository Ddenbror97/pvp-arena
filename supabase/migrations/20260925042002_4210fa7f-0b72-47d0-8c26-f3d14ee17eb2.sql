DO $$
DECLARE r1 jsonb; r2 jsonb; inv jsonb;
BEGIN
  r1 := public._money_migrate_v1();
  RAISE NOTICE 'migrate: %', r1;
  inv := public.money_real_invariants();
  RAISE NOTICE 'invariants: %', inv;
  r2 := public._money_finalize_v1();
  RAISE NOTICE 'finalize: %', r2;
  IF public._money_state() <> 'FINALIZED' THEN
    RAISE EXCEPTION 'money migration did not reach FINALIZED: %', public._money_state();
  END IF;
END $$;

CREATE POLICY "No client access to money migrations" ON public.money_migrations
  FOR SELECT TO authenticated USING (false);