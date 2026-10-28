/**
 * Recheck realtime with the same publishable-key header handling as
 * src/integrations/supabase/client.ts. Reads the isolated project from
 * /tmp/secrets/sb-test.env. Refuses the production project.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";

const FORBIDDEN = ["dkyabirifoixnfbmheay", "gqeaadpdtuussxdlnmof", "fdsovopvmjogjcllmxwj"];
const env = Object.fromEntries(
  readFileSync("/tmp/secrets/sb-test.env", "utf8")
    .split("\n")
    .filter((line) => line.includes("="))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i), line.slice(i + 1)];
    }),
);
const ref = env.TEST_PROJECT_REF;
if (ref !== "ljpqxsndqywbndnpitja") throw new Error("unexpected test ref");
for (const bad of FORBIDDEN) if (`${env.TEST_SUPABASE_URL} ${ref}`.includes(bad)) throw new Error("forbidden ref");

const source = readFileSync("src/integrations/supabase/client.ts", "utf8");
if (!source.includes('headers.delete("Authorization")')) {
  throw new Error("frontend client no longer strips the publishable-key bearer");
}

function isNewSupabaseApiKey(value) {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey) {
  return (input, init) => {
    const headers = new Headers(typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined);
    if (init?.headers) new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    if (isNewSupabaseApiKey(supabaseKey) && headers.get("Authorization") === `Bearer ${supabaseKey}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

const url = env.TEST_SUPABASE_URL;
const publishable = env.TEST_PUBLISHABLE_KEY;
const raw = createClient(url, publishable);
const wrapped = createClient(url, publishable, { global: { fetch: createSupabaseFetch(publishable) } });
const authed = createClient(url, env.TEST_ANON_JWT);

const sql = postgres(
  `postgresql://postgres.${ref}:${encodeURIComponent(env.TEST_DB_PASSWORD)}@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require`,
  { max: 1, prepare: false },
);

function listen(client, channelName, table, filter) {
  return new Promise((resolve) => {
    const events = [];
    const channel = client.channel(channelName);
    const spec = { event: "UPDATE", schema: "public", table };
    if (filter) spec.filter = filter;
    channel.on("postgres_changes", spec, (payload) => events.push(payload));
    const timer = setTimeout(() => {
      void client.removeChannel(channel);
      resolve({ events, status: "TIMEOUT" });
    }, 12_000);
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") events.push({ status });
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        clearTimeout(timer);
        void client.removeChannel(channel);
        resolve({ events, status });
      }
    });
  });
}

const results = [];
const wallets = await fetch(`${url}/rest/v1/wallet_accounts?select=owner_id,balance`, {
  headers: { apikey: publishable, authorization: `Bearer ${publishable}` },
});
results.push({ check: "anon wallet select", status: wallets.status, body: (await wallets.text()).slice(0, 80) });
const secrets = await fetch(`${url}/rest/v1/pool_secrets?select=match_id`, {
  headers: { apikey: publishable, authorization: `Bearer ${publishable}` },
});
results.push({ check: "anon pool_secrets", status: secrets.status, body: (await secrets.text()).slice(0, 80) });
const ledger = await fetch(`${url}/rest/v1/ledger_postings?select=id`, {
  headers: { apikey: env.TEST_ANON_JWT, authorization: `Bearer ${env.TEST_ANON_JWT}` },
});
results.push({ check: "anon jwt ledger", status: ledger.status, body: (await ledger.text()).slice(0, 80) });

const match = await sql`
  select id from public.pool_matches order by id desc limit 1
`;
const matchId = match[0]?.id;
if (!matchId) throw new Error("no pool match to observe");

const rawListen = listen(raw, `raw-${matchId}`, "pool_matches", `id=eq.${matchId}`);
const wrappedListen = listen(wrapped, `wrap-${matchId}`, "pool_matches", `id=eq.${matchId}`);
const walletListen = listen(authed, `wallet-${matchId}`, "wallet_accounts");
await new Promise((resolve) => setTimeout(resolve, 2500));
await sql`update public.pool_matches set version = version + 1 where id = ${matchId}`;
await sql`
  update public.wallet_accounts
  set balance = balance
  where id = (
    select id from public.wallet_accounts
    where kind = 'user_available' and account_type = 'test_credit'
    limit 1
  )
`;
const [rawResult, wrappedResult, walletResult] = await Promise.all([rawListen, wrappedListen, walletListen]);
const walletPayloads = walletResult.events.filter((event) => event.eventType || event.new || event.table);
results.push({
  check: "raw publishable pool update",
  status: rawResult.status,
  events: rawResult.events.filter((event) => event.eventType || event.new).length,
});
results.push({
  check: "frontend wrapper pool update",
  status: wrappedResult.status,
  events: wrappedResult.events.filter((event) => event.eventType || event.new).length,
});
results.push({
  check: "anon wallet realtime payloads",
  status: walletResult.status,
  payloads: walletPayloads.length,
});

await sql.end();
console.log(JSON.stringify(results, null, 2));
const walletDenied = results.find((row) => row.check === "anon wallet select")?.status === 401;
const secretsDenied = results.find((row) => row.check === "anon pool_secrets")?.status === 401;
const ledgerDenied = [401, 403].includes(results.find((row) => row.check === "anon jwt ledger")?.status);
const rawMissed = results.find((row) => row.check === "raw publishable pool update")?.events === 0;
const wrappedSaw = results.find((row) => row.check === "frontend wrapper pool update")?.events > 0;
const walletHidden = results.find((row) => row.check === "anon wallet realtime payloads")?.payloads === 0;
if (!walletDenied || !secretsDenied || !ledgerDenied || !rawMissed || !wrappedSaw || !walletHidden) {
  process.exitCode = 1;
}
