/** Central chat configuration. The database (`chat_send`) enforces the same limits authoritatively. */
export const CHAT_ROOMS = ["jackpot", "coinflip"] as const;
export type ChatRoom = (typeof CHAT_ROOMS)[number];

export const CHAT_CONFIG = {
  maxLength: 500,
  maxRequestBytes: 2048,
  pageSize: 50,
  maxClientMessages: 300,
  /** Mirrors chat_send() in the database — change both together. */
  rateLimits: [
    { max: 5, windowSeconds: 10 },
    { max: 20, windowSeconds: 60 },
    { max: 100, windowSeconds: 3600 },
  ],
  duplicateWindowSeconds: 30,
  /** Near-bottom threshold for auto-scroll (px). */
  stickToBottomPx: 80,
  /** Moderation thresholds (score = sum of rule weights). */
  thresholds: { medium: 2, high: 5 },
} as const;

export const chatTopic = (room: ChatRoom) => `chat:${room}`;
export const CHAT_EVENTS = { message: "message", removed: "removed" } as const;
