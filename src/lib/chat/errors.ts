export const CHAT_MESSAGES = {
  CHAT_RATE_LIMITED: "You're sending messages too fast. Please wait a few seconds.",
  CHAT_BLOCKED: "This message can't be sent.",
  CHAT_MUTED: "You're temporarily blocked from sending messages.",
  CHAT_EMPTY: "Escreva uma mensagem.",
  CHAT_TOO_LONG: "Message too long (500 characters max).",
  CHAT_INVALID: "This message can't be sent.",
  CHAT_UNAUTHENTICATED: "Entre na sua conta para usar o chat.",
  CHAT_GENERIC: "Couldn't send the message. Please try again.",
} as const;
export type ChatCode = keyof typeof CHAT_MESSAGES;
export const chatMessageFor = (code: string): string =>
  CHAT_MESSAGES[(code in CHAT_MESSAGES ? code : "CHAT_GENERIC") as ChatCode];
