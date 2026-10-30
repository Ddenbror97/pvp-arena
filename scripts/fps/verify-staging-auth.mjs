import assert from "node:assert/strict";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { assertStaging } from "./staging-lib.mjs";
assertStaging();
const users = JSON.parse(fs.readFileSync(".env.fps-staging-users.json", "utf8")),
  [A, B] = users;
const revoked = users[15],
  report = { checks: [] };
const call = async (u, name, args = {}) => {
  const r = await fetch(process.env.SUPABASE_URL + "/rest/v1/rpc/" + name, {
    method: "POST",
    headers: {
      apikey: process.env.SUPABASE_PUBLISHABLE_KEY,
      Authorization: "Bearer " + u.session.access_token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
  });
  return { status: r.status, data: await r.json() };
};
const pass = (name) => {
  report.checks.push({ name, passed: true });
  console.log("PASS " + name);
};
let game;
try {
  const created = await call(A, "fps_enter", {
    p_stake: 0,
    p_best_of: 5,
    p_key: randomUUID(),
    p_private: true,
    p_invite: null,
  });
  assert.equal(created.status, 200);
  game = created.data;
  const view = await call(B, "fps_view", { p_match: game.id });
  assert.notEqual(view.status, 200);
  const invalid = await call(B, "fps_invite_preview", {
    p_match: game.id,
    p_invite: "0".repeat(64),
  });
  assert.notEqual(invalid.status, 200);
  const valid = await call(B, "fps_invite_preview", { p_match: game.id, p_invite: game.invite });
  assert.equal(valid.status, 200);
  assert.equal(valid.data.stake, 0);
  pass("private REST views and invitation previews enforce membership and capability tokens");
  const secret = await fetch(process.env.SUPABASE_URL + "/rest/v1/fps_invite_secrets?select=*", {
    headers: {
      apikey: process.env.SUPABASE_PUBLISHABLE_KEY,
      Authorization: "Bearer " + B.session.access_token,
    },
  });
  assert.notEqual(secret.status, 200);
  pass("authenticated outsiders cannot read private invitation secrets");
  const before = await call(revoked, "fps_lobby");
  assert.equal(before.status, 200);
  const logout = await fetch(process.env.SUPABASE_URL + "/auth/v1/logout?scope=local", {
    method: "POST",
    headers: {
      apikey: process.env.SUPABASE_PUBLISHABLE_KEY,
      Authorization: "Bearer " + revoked.session.access_token,
    },
  });
  assert(logout.ok);
  const after = await call(revoked, "fps_lobby");
  assert.notEqual(after.status, 200);
  assert.match(after.data.message, /SESSION_REVOKED/);
  pass("a revoked real Supabase session cannot reuse its still-unexpired JWT");
  report.passed = true;
} catch (e) {
  report.passed = false;
  report.failure = { message: e.message };
  console.log(JSON.stringify({ failed: report.failure }));
  process.exitCode = 1;
} finally {
  if (game) await call(A, "fps_cancel", { p_match: game.id });
  fs.writeFileSync("test-results/fps-staging-auth.json", JSON.stringify(report, null, 2));
}
