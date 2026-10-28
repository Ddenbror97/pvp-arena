import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const dir = join(process.cwd(), "supabase/migrations");
const files = readdirSync(dir).filter((name) => name.endsWith(".sql"));

function read(name: string) {
  return readFileSync(join(dir, name), "utf8");
}

describe("fresh database migration guards", () => {
  it("gives every migration file a unique version", () => {
    const versions = files.map((name) => name.split("_", 1)[0]);
    expect(new Set(versions).size).toBe(versions.length);
    expect(files.filter((name) => name.startsWith("20260926160000"))).toEqual([
      "20260926160000_public-chat-and-coinflip-24h.sql",
    ]);
  });

  it("records the liquidity status check after chat and before the restore function", () => {
    const name = "20260926160100_withdrawal-liquidity-pending-status.sql";
    expect(files).toContain(name);
    const sql = read(name);
    expect(sql).toMatch(/LIQUIDITY_PENDING/);
    expect(sql).toMatch(/crypto_withdrawals_status_check/);
    const ordered = files.filter((file) => file.startsWith("2026092616")).sort();
    expect(ordered.indexOf("20260926160000_public-chat-and-coinflip-24h.sql")).toBeLessThan(
      ordered.indexOf(name),
    );
    expect(ordered.indexOf(name)).toBeLessThan(
      ordered.indexOf("20260926161000_restore-liquidity-pending-status.sql"),
    );
  });

  it("skips historical credits when the production deposits are absent", () => {
    const cutover = read("20260925042002_4210fa7f-0b72-47d0-8c26-f3d14ee17eb2.sql");
    expect(cutover).toMatch(/skip money cutover/);
    expect(cutover).toMatch(/CREATE POLICY "No client access to money migrations"/);
    expect(cutover).not.toMatch(/insert into public\.crypto_deposits/i);

    const credit450 = read("20260925042424_96571183-1cfb-42a6-b07f-b52b7188dc02.sql");
    expect(credit450.indexOf("historical deposit is absent")).toBeLessThan(
      credit450.indexOf("watch_only = false"),
    );
    expect(credit450).toMatch(/deposit already credited/);

    const credit200 = read("20260925124829_6f6b8669-4a0b-4701-91cf-4d7ae7997d0c.sql");
    expect(credit200).toMatch(/create or replace function public\.crypto_credit_deposit/i);
    expect(credit200.indexOf("historical deposit is absent")).toBeLessThan(
      credit200.indexOf("watch_only = false"),
    );
  });

  it("does not use LOCK TABLE in the per-user withdraw basis migration", () => {
    const sql = read("20261014355000_withdraw_basis_per_user.sql");
    expect(sql).not.toMatch(/^lock table/im);
    expect(sql).toMatch(/pg_advisory_lock\(hashtext\('withdraw_basis_per_user'\)\)/);
    expect(sql).toMatch(/pg_advisory_unlock\(hashtext\('withdraw_basis_per_user'\)\)/);
  });

  it("creates pg_cron inside the production-only roulette worker migration", () => {
    const sql = read("20260925185856_72114122-2a02-49e7-8910-999e5a049dfd.sql");
    const begin = sql.indexOf("-- prod-only:begin");
    const ext = sql.indexOf("create extension if not exists pg_cron;");
    const schedule = sql.indexOf("cron.schedule");
    expect(begin).toBeGreaterThanOrEqual(0);
    expect(ext).toBeGreaterThan(begin);
    expect(schedule).toBeGreaterThan(ext);
  });
});
