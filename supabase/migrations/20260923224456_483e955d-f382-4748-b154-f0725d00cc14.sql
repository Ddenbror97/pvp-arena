do $$ begin
  if exists (select 1 from pg_roles where rolname = 'sandbox_exec') then
    execute 'grant create on database postgres to sandbox_exec';
  end if;
end $$;