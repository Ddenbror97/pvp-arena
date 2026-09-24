import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sendMessage } from "./chat.server";
import { sendChatSchema } from "./schema";

export const sendChatMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => sendChatSchema.parse(d))
  .handler(async ({ data, context }) => sendMessage(context.userId, data.game_type, data.message));
