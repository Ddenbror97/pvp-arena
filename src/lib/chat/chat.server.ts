import { rulesProvider, validateMessage, type ModerationProvider } from "./moderation";
import type { ChatRoom } from "./config";
import type { ChatCode } from "./errors";

export type SendResult = { ok: true; id: string } | { ok: false; code: ChatCode };

/** Identity comes only from the verified session (userId); the browser supplies text + room. */
export async function sendMessage(
  userId: string,
  room: ChatRoom,
  raw: string,
  provider: ModerationProvider = rulesProvider,
): Promise<SendResult> {
  const v = validateMessage(raw);
  if (!v.ok) return { ok: false, code: v.code };
  const verdict = await provider.classify(v.text);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc(
    "chat_send" as never,
    {
      p_user: userId,
      p_game: room,
      p_message: v.text,
      p_severity: verdict.severity,
      p_reason: verdict.reason,
    } as never,
  );
  if (error) {
    console.error("chat_send failed", error.code);
    return { ok: false, code: "CHAT_GENERIC" };
  }
  const r = data as unknown as { ok: boolean; id?: string; code?: ChatCode };
  return r.ok && r.id ? { ok: true, id: r.id } : { ok: false, code: r.code ?? "CHAT_GENERIC" };
}
