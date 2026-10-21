import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  classifyMessage,
  normalizeMessage,
  skeleton,
  validateMessage,
} from "../src/lib/chat/moderation";
import { sendChatSchema } from "../src/lib/chat/schema";
import {
  compareMessages,
  mergeMessages,
  parseBroadcast,
  type ChatMessage,
} from "../src/lib/chat/messages";
import { chatMessageFor } from "../src/lib/chat/errors";
import { ChatMessageRow } from "../src/components/chat/ChatMessageRow";
import { chatDayLabel, continuesPlayerTurn } from "../src/lib/chat/time";

const sev = (t: string) => classifyMessage(t).severity;

describe("validation & normalisation", () => {
  it("rejects empty / whitespace / invisible-only messages", () => {
    for (const t of ["", "   ", "\n\t", "\u200B\u200B", "\u0000"])
      expect(validateMessage(t)).toEqual({ ok: false, code: "CHAT_EMPTY" });
  });
  it("enforces 500 characters (code points, so emoji count once)", () => {
    expect(validateMessage("a".repeat(500)).ok).toBe(true);
    expect(validateMessage("a".repeat(501))).toEqual({ ok: false, code: "CHAT_TOO_LONG" });
    expect(validateMessage("😀".repeat(500)).ok).toBe(true);
  });
  it("normalises safely and keeps languages and emoji", () => {
    expect(normalizeMessage("  gg   wp \n\n nice ")).toBe("gg wp nice");
    expect(normalizeMessage("o\u200Bi")).toBe("oi");
    expect(normalizeMessage("e\u0301")).toBe("é"); // NFC
    expect(normalizeMessage("Boa sorte! 🍀 ação 你好 مرحبا")).toBe("Boa sorte! 🍀 ação 你好 مرحبا");
    expect(normalizeMessage("bad\uD800surrogate")).toBe("badsurrogate");
    expect(normalizeMessage("a\u202Eb")).toBe("ab");
  });
  it("builds an obfuscation-resistant skeleton", () => {
    expect(skeleton("F.U.C.K")).toBe("fuck");
    expect(skeleton("fuuuuck")).toBe("fuck");
    expect(skeleton("$h1t")).toBe("shit");
  });
});

describe("classification", () => {
  it("lets normal gaming chat through (PT + EN)", () => {
    for (const t of [
      "gg",
      "gg wp",
      "ez",
      "rip",
      "nice",
      "vamos!",
      "boa sorte",
      "que sorte",
      "kill streak",
      "Let's go 🔥",
      "quase ganhei kkkkk",
      "próxima rodada eu ganho",
      "classic assassin",
      "grape juice",
      "who's in?",
      "valeu galera",
      "GG",
    ])
      expect(sev(t), t).toBe("LOW");
  });
  it("flags profanity including obfuscation", () => {
    for (const t of [
      "fuck",
      "f u c k",
      "fuuuck this",
      "f*ck".replace("*", "u"),
      "$hit",
      "porra",
      "caralho",
    ])
      expect(sev(t), t).not.toBe("LOW");
  });
  it("blocks slurs, threats, sexual content and scams", () => {
    for (const t of [
      "I will kill you",
      "kys",
      "vou te matar",
      "send me eth",
      "share your seed phrase",
      "manda pix",
      "claim your airdrop now",
      "frase de recuperação",
    ])
      expect(sev(t), t).toBe("HIGH");
  });
  it("holds links for review and never marks them visible", () => {
    for (const t of [
      "https://evil.example",
      "go to www.site",
      "join discord.gg/abc",
      "t.me/scam",
      "visit pvp-casino.xyz",
      "http://1.2.3.4/x",
      "bit.ly/abc",
    ])
      expect(sev(t), t).not.toBe("LOW");
  });
  it("detects spam patterns", () => {
    expect(sev("aaaaaaaaaaaaaaaaaaaa")).not.toBe("LOW");
    expect(sev("😀".repeat(20))).not.toBe("LOW");
    expect(sev("buy buy buy buy buy buy buy buy")).not.toBe("LOW");
    expect(classifyMessage("THIS IS ALL CAPS SHOUTING").categories).toContain("caps");
  });
});

