import { z } from "zod";
import { CHAT_CONFIG, CHAT_ROOMS } from "./config";

/** The only fields a browser may send. Identity, status and moderation are server-decided. */
export const sendChatSchema = z
  .object({
    game_type: z.enum(CHAT_ROOMS),
    // Raw cap before normalisation; the normalised text is capped at 500 characters.
    message: z.string().max(CHAT_CONFIG.maxRequestBytes),
  })
  .strict();
