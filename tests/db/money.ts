import type postgres from "postgres";

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

/** Run the real migration + finalization inside the isolated test schema. */
export async function migrateTestSchemaToReal(sql: postgres.Sql, opts: { realPlay?: boolean } = {}) {
  await sql`update pvp_test.crypto_settings set watch_only = true, withdrawals_enabled = false, real_play_enabled = false`;
  await seedSnapshotDeposits(sql);
  const m = (await sql`select pvp_test._money_migrate_v1() r`)[0].r;
  // Let any empty in-flight test round drain.
  for (const g of await sql`select id from pvp_test.roulette_games where account_type = 'test_credit' and status in ('LOCKED','SPINNING','SETTLEMENT')`) {
    await sql`update pvp_test.roulette_games set status = 'CANCELLED' where false and id = ${g.id}`;
  }
  const f = (await sql`select pvp_test._money_finalize_v1() r`)[0].r;
  if (opts.realPlay) await sql`update pvp_test.crypto_settings set real_play_enabled = true`;
  return { m, f };
}
