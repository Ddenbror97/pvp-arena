/**
 * Partner leaderboards. Isolated pvp_test schema. Requires TEST_DATABASE_URL.
 * Rankings come from settled coinflip stakes. A second sync must not double-count.
 */
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { buildTestSchemaSql } from "./schema";
import { adminClaims, openAdminStepup } from "./admin-stepup";
import { creditUserDeposit, migrateTestSchemaToReal } from "./money";
import { testDatabaseUrl } from "./test-url";

const url = testDatabaseUrl();
const d = url ? describe : describe.skip;
const sql = url
  ? postgres(url, { max: 4, prepare: false, onnotice: () => {}, idle_timeout: 5 })
  : (null as never);
afterAll(async () => {
  if (url) await sql.end();
});

const adminSessions = new Map<string, string>();
async function as<T>(
  uid: string | null,
  fn: (tx: postgres.TransactionSql) => Promise<T>,
  claims?: Record<string, unknown>,
): Promise<T> {
  const sessionId = uid ? adminSessions.get(uid) : undefined;
  const resolved =
    claims ?? (uid && sessionId ? JSON.parse(adminClaims(uid, sessionId)) : undefined);
  return sql.begin(async (tx) => {
    await tx`select set_config('test.uid', ${uid ?? ""}, true)`;
    if (resolved) {
      await tx`select set_config('request.jwt.claims', ${JSON.stringify(resolved)}, true)`;
    }
    return fn(tx);
  }) as Promise<T>;
}

const hash = "ab".repeat(32);

async function settledFlip(
  tx: postgres.TransactionSql,
  creator: string,
  opponent: string,
  amount: number,
  when: Date,
  accountType: "real" | "test_credit",
) {
  await tx`alter table pvp_test.coinflip_entries disable trigger coinflip_entry_check`;
  const asset = accountType === "real" ? "USD" : "TEST_USD";
  const domain = accountType === "real" ? "REAL_USD" : "TEST_USD";
  const pot = amount * 2;
  const fee = Math.floor((pot * 500) / 10000);
  const end = new Date(when.getTime() + 1000);
  if (accountType === "real") {
    await creditUserDeposit(tx, creator, amount * 10);
    await creditUserDeposit(tx, opponent, amount * 10);
  }
  const [game] = await tx`insert into pvp_test.coinflip_games (
    status, creator_id, creator_side, amount, pot_amount, fee_bps, asset, account_type, money_domain,
    server_seed_hash, expires_at
  ) values (
    'WAITING', ${creator}::uuid, 'HEADS', ${amount}, ${pot}, 500, ${asset}, ${accountType}, ${domain},
    ${hash}, ${end}
  ) returning id`;
  for (const [slot, user, side] of [
    [1, creator, "HEADS"],
    [2, opponent, "TAILS"],
  ] as const) {
    const avail = (
      await tx`select pvp_test._user_account(${user}::uuid, 'user_available'::pvp_test.account_kind, ${asset}, ${accountType}) id`
    )[0].id as string;
    const locked = (
      await tx`select pvp_test._user_account(${user}::uuid, 'user_locked'::pvp_test.account_kind, ${asset}, ${accountType}) id`
    )[0].id as string;
    const [ledger] =
      await tx`insert into pvp_test.ledger_transactions (kind, idempotency_key, account_type, user_id, game_id)
      values ('coinflip_entry', ${`cf-${game.id}-${slot}-${randomUUID()}`}, ${accountType}, ${user}::uuid, ${game.id}) returning id`;
    if (accountType === "real") {
      await tx`select pvp_test._post(${ledger.id}::uuid, ${avail}::uuid, ${-amount}::bigint)`;
      await tx`select pvp_test._post(${ledger.id}::uuid, ${locked}::uuid, ${amount}::bigint)`;
    }
    await tx`insert into pvp_test.coinflip_entries (game_id, user_id, slot, side, amount, ledger_tx_id, idempotency_key, created_at)
      values (${game.id}, ${user}::uuid, ${slot}, ${side}::pvp_test.coin_side, ${amount}, ${ledger.id}, ${`entry-${game.id}-${slot}-${randomUUID().slice(0, 8)}`}, ${when})`;
  }
  await tx`update pvp_test.coinflip_games set
    status = 'READY', opponent_id = ${opponent}::uuid,
    joined_at = least(${when}::timestamptz, clock_timestamp() - interval '2 seconds'),
    animation_start_at = least(${when}::timestamptz, clock_timestamp() - interval '2 seconds'),
    animation_end_at = least(${end}::timestamptz, clock_timestamp() - interval '1 second')
    where id = ${game.id}`;
  await tx`insert into pvp_test.coinflip_results (
    game_id, protocol_version, draw_version, server_seed_hash, message, hmac_hex, first_byte, winning_side, winner_id
  ) values (
    ${game.id}, 'v1', 1, ${hash}, ${"PVPCasino:coinflip:v1:" + game.id + ":1"}, ${"cd".repeat(32)}, 1, 'TAILS', ${opponent}::uuid
  )`;
  await tx`update pvp_test.coinflip_games
    set status = 'FLIPPING', winner_id = ${opponent}::uuid, winning_side = 'TAILS'
    where id = ${game.id}`;
  await tx`update pvp_test.coinflip_games set status = 'SETTLEMENT' where id = ${game.id}`;
  const [payTx] =
    await tx`insert into pvp_test.ledger_transactions (kind, idempotency_key, account_type, user_id)
      values ('coinflip_settlement', ${`cf-pay-${game.id}-${randomUUID()}`}, ${accountType}, ${opponent}::uuid)
      returning id`;
  await tx`insert into pvp_test.coinflip_payouts (game_id, beneficiary_id, kind, amount, ledger_tx_id, idempotency_key, status, settled_at)
    values (${game.id}, ${opponent}::uuid, 'WINNER', ${pot - fee}, ${payTx.id}, ${`cf-pay-${game.id}`}, 'SETTLED', ${end})`;
  await tx`update pvp_test.coinflip_games set
    status = 'COMPLETED', server_seed = ${"cd".repeat(32)}, completed_at = ${end},
    payout_amount = ${pot - fee}, fee_amount = ${fee}
    where id = ${game.id}`;
  return game.id as number;
}

