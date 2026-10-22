import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getGuide, GUIDES } from "@/content/guides";
import { nextInstant } from "@/components/slott/moment";
import { channelFresh, markChannel, noteChannelEvent } from "@/lib/live-channel";
import { guidePage, guidesHub } from "@/lib/guides/pages.server";
import { pokerRefetchMs } from "@/lib/poker/poll";
import { slotRefetchMs } from "@/lib/slott/poll";

describe("guide bodies stay out of the worker graph", () => {
  it("server guide routes import the catalog, not the article barrel", () => {
    const page = readFileSync("src/lib/guides/pages.server.ts", "utf8");
    const sitemap = readFileSync("src/routes/sitemap[.]xml.tsx", "utf8");
    expect(page).not.toContain('from "@/content/guides"');
    expect(sitemap).not.toContain('from "@/content/guides"');
  });

  it("loads one article from its JSON file and keeps the hub index", async () => {
    const page = await guidePage("what-is-a-crypto-casino");
    const source = getGuide("what-is-a-crypto-casino");
    expect(source).toBeTruthy();
    expect(page?.guide.h1).toBe(source?.h1);
    expect(page?.guide.sections.length).toBe(source?.sections.length);
    expect(page?.guide.faqs.length).toBe(source?.faqs.length);
    expect(guidesHub().guides).toHaveLength(GUIDES.length);
  });
});

describe("slot clock thresholds", () => {
  it("wakes at the next future mark and ignores marks already passed", () => {
    expect(nextInstant(1_000, [900, 1_000, 1_500, 2_000])).toBe(1_500);
    expect(nextInstant(3_000, [900, 1_500])).toBeNull();
    expect(nextInstant(0, [Number.NaN, Number.POSITIVE_INFINITY])).toBeNull();
  });
});

describe("realtime poll backoff", () => {
  it("keeps the fast slot poll until a broadcast for that match is fresh", () => {
    expect(slotRefetchMs({ kind: "game", status: "ACTIVE", channelUp: false, fresh: false })).toBe(
      1_500,
    );
    expect(slotRefetchMs({ kind: "spins", status: "ACTIVE", channelUp: true, fresh: false })).toBe(
      4_000,
    );
    expect(slotRefetchMs({ kind: "game", status: "ACTIVE", channelUp: true, fresh: true })).toBe(
      12_000,
    );
    expect(slotRefetchMs({ kind: "bonus", status: "ACTIVE", channelUp: true, fresh: true })).toBe(
      20_000,
    );
    expect(slotRefetchMs({ kind: "game", status: "COMPLETED", channelUp: true, fresh: true })).toBe(
      false,
    );
    expect(slotRefetchMs({ kind: "game", status: "WAITING", channelUp: true, fresh: true })).toBe(
      8_000,
    );
  });

  it("does not stretch poker commit or betting polls", () => {
    expect(pokerRefetchMs("COMMIT", true)).toBe(1_500);
    expect(pokerRefetchMs("BETTING", true)).toBe(1_500);
    expect(pokerRefetchMs("SETTLEMENT", true)).toBe(4_000);
    expect(pokerRefetchMs(null, true)).toBe(8_000);
    expect(pokerRefetchMs("BETTING", false)).toBe(1_500);
    expect(pokerRefetchMs(null, false)).toBe(3_000);
  });

  it("treats a channel as fresh only while it is subscribed and recently heard", () => {
    noteChannelEvent("slot:9", 1_000);
    expect(channelFresh("slot:9", 8_000, 2_000, "slot")).toBe(false);
    markChannel("slot", true);
    expect(channelFresh("slot:9", 8_000, 2_000, "slot")).toBe(true);
    expect(channelFresh("slot:9", 8_000, 20_000, "slot")).toBe(false);
    markChannel("slot", false);
  });
});

describe("guide asset binding", () => {
  it("accepts the Cloudflare ASSETS fetcher and ignores string env bags", async () => {
    const { assetsFromEnv } = await import("@/lib/worker-env");
    expect(assetsFromEnv({ SUPABASE_URL: "https://example.supabase.co" })).toBeUndefined();
    const assets = assetsFromEnv({
      ASSETS: { fetch: async () => new Response("ok") },
    });
    expect(await (await assets!.fetch(new Request("https://pvpspinarena.com/x"))).text()).toBe(
      "ok",
    );
  });
});
