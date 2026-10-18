/**
 * Canonical lock order across money paths (migration 20261014356000): game row, then
 * participant wallets sorted by (owner, kind), then system accounts sorted by kind,
 * then the Slott budget. Each deterministic test forces the interleaving that deadlocked
 * under the old order; the repeated races run the same paths with random timing.
 * Isolated pvp_test schema. Requires TEST_DATABASE_URL.
 */
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { buildTestSchemaSql } from "./schema";
import { creditUserDeposit, fundTestTreasury, migrateTestSchemaToReal } from "./money";
import { testDatabaseUrl } from "./test-url";

const url = testDatabaseUrl();
const d = url ? describe : describe.skip;
const sql = url
  ? postgres(url, { max: 16, prepare: false, onnotice: () => {}, idle_timeout: 5 })
  : (null as never);
const LONG = 300_000;
const TRIALS = 10;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- rows and jsonb come back untyped
type Row = Record<string, any>;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const as = <T>(uid: string | null, fn: (tx: postgres.TransactionSql) => Promise<T>) =>
  sql.begin(async (tx) => {
    await tx`select set_config('test.uid', ${uid ?? ""}, true)`;
    return fn(tx);
  }) as Promise<T>;
const err = async (p: Promise<unknown>) => {
  try {
    await p;
    return "";
  } catch (e) {
    return String((e as Error).message);
  }
};

let n = 0;
async function player(dep = 100_000) {
  const id = randomUUID();
  await as(id, (tx) => tx`select pvp_test.ensure_profile(${`lo${++n}${id.slice(0, 8)}`.slice(0, 20)}, true)`);
  for (const k of ["user_available", "user_locked"])
    await sql`insert into pvp_test.wallet_accounts (owner_id, kind, asset, account_type)
      select ${id}::uuid, ${k}::pvp_test.account_kind, 'USD', 'real'
      where not exists (select 1 from pvp_test.wallet_accounts where owner_id = ${id}::uuid
        and kind = ${k}::pvp_test.account_kind and asset = 'USD' and account_type = 'real')`;
  if (dep > 0) await sql.begin((tx) => creditUserDeposit(tx, id, dep));
  return id;
}

/**
 * Another money path in canonical order, paused between its locks: wallets of `users`
 * (sorted, one at a time), then `then` (a statement run after the pause), then commit.
 */
function canonical(users: string[], then: (tx: postgres.TransactionSql) => Promise<unknown>, pauseMs = 400) {
  let ready!: () => void;
  const opened = new Promise<void>((r) => (ready = r));
  const done = sql.begin(async (tx) => {
    const sorted = (
      await tx`select u::text id from unnest(${users}::uuid[]) u order by u`
    ).map((r) => r.id as string);
    for (const u of sorted)
      await tx`select pvp_test._coinflip_lock_wallets(array[${u}]::uuid[], 'USD', 'real')`;
    ready();
    await sleep(pauseMs);
    await then(tx);
  });
  return { opened: Promise.race([opened, done]), done };
}

const deadlocks = async () => {
  await sleep(1200);
  return Number(
    (
      await sql`select pg_stat_clear_snapshot(), (select deadlocks from pg_stat_database where datname = current_database()) d`
    )[0]!.d,
  );
};
async function invariants() {
  const [r] = await sql`select
      (select coalesce(sum(balance), 0) from pvp_test.wallet_accounts where account_type = 'real')::bigint total,
      (select count(*) from (select a.id from pvp_test.wallet_accounts a
        left join pvp_test.ledger_postings p on p.account_id = a.id
        group by a.id, a.balance having a.balance <> coalesce(sum(p.amount), 0)) m)::int drift,
      (select count(*) from (select tx_id from pvp_test.ledger_postings group by tx_id
        having sum(amount) <> 0) x)::int unbalanced,
      (select count(*) from (select idempotency_key from pvp_test.ledger_transactions
        group by idempotency_key having count(*) > 1) y)::int dup_keys`;
  expect(r).toEqual({ total: "0", drift: 0, unbalanced: 0, dup_keys: 0 });
  await sql`select pvp_test._withdraw_basis_assert_rebuild_idempotent()`;
}

