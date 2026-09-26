import postgres from "postgres";

const token = process.env.CRYPTO_JOB_TOKEN?.trim();
if (!token || !/^[0-9a-f]{64}$/i.test(token)) {
  console.error("CRYPTO_JOB_TOKEN missing");
  process.exit(1);
}

const sql = postgres(process.env.SUPABASE_DB_URL, { ssl: "require", max: 1 });

await sql`
  create table if not exists public.crypto_job_bearer (
    id boolean primary key default true check (id),
    token text not null check (token ~ '^[0-9a-f]{64}$')
  )
`;
await sql`alter table public.crypto_job_bearer enable row level security`;
await sql`revoke all on public.crypto_job_bearer from public, anon, authenticated`;
await sql`grant all on public.crypto_job_bearer to service_role`;

await sql`
  insert into public.crypto_job_bearer (id, token)
  values (true, ${token.toLowerCase()})
  on conflict (id) do update set token = excluded.token
`;

await sql.unsafe(`
create or replace function public.crypto_invoke_cron(p_path text)
returns bigint
language plpgsql
security definer
set search_path = public, net
as $$
declare
  tok text;
  req_id bigint;
begin
  if p_path not in ('crypto-deposits', 'crypto-withdrawals', 'crypto-reconcile') then
    raise exception 'invalid crypto cron path';
  end if;
  select token into tok from public.crypto_job_bearer where id;
  if tok is null then
    raise exception 'crypto job token missing';
  end if;
  select net.http_post(
    url := 'https://pvpspinarena.com/api/public/cron/' || p_path,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || tok
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 55000
  ) into req_id;
  return req_id;
end;
$$;
`);
await sql`revoke all on function public.crypto_invoke_cron(text) from public, anon, authenticated`;

for (const name of ["pvp-crypto-deposits", "pvp-crypto-withdrawals", "pvp-crypto-reconcile"]) {
  const rows = await sql`select jobid from cron.job where jobname = ${name}`;
  if (rows.length) await sql`select cron.unschedule(${name}::text)`;
}

await sql`select cron.schedule('pvp-crypto-deposits', '* * * * *', $cmd$)select public.crypto_invoke_cron('crypto-deposits')$cmd$)`;
await sql`select cron.schedule('pvp-crypto-withdrawals', '* * * * *', $cmd$)select public.crypto_invoke_cron('crypto-withdrawals')$cmd$)`;
await sql`select cron.schedule('pvp-crypto-reconcile', '*/15 * * * *', $cmd$)select public.crypto_invoke_cron('crypto-reconcile')$cmd$)`;

const jobs = await sql`select jobname, schedule from cron.job where jobname like 'pvp-%' order by 1`;
console.log(JSON.stringify(jobs, null, 2));
await sql.end();