describe("request validation", () => {
  it("accepts only room + message, rejecting spoofed fields", () => {
    expect(sendChatSchema.safeParse({ game_type: "jackpot", message: "hi" }).success).toBe(true);
    for (const bad of [
      { game_type: "jackpot", message: "hi", user_id: "x" },
      { game_type: "jackpot", message: "hi", status: "visible" },
      { game_type: "jackpot", message: "hi", username: "admin" },
      { game_type: "poker", message: "hi" },
      { game_type: "jackpot", message: 42 },
      { game_type: "jackpot", message: "x".repeat(3000) },
      null,
      "string",
    ])
      expect(sendChatSchema.safeParse(bad).success).toBe(false);
  });
  it("maps codes to Portuguese messages without internals", () => {
    expect(chatMessageFor("CHAT_RATE_LIMITED")).toBe(
      "You're sending messages too fast. Please wait a few seconds.",
    );
    expect(chatMessageFor("CHAT_MUTED")).toBe("You're temporarily blocked from sending messages.");
    expect(chatMessageFor("CHAT_BLOCKED")).toBe("This message can't be sent.");
    expect(chatMessageFor("SOMETHING_INTERNAL")).toBe(chatMessageFor("CHAT_GENERIC"));
  });
});

const msg = (id: string, at: string, extra: Partial<ChatMessage> = {}): ChatMessage => ({
  id,
  game_type: "jackpot",
  user_id: "u",
  display_name: "p",
  avatar_url: null,
  message: "m",
  created_at: at,
  ...extra,
});

describe("client merge / realtime payloads", () => {
  it("dedupes by id and orders by (created_at, id)", () => {
    const a = msg("b", "2026-01-01T00:00:00.000Z");
    const b = msg("a", "2026-01-01T00:00:00.000Z");
    const c = msg("c", "2025-12-31T00:00:00.000Z");
    const out = mergeMessages([a], [a, b, c, b]);
    expect(out.map((m) => m.id)).toEqual(["c", "a", "b"]);
    expect([...out].sort(compareMessages)).toEqual(out);
  });
  it("caps retained messages", () => {
    const many = Array.from({ length: 400 }, (_, i) =>
      msg(String(i).padStart(4, "0"), new Date(1e12 + i * 1000).toISOString()),
    );
    const out = mergeMessages([], many);
    expect(out).toHaveLength(300);
    expect(out[299]!.id).toBe("0399");
  });
  it("rejects malformed or cross-room broadcasts", () => {
    const ok = {
      id: "1",
      game_type: "jackpot",
      user_id: "u",
      display_name: "p",
      message: "hi",
      created_at: "2026-01-01T00:00:00Z",
    };
    expect(parseBroadcast("jackpot", ok)).not.toBeNull();
    expect(parseBroadcast("coinflip", ok)).toBeNull();
    for (const bad of [
      null,
      5,
      "x",
      { ...ok, id: 1 },
      { ...ok, created_at: "nope" },
      { ...ok, message: "x".repeat(5000) },
    ])
      expect(parseBroadcast("jackpot", bad)).toBeNull();
  });
  it("renders hostile content as inert text", () => {
    for (const payload of [
      "<script>alert(1)</script>",
      "<img src=x onerror=alert(1)>",
      '<iframe src="javascript:alert(1)">',
      "[x](javascript:alert(1))",
      "https://evil.example",
    ]) {
      const html = renderToStaticMarkup(
        createElement(ChatMessageRow, {
          m: msg("1", "2026-01-01T00:00:00Z", {
            message: payload,
            display_name: '<b onmouseover="x">n</b>',
          }),
          mine: false,
        }),
      );
      expect(html).not.toMatch(/<script|<img|<iframe|<a |<b /i);
      expect(html).not.toContain("href=");
    }
  });
});

describe("chat time structure", () => {
  const at = (id: string, iso: string, user = "a") =>
    msg(id, iso, { user_id: user, display_name: user });

  it("keeps a follow-up from the same player under one clock", () => {
    const first = at("1", "2026-10-21T18:58:00Z");
    const next = at("2", "2026-10-21T19:01:00Z");
    expect(continuesPlayerTurn(first, next)).toBe(true);
    expect(continuesPlayerTurn(first, at("3", "2026-10-21T19:04:00Z"))).toBe(false);
    expect(continuesPlayerTurn(first, at("4", "2026-10-21T18:59:00Z", "b"))).toBe(false);
  });

  it("starts a new turn when the local day changes", () => {
    const evening = at("1", new Date(2026, 9, 21, 23, 58).toISOString());
    const morning = at("2", new Date(2026, 9, 22, 0, 1).toISOString());
    expect(continuesPlayerTurn(evening, morning)).toBe(false);
    expect(chatDayLabel(evening.created_at, new Date(evening.created_at))).toBe("Today");
    expect(chatDayLabel(evening.created_at, new Date(morning.created_at))).toBe("Yesterday");
  });

  it("hides the name and clock on a continued line", () => {
    const html = renderToStaticMarkup(
      createElement(ChatMessageRow, {
        m: msg("1", "2026-10-21T18:58:00Z", { display_name: "Ace", message: "again" }),
        mine: false,
        continued: true,
      }),
    );
    expect(html).not.toContain("Ace");
    expect(html).not.toContain("<time");
    expect(html).toContain("again");
  });
});
