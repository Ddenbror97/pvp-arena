import {
  readFileSync,
  writeFileSync,
  existsSync,
  appendFileSync,
  mkdirSync,
  readdirSync,
} from "node:fs";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { connect, assertStaging, seedSyntheticUser } from "./staging-lib.mjs";
assertStaging();
const userCount = Number(process.env.FPS_STAGING_USER_COUNT ?? 16);
if (!Number.isInteger(userCount) || userCount < 16 || userCount > 64)
  throw Error("Staging user count must be 16..64");
const sql = connect(1);
const headers = {
  apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  Authorization: "Bearer " + process.env.SUPABASE_SERVICE_ROLE_KEY,
};
const clientOptions = {
  auth: { persistSession: false, autoRefreshToken: false },
  global: {
    fetch: (url, init) => {
      const h = new Headers(init?.headers);
      if (h.get("Authorization") === "Bearer " + process.env.SUPABASE_PUBLISHABLE_KEY)
        h.delete("Authorization");
      return fetch(url, { ...init, headers: h });
    },
  },
};
try {
  const migrationCount = Number(
    (await sql`select count(*) n from supabase_migrations.schema_migrations`)[0].n,
  );
  if (
    migrationCount !== readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql")).length
  )
    throw Error("Full source migrations must be applied before staging setup");
  const state = (await sql`select public._money_state() state`)[0].state;
  if (state === "PRE_MIGRATION") {
    // These are the same non-user snapshot stand-ins used by the existing migration test fixture.
    const hashes = [
      "0xc948435f306a17ee06a42ae73a9233e33b0af77993ed30d9ae13c75278f2d947",
      "0xade51fcf975f1a9227b779afe2e9ddb1d3085ee1ccc71a42b44f0d11ca6e69fc",
    ];
    await sql`update public.crypto_settings set watch_only=true,withdrawals_enabled=false,deposits_enabled=false,real_play_enabled=false`;
    for (let i = 0; i < hashes.length; i++)
      await sql`insert into public.crypto_deposits(chain_id,asset_key,tx_hash,log_index,block_number,from_address,to_address,units,usd_cents,status,confirmed_at,closed_reason) values(8453,'USDC',${hashes[i]},${i},${51757061 + i},${"0x" + "1".repeat(40)},${"0x" + "2".repeat(40)},${i ? 4500000 : 2000000},${i ? 450 : 200},'CONFIRMED',now(),'ISOLATED_STAGING_SNAPSHOT_STANDIN') on conflict do nothing`;
    console.log(
      JSON.stringify({
        moneyMigration: (await sql`select public._money_migrate_v1() result`)[0].result,
      }),
    );
    console.log(
      JSON.stringify({
        moneyFinalization: (await sql`select public._money_finalize_v1() result`)[0].result,
      }),
    );
  }
  await sql`update public.crypto_settings set watch_only=true,deposits_enabled=false,withdrawals_enabled=false,real_play_enabled=true`;
  await sql`update public.fps_config set enabled=true,cash_enabled=true,practice_allowed=true where id=1`;
  const file = ".env.fps-staging-users.json";
  let users = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : [];
  if (users.length < userCount) {
    const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    for (let i = users.length; i < userCount; i++) {
      const username = "fpsqa_" + randomBytes(4).toString("hex"),
        email = username + "@example.invalid",
        password = randomBytes(24).toString("base64url") + "aA9!";
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        app_metadata: { environment: "isolated-fps-staging" },
      });
      if (error) throw Error("Test user creation: " + error.code);
      users.push({ id: data.user.id, username, email, password });
      writeFileSync(file, JSON.stringify(users, null, 2));
    }
  }
  for (const user of users) {
    const client = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_PUBLISHABLE_KEY,
        clientOptions,
      ),
      { data, error } = await client.auth.signInWithPassword({
        email: user.email,
        password: user.password,
      });
    if (error) throw Error("Test sign-in: " + error.code);
    user.session = data.session;
    user.claims = JSON.parse(
      Buffer.from(data.session.access_token.split(".")[1], "base64url").toString(),
    );
    const profile = await client.rpc("ensure_profile", {
      p_username: user.username,
      p_age_confirmed: true,
    });
    if (profile.error) throw Error("Test profile: " + profile.error.message);
    await seedSyntheticUser(sql, user.id);
  }
  writeFileSync(file, JSON.stringify(users, null, 2));
  if (!process.env.FPS_RUNTIME_SECRET) {
    const secret = randomBytes(32).toString("hex");
    appendFileSync(
      ".env.fps-staging",
      `FPS_RUNTIME_SECRET=${secret}\nFPS_RUNTIME_ORIGIN=http://127.0.0.1:8789\n`,
    );
  }
  console.log(
    JSON.stringify({
      project: process.env.SUPABASE_PROJECT_ID,
      users: users.map((u) => ({ id: u.id, username: u.username })),
      invariants: (await sql`select public.money_real_invariants() result`)[0].result,
      cron: await sql`select count(*) filter(where active)::int active from cron.job`,
    }),
  );
} finally {
  await sql.end({ timeout: 2 });
}
