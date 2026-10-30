/**
 * Partner attribution is a separate acquisition code from friend referrals.
 * A player can have both. A later partner link cannot move them.
 * Open campaigns keep ranking every player. Attributed campaigns count one partner's players.
 * Requires TEST_DATABASE_URL. Refuses the production database.
 */
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomBytes, randomUUID } from "node:crypto";
import { promoTestIp } from "./promo-client-ip";
import { applyTestSchema } from "./schema";
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

async function as<T>(uid: string, fn: (tx: postgres.TransactionSql) => Promise<T>): Promise<T> {
  return sql.begin(async (tx) => {
    await tx`select set_config('test.uid', ${uid}, true)`;
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
  skipDepositFor: readonly string[] = [],
) {
  const asset = accountType === "real" ? "USD" : "TEST_USD";
  const domain = accountType === "real" ? "REAL_USD" : "TEST_USD";
  const skip = new Set(skipDepositFor);
  const pot = amount * 2;
  const fee = Math.floor((pot * 500) / 10000);
  const end = new Date(when.getTime() + 1000);
  if (accountType === "real") {
    if (!skip.has(creator)) await creditUserDeposit(tx, creator, amount * 10);
    if (!skip.has(opponent)) await creditUserDeposit(tx, opponent, amount * 10);
  }
  const [game] = await tx`insert into pvp_test.coinflip_games (
    status, creator_id, opponent_id, creator_side, amount, pot_amount, fee_bps, asset, account_type, money_domain,
    server_seed_hash, server_seed, expires_at, joined_at, animation_start_at, animation_end_at, completed_at,
    winner_id, winning_side, payout_amount, fee_amount
  ) values (
    'COMPLETED', ${creator}::uuid, ${opponent}::uuid, 'HEADS', ${amount}, ${pot}, 500, ${asset}, ${accountType}, ${domain},
    ${hash}, ${"cd".repeat(32)}, ${when}, ${when}, ${when}, ${end}, ${end},
    ${opponent}::uuid, 'TAILS', ${pot - fee}, ${fee}
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
}

d("partner leaderboard cohort", () => {
  beforeAll(async () => {
    await applyTestSchema(sql);
    await migrateTestSchemaToReal(sql, { realPlay: true, live: true });
  }, 180_000);

  it("keeps friend referrals and partner attribution independent, and ranks only that cohort", async () => {
    const admin = randomUUID();
    const sousa = randomUUID();
    const streamerB = randomUUID();
    const friend = randomUUID();
    const playerBoth = randomUUID();
    const playerPartner = randomUUID();
    const playerFriend = randomUUID();
    const playerOld = randomUUID();
    const playerPromo = randomUUID();
    const stranger = randomUUID();
    const name = (id: string, prefix: string) => `${prefix}${id.replace(/-/g, "").slice(0, 8)}`;
    const sousaName = name(sousa, "s");
    const names: [string, string][] = [
      [admin, name(admin, "a")],
      [sousa, sousaName],
      [streamerB, name(streamerB, "b")],
      [friend, name(friend, "f")],
      [playerBoth, name(playerBoth, "p")],
      [playerPartner, name(playerPartner, "q")],
      [playerFriend, name(playerFriend, "r")],
      [playerOld, name(playerOld, "o")],
      [playerPromo, name(playerPromo, "m")],
      [stranger, name(stranger, "t")],
    ];
    for (const [id, username] of names) {
      await as(id, (tx) => tx`select pvp_test.ensure_profile(${username}, true)`);
    }
    await sql`insert into pvp_test.user_roles (user_id, role) values (${admin}, 'admin'::pvp_test.app_role)`;
    await sql`insert into pvp_test.partners (user_id, created_by, leaderboard) values (${sousa}, ${admin}, true), (${streamerB}, ${admin}, true)`;

    const codeOf = async (partner: string) => {
      const [row] =
        await sql`select code from pvp_test.partner_acquisition_codes where partner_user_id = ${partner}::uuid`;
      return row.code as string;
    };
    const sousaCode = await codeOf(sousa);
    const codeB = await codeOf(streamerB);
    const friendCode = (await as(friend, (tx) => tx`select pvp_test.referral_create_invite() r`))[0]
      .r as { code: string };
    const sousaInvite = (await as(sousa, (tx) => tx`select pvp_test.referral_create_invite() r`))[0]
      .r as { code: string };

    const friendFirst = (
      await as(playerBoth, (tx) => tx`select pvp_test.referral_claim(${friendCode.code}) r`)
    )[0].r as { ok: boolean; attributed: boolean };
    expect(friendFirst.ok).toBe(true);
    expect(friendFirst.attributed).toBe(true);
    const partnerSecond = (
      await as(playerBoth, (tx) => tx`select pvp_test.partner_acquisition_claim(${sousaCode}) r`)
    )[0].r as { ok: boolean; attributed: boolean };
    expect(partnerSecond.ok).toBe(true);
    expect(partnerSecond.attributed).toBe(true);
    const [friendRow] =
      await sql`select inviter_user_id from pvp_test.referrals where referred_user_id = ${playerBoth}::uuid`;
    expect(friendRow.inviter_user_id).toBe(friend);
    const [cohort] =
      await sql`select partner_user_id, source from pvp_test.partner_referrals where user_id = ${playerBoth}::uuid`;
    expect(cohort.partner_user_id).toBe(sousa);
    expect(cohort.source).toBe("acquisition");

    const onlyPartner = (
      await as(playerPartner, (tx) => tx`select pvp_test.partner_acquisition_claim(${codeB}) r`)
    )[0].r as { ok: boolean; attributed: boolean };
    expect(onlyPartner.ok).toBe(true);
    expect(onlyPartner.attributed).toBe(true);
    const [partnerOnly] =
      await sql`select partner_user_id from pvp_test.partner_referrals where user_id = ${playerPartner}::uuid`;
    expect(partnerOnly.partner_user_id).toBe(streamerB);
    const [noFriend] =
      await sql`select count(*)::int n from pvp_test.referrals where referred_user_id = ${playerPartner}::uuid`;
    expect(noFriend.n).toBe(0);

    const moved = (
      await as(playerBoth, (tx) => tx`select pvp_test.partner_acquisition_claim(${codeB}) r`)
    )[0].r as { ok: boolean; reason: string };
    expect(moved.ok).toBe(true);
    expect(moved.reason).toBe("kept");
    const [still] =
      await sql`select partner_user_id from pvp_test.partner_referrals where user_id = ${playerBoth}::uuid`;
    expect(still.partner_user_id).toBe(sousa);

    await sql`update pvp_test.profiles set created_at = clock_timestamp() - interval '31 minutes' where id = ${playerOld}::uuid`;
    const oldClaim = (
      await as(playerOld, (tx) => tx`select pvp_test.partner_acquisition_claim(${sousaCode}) r`)
    )[0].r as { ok: boolean; reason: string };
    expect(oldClaim.ok).toBe(false);
    expect(oldClaim.reason).toBe("existing_user");
    const [noOld] =
      await sql`select count(*)::int n from pvp_test.partner_referrals where user_id = ${playerOld}::uuid`;
    expect(noOld.n).toBe(0);

    const sessionId = randomUUID();
    const deviceId = randomUUID();
    await sql`insert into pvp_test.test_auth_sessions (id, user_id) values (${sessionId}::uuid, ${admin}::uuid)`;
    await sql`insert into pvp_test.admin_devices (id, user_id, token_hash, verified_at)
      values (${deviceId}::uuid, ${admin}::uuid, ${randomBytes(32).toString("hex")}, clock_timestamp())`;
    await sql`insert into pvp_test.admin_stepup (session_id, user_id, device_id)
      values (${sessionId}::uuid, ${admin}::uuid, ${deviceId}::uuid)`;
    const adminClaims = JSON.stringify({
      role: "authenticated",
      sub: admin,
      session_id: sessionId,
    });
    const promo = (
      await sql.begin(async (tx) => {
        await tx`select set_config('test.uid', ${admin}, true), set_config('request.jwt.claims', ${adminClaims}, true)`;
        return tx`select pvp_test.partner_admin_create_code(${sousa}::uuid, 'STREAM1', 500, 10, null) r`;
      })
    )[0].r as { ok: boolean; code: string };
    expect(promo.code).toBe("STREAM1");
    const promoClaim = (
      await as(playerPromo, async (tx) => {
        await tx`select set_config('test.client_ip', ${promoTestIp(playerPromo)}, true)`;
        return tx`select pvp_test.promo_claim('STREAM1') r`;
      })
    )[0].r as { ok: boolean };
    expect(promoClaim.ok).toBe(true);
    const [promoRows] =
      await sql`select count(*)::int n from pvp_test.promo_claims where user_id = ${playerPromo}::uuid`;
    expect(promoRows.n).toBe(1);
    const [promoPartner] = await sql`
      select partner_user_id, source, acquisition_code_id
      from pvp_test.partner_referrals where user_id = ${playerPromo}::uuid`;
    expect(promoPartner.partner_user_id).toBe(sousa);
    expect(promoPartner.source).toBe("promo");
    expect(promoPartner.acquisition_code_id).toBeNull();

    const friendOnly = (
      await as(playerFriend, (tx) => tx`select pvp_test.referral_claim(${sousaInvite.code}) r`)
    )[0].r as { ok: boolean; attributed: boolean };
    expect(friendOnly.ok).toBe(true);
    expect(friendOnly.attributed).toBe(true);
    const [plain] =
      await sql`select inviter_user_id from pvp_test.referrals where referred_user_id = ${playerFriend}::uuid`;
    expect(plain.inviter_user_id).toBe(sousa);
    const [noPartner] =
      await sql`select count(*)::int n from pvp_test.partner_referrals where user_id = ${playerFriend}::uuid`;
    expect(noPartner.n).toBe(0);

    await expect(
      sql`update pvp_test.partner_referrals set partner_user_id = ${streamerB}::uuid where user_id = ${playerBoth}::uuid`,
    ).rejects.toThrow(/IMMUTABLE_RECORD/);

    const [template] =
      await sql`select id, version from pvp_test.leaderboard_templates where status = 'active' limit 1`;
    const insertRace = async (partner: string, title: string, audience: "open" | "attributed") => {
      const [row] = await sql`insert into pvp_test.leaderboard_campaigns (
        partner_user_id, template_id, template_version, name, description, status, timezone,
        starts_at, ends_at, min_wager_cents, games, prize_pool_cents, audience,
        funding_status, rules_frozen_at, approved_by, approved_at, started_at
      ) values (
        ${partner}::uuid, ${template.id}::uuid, ${template.version}, ${title}, '', 'active', 'UTC',
        now() - interval '2 hours', now() + interval '2 hours', 0, array['coinflip'], 500, ${audience},
        'checked', null, ${admin}::uuid, now(), now() - interval '2 hours'
      ) returning id`;
      await sql`insert into pvp_test.leaderboard_prize_tiers (campaign_id, rank_start, rank_end, reward_cents)
        values (${row.id}, 1, 1, 500)`;
      await sql`update pvp_test.leaderboard_campaigns set rules_frozen_at = clock_timestamp() where id = ${row.id}`;
      return row.id as string;
    };
    const sousaRace = await insertRace(sousa, "Sousa race", "attributed");
    const raceB = await insertRace(streamerB, "Streamer B race", "attributed");
    const openRace = await insertRace(sousa, "Open race", "open");

    await sql`alter table pvp_test.coinflip_games disable trigger coinflip_guard`;
    await sql`alter table pvp_test.coinflip_entries disable trigger coinflip_entry_check`;
    try {
      await sql.begin(async (tx) => {
        const ago = (minutes: number) => new Date(Date.now() - minutes * 60 * 1000);
        await settledFlip(tx, playerBoth, playerPartner, 2000, ago(40), "real");
        await settledFlip(tx, playerBoth, stranger, 1000, ago(30), "real");
        await settledFlip(tx, playerPromo, stranger, 400, ago(25), "real", [playerPromo]);
        await settledFlip(tx, playerBoth, stranger, 9000, ago(15), "test_credit");
        const when = ago(20);
        const [cancelled] = await tx`insert into pvp_test.coinflip_games (
          status, creator_id, creator_side, amount, pot_amount, fee_bps, asset, account_type, money_domain,
          server_seed_hash, expires_at, cancelled_at, cancel_reason
        ) values (
          'CANCELLED', ${playerBoth}::uuid, 'HEADS', 50000, 100000, 500, 'USD', 'real', 'REAL_USD',
          ${hash}, ${when}, ${when}, 'EXPIRED'
        ) returning id`;
        const [ledger] =
          await tx`insert into pvp_test.ledger_transactions (kind, idempotency_key, account_type, user_id)
          values ('jackpot_entry', ${`cancel-${randomUUID()}`}, 'real', ${playerBoth}::uuid) returning id`;
        await tx`insert into pvp_test.coinflip_entries (game_id, user_id, slot, side, amount, ledger_tx_id, idempotency_key, created_at)
          values (${cancelled.id}, ${playerBoth}::uuid, 1, 'HEADS', 50000, ${ledger.id}, ${`cancel-${cancelled.id}`}, ${when})`;
      });
    } finally {
      await sql`alter table pvp_test.coinflip_games enable trigger coinflip_guard`;
      await sql`alter table pvp_test.coinflip_entries enable trigger coinflip_entry_check`;
    }

    await sql`select pvp_test._withdraw_basis_rebuild_full()`;
    await sql`select pvp_test._lb_sync(${sousaRace}::uuid)`;
    await sql`select pvp_test._lb_sync(${raceB}::uuid)`;
    await sql`select pvp_test._lb_sync(${openRace}::uuid)`;

    const ranks = async (campaign: string) =>
      sql`select player_id, qualifying_cents from pvp_test.leaderboard_entries
        where campaign_id = ${campaign}::uuid and qualifying_cents > 0 order by rank`;
    const sousaRows = await ranks(sousaRace);
    const rowsB = await ranks(raceB);
    const openRows = await ranks(openRace);
    expect(sousaRows.map((row) => row.player_id)).toEqual([playerBoth]);
    expect(Number(sousaRows[0].qualifying_cents)).toBe(3000);
    expect(sousaRows.map((row) => row.player_id)).not.toContain(playerPromo);
    expect(rowsB.map((row) => row.player_id)).toEqual([playerPartner]);
    expect(Number(rowsB[0].qualifying_cents)).toBe(2000);
    expect(openRows.map((row) => [row.player_id, Number(row.qualifying_cents)])).toEqual([
      [playerBoth, 3000],
      [playerPartner, 2000],
      [stranger, 1400],
    ]);
    expect(sousaRows.map((row) => row.player_id)).not.toContain(playerPartner);
    expect(rowsB.map((row) => row.player_id)).not.toContain(playerBoth);

    const sousaHome = (
      await as(sousa, (tx) => tx`select pvp_test.leaderboard_partner_cohort() r`)
    )[0].r as {
      referred_players: number;
      eligible_wager_cents: number;
      rows: { username: string }[];
    };
    expect(Number(sousaHome.referred_players)).toBe(2);
    expect(Number(sousaHome.eligible_wager_cents)).toBe(3000);
    expect(sousaHome.rows.map((row) => row.username)).toEqual([name(playerBoth, "p")]);
    const homeB = (
      await as(streamerB, (tx) => tx`select pvp_test.leaderboard_partner_cohort() r`)
    )[0].r as { rows: { username: string }[] };
    expect(homeB.rows.map((row) => row.username)).not.toContain(name(playerBoth, "p"));

    const listed = await sql`select pvp_test.leaderboard_public_partner(${sousaName}) r`;
    const namesOnPage = (listed[0].r as { name: string }[]).map((row) => row.name);
    expect(namesOnPage).toContain("Sousa race");
    expect(namesOnPage).not.toContain("Streamer B race");
    expect(namesOnPage).not.toContain("Open race");
    const board = await sql`select pvp_test.leaderboard_public_board(${sousaRace}::uuid, 50, 0) r`;
    expect(JSON.stringify(board[0].r)).not.toMatch(/email|wallet|ledger/i);
    expect(JSON.stringify(board[0].r.rules)).toContain("promo code");
    expect(JSON.stringify(board[0].r.rules)).toContain(
      "Promo codes, referral, partner, and prize credits never count",
    );
    expect(JSON.stringify(board[0].r.rules)).not.toContain("until you deposit");
  }, 90_000);

  it("counts only the deposited part of a stake that mixes deposit and promo balance", async () => {
    const admin = randomUUID();
    const host = randomUUID();
    const mixed = randomUUID();
    const rival = randomUUID();
    for (const [id, prefix] of [
      [admin, "a"],
      [host, "h"],
      [mixed, "m"],
      [rival, "r"],
    ] as const) {
      await as(
        id,
        (tx) =>
          tx`select pvp_test.ensure_profile(${prefix + id.replace(/-/g, "").slice(0, 8)}, true)`,
      );
    }
    await sql`insert into pvp_test.user_roles (user_id, role) values (${admin}, 'admin'::pvp_test.app_role)`;
    await sql`insert into pvp_test.partners (user_id, created_by, leaderboard) values (${host}, ${admin}, true)`;
    await sql.begin((tx) => creditUserDeposit(tx, mixed, 300));
    await sql.begin(async (tx) => {
      const [promo] =
        await tx`insert into pvp_test.ledger_transactions (kind, idempotency_key, account_type, user_id)
        values ('promo_reward', ${`lb-promo-${mixed}`}, 'real', ${mixed}::uuid) returning id`;
      await tx`select pvp_test._post(${promo.id}::uuid, pvp_test._user_account(${mixed}::uuid, 'user_available', 'USD', 'real'), 2000)`;
      await tx`select pvp_test._post(${promo.id}::uuid, pvp_test._system_account('house_bankroll', 'USD', 'real'), -2000)`;
    });
    const [template] =
      await sql`select id, version from pvp_test.leaderboard_templates where status = 'active' limit 1`;
    const [race] = await sql`insert into pvp_test.leaderboard_campaigns (
      partner_user_id, template_id, template_version, name, description, status, timezone,
      starts_at, ends_at, min_wager_cents, games, prize_pool_cents, audience,
      funding_status, rules_frozen_at, approved_by, approved_at, started_at
    ) values (
      ${host}::uuid, ${template.id}::uuid, ${template.version}, 'Mixed race', '', 'active', 'UTC',
      now() - interval '2 hours', now() + interval '2 hours', 0, array['coinflip'], 500, 'open',
      'checked', clock_timestamp(), ${admin}::uuid, now(), now() - interval '2 hours'
    ) returning id`;

    await sql`alter table pvp_test.coinflip_games disable trigger coinflip_guard`;
    await sql`alter table pvp_test.coinflip_entries disable trigger coinflip_entry_check`;
    try {
      await sql.begin((tx) =>
        settledFlip(tx, mixed, rival, 1000, new Date(Date.now() - 10 * 60 * 1000), "real", [mixed]),
      );
    } finally {
      await sql`alter table pvp_test.coinflip_games enable trigger coinflip_guard`;
      await sql`alter table pvp_test.coinflip_entries enable trigger coinflip_entry_check`;
    }
    await sql`select pvp_test._withdraw_basis_rebuild_full()`;
    await sql`select pvp_test._lb_sync(${race.id}::uuid)`;
    const rows = await sql`select player_id, qualifying_cents from pvp_test.leaderboard_entries
      where campaign_id = ${race.id}::uuid and qualifying_cents > 0
        and player_id in (${mixed}::uuid, ${rival}::uuid) order by rank`;
    expect(rows.map((row) => [row.player_id, Number(row.qualifying_cents)])).toEqual([
      [rival, 1000],
      [mixed, 300],
    ]);
  }, 90_000);

  it("rejects a credited deposit on every rail and still allows a friend plus a partner", async () => {
    const admin = randomUUID();
    const streamer = randomUUID();
    const friend = randomUUID();
    const fresh = randomUUID();
    const withFriend = randomUUID();
    const cryptoPaid = randomUUID();
    const btcPaid = randomUUID();
    const cardPaid = randomUUID();
    const btcOpen = randomUUID();
    const cardOpen = randomUUID();
    const name = (id: string, prefix: string) => `${prefix}${id.replace(/-/g, "").slice(0, 8)}`;
    for (const [id, username] of [
      [admin, name(admin, "a")],
      [streamer, name(streamer, "s")],
      [friend, name(friend, "f")],
      [fresh, name(fresh, "n")],
      [withFriend, name(withFriend, "w")],
      [cryptoPaid, name(cryptoPaid, "c")],
      [btcPaid, name(btcPaid, "b")],
      [cardPaid, name(cardPaid, "k")],
      [btcOpen, name(btcOpen, "o")],
      [cardOpen, name(cardOpen, "p")],
    ] as const) {
      await as(id, (tx) => tx`select pvp_test.ensure_profile(${username}, true)`);
    }
    await sql`insert into pvp_test.user_roles (user_id, role) values (${admin}, 'admin'::pvp_test.app_role)`;
    await sql`insert into pvp_test.partners (user_id, created_by, leaderboard) values (${streamer}, ${admin}, true)`;
    const [link] =
      await sql`select code from pvp_test.partner_acquisition_codes where partner_user_id = ${streamer}::uuid`;
    const code = link.code as string;
    const friendCode = (await as(friend, (tx) => tx`select pvp_test.referral_create_invite() r`))[0]
      .r as { code: string };
    const claim = async (uid: string) =>
      (await as(uid, (tx) => tx`select pvp_test.partner_acquisition_claim(${code}) r`))[0].r as {
        ok: boolean;
        attributed?: boolean;
        reason?: string;
      };
    const attributed = async (uid: string) =>
      Number(
        (
          await sql`select count(*)::int n from pvp_test.partner_referrals where user_id = ${uid}::uuid`
        )[0].n,
      );

    const none = await claim(fresh);
    expect(none).toMatchObject({ ok: true, attributed: true });
    expect(await attributed(fresh)).toBe(1);

    const invited = (
      await as(withFriend, (tx) => tx`select pvp_test.referral_claim(${friendCode.code}) r`)
    )[0].r as { ok: boolean };
    expect(invited.ok).toBe(true);
    const both = await claim(withFriend);
    expect(both).toMatchObject({ ok: true, attributed: true });
    const [friendRow] =
      await sql`select inviter_user_id from pvp_test.referrals where referred_user_id = ${withFriend}::uuid`;
    expect(friendRow.inviter_user_id).toBe(friend);

    const cryptoTx = randomUUID();
    const cryptoId = randomUUID();
    await sql`insert into pvp_test.ledger_transactions (id, kind, idempotency_key, account_type, user_id)
      values (${cryptoTx}::uuid, 'deposit', ${cryptoTx}, 'real', ${cryptoPaid}::uuid)`;
    await sql`insert into pvp_test.crypto_deposits (
      id, chain_id, asset_key, tx_hash, log_index, block_number, from_address, to_address, units, usd_cents, user_id, status
    ) values (
      ${cryptoId}::uuid, 8453, 'USDC', ${"0x" + "ab".repeat(32)}, 0, 10,
      ${"0x" + "11".repeat(20)}, ${"0x" + "22".repeat(20)}, 1000000, 1000, ${cryptoPaid}::uuid, 'DETECTED'
    )`;
    await sql`update pvp_test.crypto_deposits
      set status = 'CREDITED', ledger_tx_id = ${cryptoTx}::uuid, credited_at = now()
      where id = ${cryptoId}::uuid`;
    expect(await claim(cryptoPaid)).toMatchObject({ ok: false, reason: "existing_user" });
    expect(await attributed(cryptoPaid)).toBe(0);

    const btcId = randomUUID();
    await sql`insert into pvp_test.btcpay_invoices (
      id, user_id, btcpay_invoice_id, usd_cents, required_confirmations, speed_policy, network, status, btc_due,
      credited_cents, credited_ontime_cents, credited_late_cents
    ) values (
      ${btcId}::uuid, ${btcPaid}::uuid, ${"inv" + btcId.slice(0, 12)}, 5000, 1, 'MediumSpeed', 'mainnet', 'CREDITED', '0.00100000',
      5000, 5000, 0
    )`;
    expect(await claim(btcPaid)).toMatchObject({ ok: false, reason: "existing_user" });
    expect(await attributed(btcPaid)).toBe(0);

    const cardTx = randomUUID();
    await sql`insert into pvp_test.ledger_transactions (id, kind, idempotency_key, account_type, user_id)
      values (${cardTx}::uuid, 'deposit', ${cardTx}, 'real', ${cardPaid}::uuid)`;
    await sql`insert into pvp_test.nowpayments_invoices (user_id, usd_cents, status, ledger_tx_id, credited_at)
      values (${cardPaid}::uuid, 5000, 'CREDITED', ${cardTx}::uuid, now())`;
    expect(await claim(cardPaid)).toMatchObject({ ok: false, reason: "existing_user" });
    expect(await attributed(cardPaid)).toBe(0);

    await sql`insert into pvp_test.btcpay_invoices (
      id, user_id, btcpay_invoice_id, usd_cents, required_confirmations, speed_policy, network, status, btc_due
    ) values (
      ${randomUUID()}::uuid, ${btcOpen}::uuid, ${"open" + btcOpen.slice(0, 8)}, 5000, 1, 'MediumSpeed', 'mainnet', 'NEW', '0.00100000'
    )`;
    await sql`insert into pvp_test.nowpayments_invoices (user_id, usd_cents, status)
      values (${cardOpen}::uuid, 5000, 'NEW')`;
    expect(await claim(btcOpen)).toMatchObject({ ok: true, attributed: true });
    expect(await claim(cardOpen)).toMatchObject({ ok: true, attributed: true });
  }, 90_000);
});