d("partner leaderboards", () => {
  beforeAll(async () => {
    await sql.unsafe(buildTestSchemaSql());
    await migrateTestSchemaToReal(sql, { realPlay: true, live: true });
  }, 180_000);

  it("isolates partners, ranks settled stakes once, and pays prizes once", async () => {
    const admin = randomUUID();
    const partner = randomUUID();
    const other = randomUUID();
    const stranger = randomUUID();
    const playerA = randomUUID();
    const playerB = randomUUID();
    const playerC = randomUUID();
    const name = (id: string, prefix: string) => `${prefix}${id.replace(/-/g, "").slice(0, 8)}`;
    for (const [id, prefix] of [
      [admin, "a"],
      [partner, "p"],
      [other, "o"],
      [stranger, "s"],
      [playerA, "x"],
      [playerB, "y"],
      [playerC, "z"],
    ] as const) {
      await as(id, (tx) => tx`select pvp_test.ensure_profile(${name(id, prefix)}, true)`);
    }
    await sql`insert into pvp_test.user_roles (user_id, role) values (${admin}, 'admin'::pvp_test.app_role)`;
    adminSessions.set(admin, await openAdminStepup(sql, admin));
    await sql`insert into pvp_test.partners (user_id, created_by, leaderboard) values (${partner}, ${admin}, true), (${other}, ${admin}, true)`;
    const [template] =
      await sql`select id from pvp_test.leaderboard_templates where status = 'active' limit 1`;

    await expect(
      as(stranger, (tx) => tx`select pvp_test.leaderboard_partner_list('', 'updated', 20, 0)`),
    ).rejects.toThrow(/NOT_A_PARTNER/);
    const now = Date.now();
    const start = new Date(now + 86_400_000).toISOString();
    const end = new Date(now + 86_400_000 + 2_592_000_000).toISOString();
    const [saved] = await as(
      partner,
      (tx) =>
        tx`select pvp_test.leaderboard_partner_save(${tx.json({
          template_id: template.id,
          name: "Weekend race",
          description: "Settled stakes only",
          visibility: "public",
          timezone: "America/New_York",
          starts_at: start,
          ends_at: end,
          games: ["coinflip"],
          min_wager_cents: 0,
          tiers: [{ rank_start: 1, rank_end: 1, reward_cents: 500 }],
        })}) as r`,
    );
    const draftId = saved.r.campaign.id as string;
    const [audience] =
      await sql`select audience from pvp_test.leaderboard_campaigns where id = ${draftId}::uuid`;
    expect(audience.audience).toBe("attributed");
    await expect(
      as(other, (tx) => tx`select pvp_test.leaderboard_partner_get(${draftId}::uuid)`),
    ).rejects.toThrow(/NOT_FOUND/);
    await expect(
      as(
        partner,
        (tx) =>
          tx`select pvp_test.leaderboard_partner_save(${tx.json({
            id: draftId,
            template_id: template.id,
            name: "Overlap",
            description: "",
            visibility: "public",
            timezone: "UTC",
            starts_at: start,
            ends_at: end,
            games: ["coinflip"],
            min_wager_cents: 0,
            tiers: [
              { rank_start: 1, rank_end: 2, reward_cents: 100 },
              { rank_start: 2, rank_end: 2, reward_cents: 100 },
            ],
          })})`,
      ),
    ).rejects.toThrow(/PRIZE_OVERLAP/);
    await as(partner, (tx) => tx`select pvp_test.leaderboard_partner_submit(${draftId}::uuid)`);
    await expect(
      as(
        partner,
        (tx) =>
          tx`select pvp_test.leaderboard_admin_decide(${draftId}::uuid, 'approve', 'not an admin')`,
      ),
    ).rejects.toThrow(/FORBIDDEN/);
    await expect(
      as(
        admin,
        (tx) => tx`select pvp_test.leaderboard_admin_decide(${draftId}::uuid, 'approve', '')`,
      ),
    ).rejects.toThrow(/BANKROLL_SHORT/);
    const [approved] = await as(
      admin,
      (tx) =>
        tx`select pvp_test.leaderboard_admin_decide(${draftId}::uuid, 'approve', 'bankroll is short') as r`,
    );
    expect(approved.r.campaign.status).toBe("scheduled");
    expect(approved.r.funding.shortfall).toBe(true);
    expect(approved.r.funding.status).toBe("checked");
    await expect(
      as(
        partner,
        (tx) =>
          tx`select pvp_test.leaderboard_partner_save(${tx.json({
            id: draftId,
            template_id: template.id,
            name: "Changed after approval",
            description: "",
            visibility: "public",
            timezone: "UTC",
            starts_at: start,
            ends_at: end,
            games: ["coinflip"],
            min_wager_cents: 0,
            tiers: [{ rank_start: 1, rank_end: 1, reward_cents: 500 }],
          })})`,
      ),
    ).rejects.toThrow(/NOT_EDITABLE/);

    const [race] = await sql`insert into pvp_test.leaderboard_campaigns (
      partner_user_id, template_id, template_version, name, description, status, timezone,
      starts_at, ends_at, min_wager_cents, games, prize_pool_cents
    ) values (
      ${partner}, ${template.id}, 1, 'Settled race', '', 'draft', 'UTC',
      now() - interval '2 hours', now() - interval '1 minute', 500, array['coinflip'], 700
    ) returning id`;
    await sql`insert into pvp_test.leaderboard_prize_tiers (campaign_id, rank_start, rank_end, reward_cents) values
      (${race.id}, 1, 1, 500), (${race.id}, 2, 2, 100), (${race.id}, 3, 3, 100)`;
    await sql`update pvp_test.leaderboard_campaigns set status = 'active', funding_status = 'checked', funding_shortfall = true,
      rules_frozen_at = now(), approved_by = ${admin}, approved_at = now(), started_at = now() - interval '2 hours'
      where id = ${race.id}`;
    await expect(
      sql`update pvp_test.leaderboard_campaigns set name = 'renamed' where id = ${race.id}`,
    ).rejects.toThrow(/CAMPAIGN_FROZEN/);

    await sql`alter table pvp_test.coinflip_games disable trigger coinflip_guard`;
    await sql`alter table pvp_test.coinflip_entries disable trigger coinflip_entry_check`;
    try {
      await sql.begin(async (tx) => {
        const ago = (minutes: number) => new Date(Date.now() - minutes * 60 * 1000);
        await settledFlip(tx, partner, playerA, 2000, ago(40), "real");
        await settledFlip(tx, partner, playerC, 2000, ago(30), "real");
        await settledFlip(tx, partner, playerB, 1000, ago(20), "real");
        await settledFlip(tx, partner, playerA, 100, ago(25), "real");
        await settledFlip(tx, partner, playerA, 50000, ago(35), "test_credit");
        const [cancelled] = await tx`insert into pvp_test.coinflip_games (
          status, creator_id, creator_side, amount, pot_amount, fee_bps, asset, account_type, money_domain,
          server_seed_hash, expires_at, cancelled_at, cancel_reason
        ) values (
          'CANCELLED', ${playerA}::uuid, 'HEADS', 50000, 100000, 500, 'USD', 'real', 'REAL_USD',
          ${hash}, now() - interval '2 hours', now() - interval '30 minutes', 'EXPIRED'
        ) returning id`;
        const [ledger] =
          await tx`insert into pvp_test.ledger_transactions (kind, idempotency_key, account_type, user_id)
          values ('jackpot_entry', ${`cancel-${randomUUID()}`}, 'real', ${playerA}::uuid) returning id`;
        await tx`insert into pvp_test.coinflip_entries (game_id, user_id, slot, side, amount, ledger_tx_id, idempotency_key, created_at)
          values (${cancelled.id}, ${playerA}::uuid, 1, 'HEADS', 50000, ${ledger.id}, ${`cancel-${cancelled.id}`}, now() - interval '30 minutes')`;
      });
    } finally {
      await sql`alter table pvp_test.coinflip_games enable trigger coinflip_guard`;
      await sql`alter table pvp_test.coinflip_entries enable trigger coinflip_entry_check`;
    }

    await sql`select pvp_test._withdraw_basis_rebuild_full()`;
    await sql`select pvp_test._lb_sync(${race.id}::uuid)`;
    await sql`select pvp_test._lb_sync(${race.id}::uuid)`;
    const events =
      await sql`select player_id, qualifying_cents from pvp_test.leaderboard_wager_events
      where campaign_id = ${race.id} and not voided order by event_at`;
    expect(events.map((row) => row.player_id)).toEqual([playerA, playerC, playerB]);
    expect(events.map((row) => Number(row.qualifying_cents))).toEqual([2000, 2000, 1000]);
    const ranks =
      await sql`select player_id, rank, qualifying_cents from pvp_test.leaderboard_entries
      where campaign_id = ${race.id} and qualifying_cents > 0 order by rank`;
    expect(ranks.map((row) => row.player_id)).toEqual([playerA, playerC, playerB]);

    await sql`insert into pvp_test.money_migrations (version, state) values ('real_usd_v1', 'FINALIZED')
      on conflict (version) do update set state = 'FINALIZED'`;
    await sql`update pvp_test.worker_tick_gate set last_run_at = '-infinity' where name = 'leaderboards'`;
    const [tick] = await sql`select pvp_test.leaderboard_tick() as r`;
    expect(tick.r.skipped).toBe(false);
    const [done] =
      await sql`select status from pvp_test.leaderboard_campaigns where id = ${race.id}`;
    expect(done.status).toBe("completed");
    const awards =
      await sql`select player_id, final_rank, reward_cents, payout_status from pvp_test.leaderboard_prize_awards
      where campaign_id = ${race.id} order by final_rank`;
    expect(
      awards.map((row) => [row.player_id, Number(row.reward_cents), row.payout_status]),
    ).toEqual([
      [playerA, 500, "paid"],
      [playerC, 100, "paid"],
      [playerB, 100, "paid"],
    ]);
    const [paid] =
      await sql`select count(*)::int n from pvp_test.ledger_transactions where kind = 'leaderboard_prize'`;
    expect(paid.n).toBe(3);
    await sql`update pvp_test.worker_tick_gate set last_run_at = '-infinity' where name = 'leaderboards'`;
    await sql`select pvp_test.leaderboard_tick()`;
    const [paidAgain] =
      await sql`select count(*)::int n from pvp_test.ledger_transactions where kind = 'leaderboard_prize'`;
    expect(paidAgain.n).toBe(3);

    const holds =
      await sql`select user_id, reward_cents, required_wager_cents, qualifying_wager_cents, status
      from pvp_test.leaderboard_prize_holds`;
    const byUser = new Map(holds.map((row) => [row.user_id, row]));
    for (const [id, cents] of [
      [playerA, 500],
      [playerB, 100],
      [playerC, 100],
    ] as const) {
      const row = byUser.get(id);
      expect(Number(row?.reward_cents)).toBe(cents);
      expect(Number(row?.required_wager_cents)).toBe(cents);
      expect(Number(row?.qualifying_wager_cents)).toBe(0);
      expect(row?.status).toBe("CLAIMED");
    }
    const cashTx = randomUUID();
    await sql.begin(async (db) => {
      await db`insert into pvp_test.ledger_transactions (id, kind, idempotency_key, account_type, user_id, memo)
        values (${cashTx}::uuid, 'deposit', ${"lb-cash-" + playerA}, 'real', ${playerA}::uuid, 'Deposited')`;
      await db`select pvp_test._post(${cashTx}::uuid, pvp_test._user_account(${playerA}::uuid, 'user_available', 'USD', 'real'), 100000)`;
      await db`select pvp_test._post(${cashTx}::uuid, pvp_test._system_account('external_custody', 'USD', 'real'), -100000)`;
    });
    await expect(
      sql`select pvp_test._assert_reward_holds(${playerA}::uuid, 500, 500)`,
    ).rejects.toThrow(/LEADERBOARD_PLAYTHROUGH/);
    await sql`select pvp_test._assert_reward_holds(${playerA}::uuid, 800, 300)`;
    await expect(
      sql`select pvp_test._assert_reward_holds(${playerA}::uuid, 800, 301)`,
    ).rejects.toThrow(/LEADERBOARD_PLAYTHROUGH/);
    await sql`select pvp_test.leaderboard_apply_prize_wager(${playerA}::uuid, 'coinflip', 'not-roulette')`;
    const [ignored] =
      await sql`select qualifying_wager_cents from pvp_test.leaderboard_prize_holds where user_id = ${playerA}::uuid`;
    expect(Number(ignored.qualifying_wager_cents)).toBe(0);
    await sql`alter table pvp_test.coinflip_entries disable trigger coinflip_entry_check`;
    const flipId = await sql.begin((tx) => settledFlip(tx, playerA, playerB, 200, new Date(), "real"));
    await sql`alter table pvp_test.coinflip_entries enable trigger coinflip_entry_check`;
    const flipSource = `${flipId}:${playerA}`;
    await sql`select pvp_test.referral_note_play(${playerA}::uuid, 'coinflip', ${flipSource}, 1)`;
    await sql`select pvp_test.referral_note_play(${playerA}::uuid, 'coinflip', ${flipSource}, 999999)`;
    await sql`alter table pvp_test.coinflip_entries disable trigger coinflip_entry_check`;
    const testFlip = await sql.begin((tx) =>
      settledFlip(tx, playerA, playerB, 500, new Date(), "test_credit"),
    );
    await sql`alter table pvp_test.coinflip_entries enable trigger coinflip_entry_check`;
    await sql`select pvp_test.referral_note_play(${playerA}::uuid, 'coinflip', ${`${testFlip}:${playerA}`}, 500)`;
    const [fromFlip] =
      await sql`select qualifying_wager_cents, status from pvp_test.leaderboard_prize_holds where user_id = ${playerA}::uuid`;
    expect(Number(fromFlip.qualifying_wager_cents)).toBe(200);
    expect(fromFlip.status).toBe("WAGERING");
    const [game] = await sql`insert into pvp_test.roulette_games (
      status, wheel_version, money_domain, asset, account_type, min_bet, max_bet, max_pot,
      max_bets_per_user, max_bets_per_round, betting_seconds, lock_ms, spin_ms, stuck_cancel_seconds, server_seed_hash
    )
    select 'LOCKED', wheel_version, 'REAL_USD', 'USD', 'real', min_bet, max_bet, max_pot,
      max_bets_per_user, max_bets_per_round, betting_seconds, lock_ms, spin_ms, stuck_cancel_seconds, ${hash}
    from pvp_test.roulette_config returning id`;
    const [entry] =
      await sql`insert into pvp_test.ledger_transactions (kind, idempotency_key, account_type, user_id)
      values ('roulette_entry', ${`rw-${randomUUID()}`}, 'real', ${playerA}::uuid) returning id`;
    const [partial] = await sql`insert into pvp_test.roulette_bets (
      game_id, user_id, color, amount, multiplier_bps, ledger_tx_id, idempotency_key
    ) values (${game.id}, ${playerA}::uuid, 'RED', 200, 20000, ${entry.id}, ${randomUUID()}) returning id`;
    await sql`update pvp_test.roulette_bets set status = 'LOST', settled_at = now(), payout_amount = 0 where id = ${partial.id}::uuid`;
    await sql`select pvp_test.referral_note_play(${playerA}::uuid, 'roulette', ${partial.id}::text, 200)`;
    await sql`select pvp_test.referral_note_play(${playerA}::uuid, 'roulette', ${partial.id}::text, 200)`;
    const [mid] =
      await sql`select qualifying_wager_cents, status from pvp_test.leaderboard_prize_holds where user_id = ${playerA}::uuid`;
    expect(Number(mid.qualifying_wager_cents)).toBe(400);
    expect(mid.status).toBe("WAGERING");
    const [restTx] =
      await sql`insert into pvp_test.ledger_transactions (kind, idempotency_key, account_type, user_id)
      values ('roulette_entry', ${`rw-${randomUUID()}`}, 'real', ${playerA}::uuid) returning id`;
    const [rest] = await sql`insert into pvp_test.roulette_bets (
      game_id, user_id, color, amount, multiplier_bps, ledger_tx_id, idempotency_key
    ) values (${game.id}, ${playerA}::uuid, 'RED', 300, 20000, ${restTx.id}, ${randomUUID()}) returning id`;
    await sql`update pvp_test.roulette_bets set status = 'LOST', settled_at = now(), payout_amount = 0 where id = ${rest.id}::uuid`;
    await sql`select pvp_test.referral_note_play(${playerA}::uuid, 'roulette', ${rest.id}::text, 300)`;
    const [cleared] =
      await sql`select qualifying_wager_cents, status from pvp_test.leaderboard_prize_holds where user_id = ${playerA}::uuid`;
    expect(Number(cleared.qualifying_wager_cents)).toBe(500);
    expect(cleared.status).toBe("COMPLETED");
    await sql`select pvp_test._assert_reward_holds(${playerA}::uuid, 500, 500)`;

    await expect(
      sql.begin(async (tx) => {
        await tx`set local role authenticated`;
        await tx`update pvp_test.leaderboard_entries set qualifying_cents = 1`;
      }),
    ).rejects.toThrow(/permission denied/i);

    const [board] = await as(
      playerA,
      (tx) => tx`select pvp_test.leaderboard_public_board(${race.id}::uuid, 50, 0) as r`,
    );
    expect(board.r.me.rank).toBe(1);
    expect(JSON.stringify(board.r)).not.toMatch(/partner_user_id|last_error|bankroll_at_check/);
    const listed = await sql`select pvp_test.leaderboard_public_list() as r`;
    expect(JSON.stringify(listed[0].r)).not.toContain("Settled race");
    expect(JSON.stringify(board.r.rules)).toContain(
      "stays locked until you wager that same amount on Jackpot, Coinflip, Roulette, or Slott",
    );
    expect(JSON.stringify(board.r.rules)).not.toMatch(/ledger/i);
  }, 90_000);

  it("requires a live session before a leaderboard prize retry", async () => {
    await sql.unsafe(buildTestSchemaSql());
    const admin = randomUUID();
    const partner = randomUUID();
    const player = randomUUID();
    const stranger = randomUUID();
    const name = (id: string, prefix: string) => `${prefix}${id.replace(/-/g, "").slice(0, 8)}`;
    for (const [id, prefix] of [
      [admin, "a"],
      [partner, "p"],
      [player, "x"],
      [stranger, "s"],
    ] as const) {
      await as(id, (tx) => tx`select pvp_test.ensure_profile(${name(id, prefix)}, true)`);
    }
    await sql`insert into pvp_test.user_roles (user_id, role) values (${admin}, 'admin'::pvp_test.app_role)`;
    adminSessions.set(admin, await openAdminStepup(sql, admin));
    await sql`insert into pvp_test.partners (user_id, created_by, leaderboard) values (${partner}, ${admin}, true)`;
    const [template] =
      await sql`select id from pvp_test.leaderboard_templates where status = 'active' limit 1`;
    if (!template) throw new Error("leaderboard template missing after bootstrap");
    const anonExec = await sql`select has_function_privilege(
      'anon',
      'pvp_test.leaderboard_admin_decide(uuid,text,text)',
      'execute'
    ) as ok`;
    expect(anonExec[0].ok).toBe(false);

    const campaign = async () => {
      const [row] = await sql`insert into pvp_test.leaderboard_campaigns (
        partner_user_id, template_id, template_version, name, status, timezone,
        starts_at, ends_at, games, prize_pool_cents, awards_created, funding_status
      ) values (
        ${partner}, ${template.id}, 1, 'Retry race', 'under_review', 'UTC',
        now() - interval '2 hours', now() - interval '1 minute', array['coinflip'], 500, true, 'checked'
      ) returning id`;
      await sql`insert into pvp_test.leaderboard_prize_awards (
        campaign_id, player_id, final_rank, reward_cents, payout_status, last_error
      ) values (${row.id}, ${player}, 1, 500, 'failed', 'injected')`;
      return row.id as string;
    };

    const exp = Math.floor(Date.now() / 1000) + 3600;
    const sid = randomUUID();
    const deviceId = randomUUID();
    await sql`insert into pvp_test.test_auth_sessions (id, user_id, not_after)
      values (${sid}, ${admin}, clock_timestamp() + interval '1 hour')`;
    await sql`insert into pvp_test.admin_devices (id, user_id, token_hash, verified_at)
      values (${deviceId}::uuid, ${admin}::uuid, ${"ab".repeat(32)}, clock_timestamp())`;
    await sql`insert into pvp_test.admin_stepup (session_id, user_id, device_id)
      values (${sid}::uuid, ${admin}::uuid, ${deviceId}::uuid)`;
    const live = {
      role: "authenticated",
      sub: admin,
      session_id: sid,
      exp,
    };
    const liveId = await campaign();
    const [retried] = await as(
      admin,
      (tx) => tx`select pvp_test.leaderboard_admin_decide(${liveId}::uuid, 'retry', '') as r`,
      live,
    );
    expect(retried.r.campaign.status).toBe("settling");
    const [paid] =
      await sql`select payout_status from pvp_test.leaderboard_prize_awards where campaign_id = ${liveId}`;
    expect(paid.payout_status).toBe("pending");

    await sql`delete from pvp_test.test_auth_sessions where id = ${sid}`;
    const revokedId = await campaign();
    await expect(
      as(
        admin,
        (tx) => tx`select pvp_test.leaderboard_admin_decide(${revokedId}::uuid, 'retry', '')`,
        live,
      ),
    ).rejects.toThrow(/SESSION_REVOKED/);
    const [stuck] = await sql`
      select c.status, a.payout_status
        from pvp_test.leaderboard_campaigns c
        join pvp_test.leaderboard_prize_awards a on a.campaign_id = c.id
       where c.id = ${revokedId}`;
    expect(stuck.status).toBe("under_review");
    expect(stuck.payout_status).toBe("failed");

    const strangerSid = randomUUID();
    await sql`insert into pvp_test.test_auth_sessions (id, user_id) values (${strangerSid}, ${stranger})`;
    await expect(
      as(
        stranger,
        (tx) => tx`select pvp_test.leaderboard_admin_decide(${revokedId}::uuid, 'retry', '')`,
        { role: "authenticated", sub: stranger, session_id: strangerSid, exp },
      ),
    ).rejects.toThrow(/FORBIDDEN/);
    await expect(
      as(
        null,
        (tx) => tx`select pvp_test.leaderboard_admin_decide(${revokedId}::uuid, 'retry', '')`,
      ),
    ).rejects.toThrow(/FORBIDDEN/);

    const serverId = await campaign();
    await expect(
      as(
        admin,
        (tx) => tx`select pvp_test.leaderboard_admin_decide(${serverId}::uuid, 'retry', '') as r`,
        { role: "service_role", sub: admin },
      ),
    ).rejects.toThrow(/ADMIN_STEP_UP/);
    const [untouched] = await sql`
      select c.status, a.payout_status
        from pvp_test.leaderboard_campaigns c
        join pvp_test.leaderboard_prize_awards a on a.campaign_id = c.id
       where c.id = ${serverId}`;
    expect(untouched.status).toBe("under_review");
    expect(untouched.payout_status).toBe("failed");
  }, 90_000);
});
