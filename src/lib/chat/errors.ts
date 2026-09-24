export const CHAT_MESSAGES = {
  CHAT_RATE_LIMITED: "Você está enviando mensagens muito rápido. Aguarde alguns segundos.",
  CHAT_BLOCKED: "Essa mensagem não pode ser enviada.",
  CHAT_MUTED: "Você está temporariamente impedido de enviar mensagens.",
  CHAT_EMPTY: "Escreva uma mensagem.",
  CHAT_TOO_LONG: "Mensagem muito longa (máximo de 500 caracteres).",
  CHAT_INVALID: "Essa mensagem não pode ser enviada.",
  CHAT_UNAUTHENTICATED: "Entre na sua conta para usar o chat.",
  CHAT_GENERIC: "Não foi possível enviar a mensagem. Tente novamente.",
} as const;
export type ChatCode = keyof typeof CHAT_MESSAGES;
export const chatMessageFor = (code: string): string =>
  CHAT_MESSAGES[(code in CHAT_MESSAGES ? code : "CHAT_GENERIC") as ChatCode];
