import type postgres from "postgres";
import { randomUUID } from "node:crypto";

/** The two real Base Mainnet deposits the production migration snapshots. */
export const SNAPSHOT_TX = [
  "0xc948435f306a17ee06a42ae73a9233e33b0af77993ed30d9ae13c75278f2d947",
  "0xade51fcf975f1a9227b779afe2e9ddb1d3085ee1ccc71a42b44f0d11ca6e69fc",
];

/** Seed stand-ins for the two production deposits (CONFIRMED, uncredited). */
export async function seedSnapshotDeposits(sql: postgres.Sql) {
  for (const [i, tx] of SNAPSHOT_TX.entries()) {
    await sql`insert into pvp_test.crypto_deposits (chain_id, asset_key, tx_hash, log_index, block_number, from_address, to_address, units, usd_cents, status, confirmed_at)
      values (8453, 'USDC', ${tx}, ${i}, ${51757061 + i}, ${"0x" + "1".repeat(40)}, ${"0x" + "2".repeat(40)}, ${i ? 4500000 : 2000000}, ${i ? 450 : 200}, 'CONFIRMED', now())
      on conflict do nothing`;
  }
}

/**
 * A fresh, deep payout-wallet reading for the Base Sepolia sandbox rail and Bitcoin, so suites that
 * are not about treasury liquidity see every asset as fundable. Readings expire after 10 minutes.
 */
/** Credit a user's real USD available balance through a deposit posting. */
export async function creditUserDeposit(
  sql: postgres.Sql | postgres.TransactionSql,
  uid: string,
  cents: number,
) {
  const external = (
    await sql`select pvp_test._system_account('external_custody', 'USD', 'real') id`
  )[0].id as string;
  const available = (
    await sql`select pvp_test._user_account(${uid}::uuid, 'user_available'::pvp_test.account_kind, 'USD', 'real') id`
  )[0].id as string;
  const txId = (
    await sql`insert into pvp_test.ledger_transactions (kind, idempotency_key, account_type, user_id)
      values ('deposit'::pvp_test.tx_kind, ${randomUUID()}, 'real', ${uid}::uuid) returning id`
  )[0].id as string;
  await sql`select pvp_test._post(${txId}::uuid, ${external}::uuid, ${-cents}::bigint)`;
  await sql`select pvp_test._post(${txId}::uuid, ${available}::uuid, ${cents}::bigint)`;
}

export async function fundTestTreasury(sql: postgres.Sql) {
  // 0.1 ETH covers the $10 withdrawal minimum. 0.001 ETH prices under that floor, so payout_ready stays false.
  await sql`select pvp_test.crypto_record_inventory(84532, 0, ${(10n ** 24n).toString()}, 0, ${(10n ** 17n).toString()}, null, true, true)`;
  await sql`select pvp_test.treasury_record_btc(${(10n ** 12n).toString()}, 60000000000)`;
}

/** Run the real migration + finalization inside the isolated test schema. */
export async function migrateTestSchemaToReal(
  sql: postgres.Sql,
  opts: { realPlay?: boolean; live?: boolean } = {},
) {
  await sql`update pvp_test.crypto_settings set watch_only = true, withdrawals_enabled = false, real_play_enabled = false`;
  await seedSnapshotDeposits(sql);
  const m = (await sql`select pvp_test._money_migrate_v1() r`)[0].r;
  const f = (await sql`select pvp_test._money_finalize_v1() r`)[0].r;
  if (opts.realPlay) await sql`update pvp_test.crypto_settings set real_play_enabled = true`;
  if (opts.live)
    await sql`update pvp_test.crypto_settings set watch_only = false, deposits_enabled = true, withdrawals_enabled = true`;
  await useTestWithdrawalMinimum(sql);
  return { m, f };
}

/**
 * Suites that are not about the cashout floor use $10 so their amounts still
 * clear the minimum, including while production is temporarily at $2.
 */
export async function useTestWithdrawalMinimum(sql: postgres.Sql) {
  await sql`update pvp_test.crypto_settings set min_withdrawal_cents = 1000`;
  await sql`alter table pvp_test.chain_networks disable trigger user`;
  await sql`update pvp_test.chain_networks set min_withdrawal_cents = 1000`;
  await sql`alter table pvp_test.chain_networks enable trigger user`;
}
