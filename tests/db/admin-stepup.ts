import { randomBytes, randomUUID } from "node:crypto";
import type postgres from "postgres";

/** A real admin_stepup row plus a live session. Callers still have to be admins. */
export async function openAdminStepup(sql: postgres.Sql, userId: string): Promise<string> {
  const sessionId = randomUUID();
  const deviceId = randomUUID();
  await sql`insert into pvp_test.admin_devices (id, user_id, token_hash, verified_at)
    values (${deviceId}::uuid, ${userId}::uuid, ${randomBytes(32).toString("hex")}, clock_timestamp())`;
  await sql`insert into pvp_test.test_auth_sessions (id, user_id, not_after)
    values (${sessionId}::uuid, ${userId}::uuid, clock_timestamp() + interval '1 hour')`;
  await sql`insert into pvp_test.admin_stepup (session_id, user_id, device_id)
    values (${sessionId}::uuid, ${userId}::uuid, ${deviceId}::uuid)`;
  return sessionId;
}

export function adminClaims(userId: string, sessionId: string): string {
  return JSON.stringify({
    role: "authenticated",
    sub: userId,
    session_id: sessionId,
    exp: Math.floor(Date.now() / 1000) + 3600,
  });
}
