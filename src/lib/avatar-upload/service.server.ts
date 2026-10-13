import type { AvatarDecoder } from "./codecs";
import { isAvatarErrorCode, type AvatarErrorCode } from "./limits";
import { verifyAvatar } from "./process";
import { AvatarError } from "./sniff";

/** Service-role Supabase client. These RPCs are newer than the generated types. */
type RpcResult<T> = { data: T; error: { message?: string } | null };

export type Admin = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<RpcResult<string | { activated?: boolean; stale_paths?: unknown } | null>>;
  storage: {
    from: (bucket: string) => {
      remove: (paths: string[]) => Promise<{ error: { message?: string } | null }>;
      upload: (
        path: string,
        body: Uint8Array | Blob,
        options: { contentType: string; cacheControl: string; upsert: boolean },
      ) => Promise<{ error: { message?: string } | null }>;
      getPublicUrl: (path: string) => { data: { publicUrl: string } };
    };
  };
};

export type UploadOutcome = { ok: true; avatarUrl: string } | { ok: false; code: AvatarErrorCode };

const BUCKET = "avatars";

function log(event: string, fields: Record<string, unknown>) {
  console.info(JSON.stringify({ scope: "avatar", event, ...fields }));
}

function rpcCode(error: { message?: string } | null | undefined): AvatarErrorCode {
  const msg = error?.message ?? "";
  if (msg.includes("RATE_LIMITED")) return "RATE_LIMITED";
  if (msg.includes("AUTH_REQUIRED")) return "AUTH_REQUIRED";
  return "SERVER_ERROR";
}

export async function deletePaths(db: Admin, paths: unknown) {
  const list = Array.isArray(paths) ? paths.filter((p): p is string => typeof p === "string") : [];
  if (!list.length) return;
  const { error } = await db.storage.from(BUCKET).remove(list);
  if (error) log("cleanup_failed", { count: list.length });
}

/**
 * Upload lifecycle. The row opened by avatar_begin supersedes any earlier
 * in-flight upload, and avatar_activate only succeeds for the newest one, so
 * a slow earlier upload can never replace a later choice.
 */
export async function uploadAvatarForUser(
  db: Admin,
  decoder: AvatarDecoder,
  userId: string,
  bytes: Uint8Array,
): Promise<UploadOutcome> {
  const begin = await db.rpc("avatar_begin", { p_user: userId });
  if (begin.error || typeof begin.data !== "string") {
    const code = rpcCode(begin.error);
    log("begin_refused", { code });
    return { ok: false, code };
  }
  const id: string = begin.data;

  let processed;
  try {
    processed = await verifyAvatar(bytes, decoder);
  } catch (e) {
    const code: AvatarErrorCode =
      e instanceof AvatarError && isAvatarErrorCode(e.code) ? e.code : "SERVER_ERROR";
    await db.rpc("avatar_fail", {
      p_id: id,
      p_status: code === "SERVER_ERROR" ? "failed" : "rejected",
      p_reason: code,
    });
    log(code === "SERVER_ERROR" ? "failed" : "rejected", { upload: id, code, bytes: bytes.length });
    return { ok: false, code };
  }

  const path = `${userId}/${id}.webp`;
  const stored = await db.storage.from(BUCKET).upload(path, processed.webp, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: false,
  });
  if (stored.error) {
    await db.rpc("avatar_fail", { p_id: id, p_status: "failed", p_reason: "STORAGE_FAILED" });
    log("failed", { upload: id, code: "STORAGE_FAILED" });
    return { ok: false, code: "SERVER_ERROR" };
  }

  const avatarUrl: string = db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  const act = await db.rpc("avatar_activate", {
    p_id: id,
    p_path: path,
    p_url: avatarUrl,
    p_width: processed.width,
    p_height: processed.height,
    p_bytes: processed.webp.length,
  });
  const activated = typeof act.data === "object" && act.data ? act.data : null;
  if (act.error || !activated?.activated) {
    await deletePaths(db, [path]);
    const code: AvatarErrorCode = act.error ? "SERVER_ERROR" : "SUPERSEDED";
    if (act.error)
      await db.rpc("avatar_fail", { p_id: id, p_status: "failed", p_reason: "ACTIVATE_FAILED" });
    log(act.error ? "failed" : "superseded", { upload: id });
    return { ok: false, code };
  }
  await deletePaths(db, activated.stale_paths);
  log("activated", { upload: id, bytes: processed.webp.length });
  return { ok: true, avatarUrl };
}

export async function removeAvatarForUser(db: Admin, userId: string): Promise<{ ok: boolean }> {
  const { data, error } = await db.rpc("avatar_remove", { p_user: userId });
  if (error) return { ok: false };
  await deletePaths(db, typeof data === "object" && data ? data.stale_paths : undefined);
  return { ok: true };
}

export async function setPresetAvatarForUser(
  db: Admin,
  userId: string,
  url: string,
): Promise<{ ok: boolean }> {
  const { data, error } = await db.rpc("avatar_set_preset", { p_user: userId, p_avatar_url: url });
  if (error) return { ok: false };
  await deletePaths(db, typeof data === "object" && data ? data.stale_paths : undefined);
  return { ok: true };
}
