import assert from "node:assert/strict";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { assertStaging, connect, asUser, asService } from "./staging-lib.mjs";
assertStaging();
const sql = connect(2);
const [a, b, outsider] = JSON.parse(fs.readFileSync(".env.fps-staging-users.json")).slice(36, 39);
const checks = [];
let match;
const rpc = (u, name, args) =>
  asUser(
    sql,
    u,
    async (tx) =>
      (
        await tx.unsafe(
          `select public.${name}(${args.map((_, i) => "$" + (i + 1)).join(",")}) r`,
          args,
        )
      )[0].r,
  );
const service = (name, args) =>
  asService(
    sql,
    async (tx) =>
      (
        await tx.unsafe(
          `select public.${name}(${args.map((_, i) => "$" + (i + 1)).join(",")}) r`,
          args,
        )
      )[0].r,
  );
const pass = (name) => {
  checks.push(name);
  console.log("PASS " + name);
};
try {
  match = await rpc(a, "fps_enter", [100, 13, randomUUID(), true, null]);
  for (const role of ["anon", "authenticated"]) {
    await assert.rejects(
      sql.begin(async (tx) => {
        await tx.unsafe("set local role " + role);
        await tx`update public.fps_matches set score_a=99 where id=${match.id}`;
      }),
    );
  }
  pass("anonymous and authenticated roles cannot directly forge match scores");
  await assert.rejects(rpc(outsider, "fps_cancel", [match.id]));
  pass("unrelated synthetic player cannot cancel another private match");
  await assert.rejects(rpc(outsider, "fps_view", [match.id]), /MATCH_NOT_FOUND/);
  pass("private match details hidden from nonparticipant");
  await assert.rejects(rpc(b, "fps_join", [match.id, randomUUID(), "wrong-invite"]));
  pass("incorrect private invitation rejected");
  const key = randomUUID();
  await rpc(b, "fps_join", [match.id, key, match.invite]);
  await rpc(b, "fps_join", [match.id, key, match.invite]);
  const entries =
    await sql`select count(*)::int n from public.fps_entries where match_id=${match.id}`;
  assert.equal(entries[0].n, 2);
  pass("authorized join and identical retry preserve exactly two entries");
  await assert.rejects(rpc(outsider, "fps_join", [match.id, randomUUID(), match.invite]));
  pass("third player cannot take a funded seat");
  await assert.rejects(rpc(a, "fps_record_result", [match.id, a.id, 7, 0, "ROUNDS", match.id]));
  pass("authenticated participant cannot forge service-only result");
  const policies =
    await sql`select relname,relrowsecurity from pg_class where oid in ('public.fps_matches'::regclass,'public.fps_entries'::regclass)`;
  assert(policies.every((p) => p.relrowsecurity));
  pass("RLS remains enabled on matches and entries");
  await service("fps_record_result", [match.id, null, 0, 0, "SERVER_RESTART", match.id]);
  await service("fps_finish", [match.id, null, 0, 0, "SERVER_RESTART", match.id]);
  const row = (await sql`select status from public.fps_matches where id=${match.id}`)[0];
  assert.equal(row.status, "CANCELLED");
  pass("authorized service refunds the test reservation");
  fs.writeFileSync(
    "test-results/fps-staging-security.json",
    JSON.stringify(
      { project: process.env.SUPABASE_PROJECT_ID, passed: true, checks, matchId: match.id },
      null,
      2,
    ),
  );
} finally {
  if (match) {
    const g = (
      await sql`select status,result_recorded from public.fps_matches where id=${match.id}`
    )[0];
    if (g.status === "WAITING") await rpc(a, "fps_cancel", [match.id]);
    else if (g.status === "FUNDED" && !g.result_recorded) {
      await service("fps_record_result", [match.id, null, 0, 0, "SERVER_RESTART", match.id]);
      await service("fps_finish", [match.id, null, 0, 0, "SERVER_RESTART", match.id]);
    }
  }
  await sql.end();
}