// ---------- jackpot ----------
async function jackpotRound(users: string[], amount = 1000) {
  for (const u of users) await as(u, (tx) => tx`select pvp_test.jackpot_join(${amount}, ${randomUUID()})`);
  const [g] =
    await sql`select id from pvp_test.jackpot_games where status in ('WAITING','ACTIVE') order by id desc limit 1`;
  await sql`update pvp_test.jackpot_games set scheduled_end_at = clock_timestamp() - interval '1 second'
    where id = ${g!.id}`;
  return Number(g!.id);
}
/** The winner the draw will pick, from the committed seed (test-only read of the secret). */
async function jackpotWinner(g: number) {
  const [w] = await sql`select e.user_id::text w
    from pvp_test.jackpot_games jg
    join pvp_test.jackpot_game_secrets s on s.game_id = jg.id
    cross join lateral pvp_test.jackpot_draw_ticket(s.server_seed, jg.id, jg.draw_version, jg.pot_amount) d
    join pvp_test.jackpot_entries e on e.game_id = jg.id and e.ticket_start <= d.ticket and e.ticket_end > d.ticket
    where jg.id = ${g}`;
  return w!.w as string;
}
const settleJackpot = (g: number) => as(null, (tx) => tx`select pvp_test.jackpot_settle(${g}::bigint) r`);
const jackpotState = async (g: number) =>
  (
    await sql`select g.status, p.last_error, p.attempts from pvp_test.jackpot_games g
      left join pvp_test.jackpot_payouts p on p.game_id = g.id where g.id = ${g}`
  )[0]!;

// ---------- prestige ----------
/** The seeded cash milestone, unlocked for `uid` with enough XP that a level sync keeps it. */
async function prestigeReward(uid: string) {
  const [r] = await sql`select id, level from pvp_test.prestige_rewards
    where reward_type = 'usdc' order by level limit 1`;
  await sql`insert into pvp_test.user_prestige (user_id, current_level, total_xp)
    values (${uid}::uuid, ${r!.level}, 1000000000)
    on conflict (user_id) do update set current_level = greatest(pvp_test.user_prestige.current_level, ${r!.level}),
      total_xp = 1000000000`;
  return r!.id as string;
}
const claim = (uid: string, reward: string) =>
  as(uid, (tx) => tx`select pvp_test.prestige_claim(${reward}::uuid)`);
const wager = (tx: postgres.TransactionSql, uid: string) =>
  tx`select pvp_test.prestige_award_wager(${uid}::uuid, 'coinflip', ${randomUUID()}, 1000, '{}'::jsonb)`;

// ---------- leaderboard ----------
let partner = "";
let template = "";
async function campaignWithAwards(players: string[], cents = 300) {
  const [c] = await sql`insert into pvp_test.leaderboard_campaigns (
      partner_user_id, template_id, template_version, name, status, timezone,
      starts_at, ends_at, games, prize_pool_cents, awards_created, funding_status
    ) values (
      ${partner}::uuid, ${template}::uuid, 1, 'Lock order', 'settling', 'UTC',
      now() - interval '2 hours', now() - interval '1 minute', array['coinflip'], ${cents * players.length}, true, 'checked'
    ) returning id`;
  for (let i = 0; i < players.length; i++)
    await sql`insert into pvp_test.leaderboard_prize_awards (campaign_id, player_id, final_rank, reward_cents, payout_status)
      values (${c!.id}, ${players[i]!}::uuid, ${i + 1}, ${cents}, 'pending')`;
  return c!.id as string;
}
const payCampaign = (c: string) => sql`select pvp_test._lb_pay_campaign(${c}::uuid)`;
const awards = async (c: string) =>
  (
    await sql`select payout_status s, last_error from pvp_test.leaderboard_prize_awards
      where campaign_id = ${c}::uuid order by final_rank`
  ).map((r) => r.s as string);

