import { createFileRoute } from "@tanstack/react-router";
import { AVATAR_UPLOAD_MAX_BYTES, type AvatarErrorCode } from "@/lib/avatar-upload/limits";
import type { Admin } from "@/lib/avatar-upload/service.server";

const STATUS: Partial<Record<AvatarErrorCode, number>> = {
  AUTH_REQUIRED: 401,
  FILE_TOO_LARGE: 413,
  RATE_LIMITED: 429,
  SUPERSEDED: 409,
  SERVER_ERROR: 503,
};

function reply(body: Record<string, unknown>, status = 200) {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" },
  });
}
const refuse = (code: AvatarErrorCode) => reply({ error: code }, STATUS[code] ?? 422);

/** Reads at most `limit` + 1 bytes, so an oversized body is refused without buffering it. */
async function readCapped(request: Request, limit: number): Promise<Uint8Array | null> {
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.byteLength;
  }
  return out;
}

/**
 * POST the finished 256×256 WebP the browser cropped and encoded. The client
 * never chooses a file name, path or status: the server verifies the image,
 * derives all of them and answers with the new public avatar URL.
 */
export const Route = createFileRoute("/api/avatar/upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { authenticatedUserId } = await import("@/lib/avatar-upload/auth.server");
        const userId = await authenticatedUserId(request);
        if (!userId) return refuse("AUTH_REQUIRED");
        const declared = Number(request.headers.get("content-length") ?? "0");
        if (declared > AVATAR_UPLOAD_MAX_BYTES) return refuse("FILE_TOO_LARGE");
        const bytes = await readCapped(request, AVATAR_UPLOAD_MAX_BYTES);
        if (!bytes) return refuse("FILE_TOO_LARGE");
        if (!bytes.length) return refuse("EMPTY_FILE");

        const [{ supabaseAdmin }, { serverDecoder }, { uploadAvatarForUser }] = await Promise.all([
          import("@/integrations/supabase/client.server"),
          import("@/lib/avatar-upload/codecs.server"),
          import("@/lib/avatar-upload/service.server"),
        ]);
        let decoder;
        try {
          decoder = await serverDecoder();
        } catch {
          return refuse("SERVER_ERROR");
        }
        const result = await uploadAvatarForUser(
          supabaseAdmin as unknown as Admin,
          decoder,
          userId,
          bytes,
        );
        return result.ok ? reply({ avatarUrl: result.avatarUrl }) : refuse(result.code);
      },
    },
  },
});
