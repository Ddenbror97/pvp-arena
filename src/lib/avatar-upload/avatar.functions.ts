import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AVATAR_STYLES, storedAvatarUrl } from "@/lib/avatar";
import type { Admin } from "./service.server";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as Admin;
}

/** Back to the default avatar; deletes the uploaded file. */
export const removeCustomAvatar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { removeAvatarForUser } = await import("./service.server");
    const res = await removeAvatarForUser(await admin(), context.userId);
    if (!res.ok) throw new Error("We couldn't remove your avatar right now. Please try again.");
    return { ok: true };
  });

/** Built-in avatar pick; also deletes any uploaded file. */
export const setPresetAvatar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({ style: z.enum(AVATAR_STYLES), seed: z.string().regex(/^[A-Za-z0-9_]{1,40}$/) })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { setPresetAvatarForUser } = await import("./service.server");
    const res = await setPresetAvatarForUser(
      await admin(),
      context.userId,
      storedAvatarUrl(data.style, data.seed),
    );
    if (!res.ok) throw new Error("We couldn't change your avatar right now. Please try again.");
    return { ok: true };
  });