// ---------- referral ----------
async function qualifiedReferral(inviter: string, referred: string) {
  const [inv] = await sql`insert into pvp_test.referral_invites (inviter_user_id, code)
    values (${inviter}::uuid, ${Array.from({ length: 10 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("")})
    returning id`;
  const ledger = (
    await sql`select id from pvp_test.ledger_transactions where user_id = ${referred}::uuid and kind = 'deposit' limit 1`
  )[0]!.id as string;
  await sql`alter table pvp_test.crypto_deposits disable trigger user`;
  const [dep] = await sql`insert into pvp_test.crypto_deposits (chain_id, asset_key, tx_hash, block_number,
      from_address, to_address, units, usd_cents, user_id, status, ledger_tx_id, credited_at)
    values (8453, 'ETH', ${"0x" + randomUUID().replace(/-/g, "").padEnd(64, "0")}, 1,
      '0x1111111111111111111111111111111111111111', '0x2222222222222222222222222222222222222222',
      1, 10000, ${referred}::uuid, 'CREDITED', ${ledger}::uuid, now()) returning id`;
  await sql`alter table pvp_test.crypto_deposits enable trigger user`;
  await sql`alter table pvp_test.referrals disable trigger referral_status_guard`;
  const [r] = await sql`insert into pvp_test.referrals (inviter_user_id, referred_user_id, invite_id, status,
      qualifying_deposit_id, qualifying_deposit_cents, qualifying_play_cents, reward_cents, qualified_at)
    values (${inviter}::uuid, ${referred}::uuid, ${inv!.id}, 'QUALIFIED', ${dep!.id}, 10000, 10000, 1000, now())
    returning id`;
  await sql`alter table pvp_test.referrals enable trigger referral_status_guard`;
  return r!.id as string;
}
const referralState = async (id: string) =>
  (
    await sql`select r.status, (select count(*)::int from pvp_test.ledger_transactions t
        where t.idempotency_key = 'referral:reward:' || r.id::text) paid_txs
      from pvp_test.referrals r where r.id = ${id}::uuid`
  )[0]!;

d("canonical lock order", () => {
  beforeAll(async () => {
    await sql.unsafe(buildTestSchemaSql());
    await migrateTestSchemaToReal(sql, { realPlay: true, live: true });
    await fundTestTreasury(sql);
    for (const k of ["game_escrow", "house_revenue", "house_bankroll"])
      await sql`select pvp_test._system_account(${k}::pvp_test.account_kind, 'USD', 'real')`;
    await sql`update pvp_test.jackpot_config set entry_rate_limit = 100000`;
    // The house funds prizes and rewards from its bankroll.
    const bank = (await sql`select pvp_test._system_account('house_bankroll', 'USD', 'real') id`)[0]!.id;
    const ext = (await sql`select pvp_test._system_account('external_custody', 'USD', 'real') id`)[0]!.id;
    await sql.begin(async (tx) => {
      const [t] = await tx`insert into pvp_test.ledger_transactions (kind, idempotency_key, account_type)
        values ('deposit', ${randomUUID()}, 'real') returning id`;
      await tx`select pvp_test._post(${t!.id}::uuid, ${ext}::uuid, -100000000)`;
      await tx`select pvp_test._post(${t!.id}::uuid, ${bank}::uuid, 100000000)`;
    });
    const admin = await player(0);
    partner = await player(0);
    await sql`insert into pvp_test.partners (user_id, created_by, leaderboard) values (${partner}::uuid, ${admin}::uuid, true)`;
    template = (await sql`select id from pvp_test.leaderboard_templates where status = 'active' limit 1`)[0]!
      .id as string;
  }, 600_000);
  afterAll(async () => {
    await sql`drop schema if exists pvp_test cascade`;
    await sql.end();
  });

  it(
    "jackpot_settle locks every player before the winner's ledger write (forced interleaving)",
    async () => {
      const d0 = await deadlocks();
      let forced = 0;
      for (let k = 0; forced < TRIALS && k < TRIALS * 6; k++) {
        const ps = [await player(), await player(), await player()];
        const g = await jackpotRound(ps, 1000 + k);
        const w = await jackpotWinner(g);
        // The interleaving needs a loser that sorts before the winner.
        const [lo] = await sql`select u::text id from unnest(${ps.filter((p) => p !== w)}::uuid[]) u
          where u < ${w}::uuid order by u limit 1`;
        if (!lo) {
          expect(await err(settleJackpot(g))).toBe("");
          continue;
        }
        forced++;
        // A canonical path holds the loser, pauses, then wants the winner. The old
        // settle took the winner first (ledger trigger), then waited on the loser.
        const other = canonical([lo.id as string], (tx) =>
          tx`select pvp_test._coinflip_lock_wallets(array[${w}]::uuid[], 'USD', 'real')`,
        );
        await other.opened;
        const [settled, held] = await Promise.all([err(settleJackpot(g)), err(other.done)]);
        expect([settled, held]).toEqual(["", ""]);
        const s = await jackpotState(g);
        expect([s.status, s.last_error]).toEqual(["COMPLETED", null]);
      }
      expect(forced).toBe(TRIALS);
      expect((await deadlocks()) - d0).toBe(0);
      await invariants();
    },
    LONG,
  );

  it(
    "prestige_claim takes the wallets before the prestige row (forced interleaving)",
    async () => {
      const d0 = await deadlocks();
      for (let k = 0; k < TRIALS; k++) {
        const u = await player();
        const reward = await prestigeReward(u);
        // A settlement: wallets, then prestige XP for the same player.
        const other = canonical([u], (tx) => wager(tx, u));
        await other.opened;
        const [claimed, settled] = await Promise.all([err(claim(u, reward)), err(other.done)]);
        expect([claimed, settled]).toEqual(["", ""]);
        const [c] = await sql`select count(*)::int c from pvp_test.user_reward_claims
          where user_id = ${u}::uuid and reward_id = ${reward}::uuid and transaction_id is not null`;
        expect(c!.c).toBe(1);
      }
      expect((await deadlocks()) - d0).toBe(0);
      await invariants();
    },
    LONG,
  );

  it(
    "leaderboard payout locks all winners before the bankroll (forced interleaving)",
    async () => {
      const d0 = await deadlocks();
      for (let k = 0; k < TRIALS; k++) {
        const [a, b] = [await player(), await player()];
        const c = await campaignWithAwards([a, b]);
        // A canonical path holds the rank-2 winner, pauses, then takes the bankroll.
        // The old payout paid rank 1 (wallet, bankroll) and then waited on rank 2.
        const other = canonical([b], (tx) =>
          tx`select pvp_test._lock_system_accounts(array['house_bankroll']::pvp_test.account_kind[], 'USD', 'real')`,
        );
        await other.opened;
        const [paid, held] = await Promise.all([err(payCampaign(c)), err(other.done)]);
        expect([paid, held]).toEqual(["", ""]);
        expect(await awards(c)).toEqual(["paid", "paid"]);
      }
      expect((await deadlocks()) - d0).toBe(0);
      await invariants();
    },
    LONG,
  );

  it(
    "leaderboard_tick pays a settling campaign while winners' settlements and deposits race it",
    async () => {
      const d0 = await deadlocks();
      for (let k = 0; k < TRIALS; k++) {
        const ws = [await player(), await player(), await player()];
        // The tick pays at most 10 settling campaigns; earlier tests' are already paid.
        await sql`update pvp_test.leaderboard_campaigns set status = 'completed' where status = 'settling'`;
        const c = await campaignWithAwards(ws, 200);
        await sql`update pvp_test.worker_tick_gate set last_run_at = clock_timestamp() - interval '1 minute'
          where name = 'leaderboards'`;
        const res = await Promise.all([
          err(sql`select pvp_test.leaderboard_tick()`),
          err(canonical([ws[2]!, ws[0]!], (tx) => creditUserDeposit(tx, ws[0]!, 100), 50).done),
          err(sql.begin((tx) => creditUserDeposit(tx, ws[1]!, 100))),
          err(canonical([ws[1]!], (tx) => wager(tx, ws[1]!), 30).done),
        ]);
        expect(res).toEqual(["", "", "", ""]);
        expect(await awards(c)).toEqual(["paid", "paid", "paid"]);
      }
      expect((await deadlocks()) - d0).toBe(0);
      await invariants();
    },
    LONG,
  );

  it(
    "jackpot settlement, prestige claims and payouts race each other with random timing",
    async () => {
      const d0 = await deadlocks();
      for (let k = 0; k < TRIALS; k++) {
        const ps = [await player(), await player(), await player()];
        const g = await jackpotRound(ps, 1500 + k);
        const rewards = await Promise.all(ps.map((p) => prestigeReward(p)));
        const c = await campaignWithAwards([ps[2]!, ps[0]!], 150);
        const jitter = () => sleep(Math.floor(Math.random() * 30));
        const res = await Promise.all([
          jitter().then(() => err(settleJackpot(g))),
          jitter().then(() => err(claim(ps[0]!, rewards[0]!))),
          jitter().then(() => err(claim(ps[1]!, rewards[1]!))),
          jitter().then(() => err(payCampaign(c))),
          jitter().then(() => err(canonical(ps, (tx) => wager(tx, ps[2]!), 10).done)),
          jitter().then(() => err(sql.begin((tx) => creditUserDeposit(tx, ps[1]!, 300)))),
        ]);
        expect(res).toEqual(res.map(() => ""));
        expect((await jackpotState(g)).status).toBe("COMPLETED");
        expect(await awards(c)).toEqual(["paid", "paid"]);
      }
      expect((await deadlocks()) - d0).toBe(0);
      await invariants();
    },
    LONG,
  );

  it(
    "a referral reward inside a contended transaction is deferred, not blocked, and pays once later",
    async () => {
      const inviter = await player(1000);
      const referred = await player(10_000);
      const id = await qualifiedReferral(inviter, referred);
      // The inviter's wallets are busy: the reward must not wait on them.
      const other = canonical([inviter], async () => {}, 1500);
      await other.opened;
      const t0 = performance.now();
      expect(await err(sql`select pvp_test.referral_progress(${referred}::uuid)`)).toBe("");
      expect(performance.now() - t0).toBeLessThan(1000);
      expect(await referralState(id)).toEqual({ status: "QUALIFIED", paid_txs: 0 });
      const [deferred] = await sql`select count(*)::int c from pvp_test.audit_logs
        where action = 'referral_reward_deferred' and actor_id = ${inviter}::uuid`;
      expect(deferred!.c).toBeGreaterThan(0);
      await other.done;
      // Retried by the next progress call; concurrent retries still pay exactly once.
      const r = await Promise.all([1, 2, 3].map(() => err(sql`select pvp_test.referral_progress(${referred}::uuid)`)));
      expect(r).toEqual(["", "", ""]);
      expect(await referralState(id)).toEqual({ status: "REWARDED", paid_txs: 1 });
      await invariants();
    },
    LONG,
  );

  it("every patched function takes participant wallets before system accounts", async () => {
    const order = await sql`select p.proname, p.prosrc from pg_proc p
      where p.pronamespace = 'pvp_test'::regnamespace
        and p.proname in ('jackpot_settle','prestige_claim','_lb_pay_campaign','promo_claim','partner_admin_topup',
                          '_slot_settle','_roulette_settle')`;
    expect(order.length).toBe(7);
    for (const f of order) {
      const src = f.prosrc as string;
      const wallets = src.search(/_coinflip_lock_wallets|order by w\.owner_id, w\.kind/);
      const system = src.search(/_lock_system_accounts\(|id = bank for update|_post\(/);
      expect({ f: f.proname, ok: wallets >= 0 && wallets < system }).toEqual({ f: f.proname, ok: true });
    }
    const [ref] = await sql`select prosrc from pg_proc where pronamespace = 'pvp_test'::regnamespace
      and proname = 'referral_try_pay'`;
    expect((ref!.prosrc as string).match(/for update nowait/g)?.length).toBe(2);
  });
});
