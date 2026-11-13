import { describe, expect, it } from "vitest";
import { canonicalHostRedirect, httpsRedirect, securityHeaders } from "@/lib/security-headers";

describe("canonical host", () => {
  it("sends www browsing to the apex host in one hop", () => {
    const response = canonicalHostRedirect(
      new Request("https://www.pvpspinarena.com/guides/cs2-roulette?q=1"),
    );
    expect(response?.status).toBe(308);
    expect(response?.headers.get("location")).toBe(
      "https://pvpspinarena.com/guides/cs2-roulette?q=1",
    );
  });

  it("leaves the apex host and posted www requests alone", () => {
    expect(canonicalHostRedirect(new Request("https://pvpspinarena.com/"))).toBeNull();
    expect(
      canonicalHostRedirect(
        new Request("https://www.pvpspinarena.com/api/public/cron/x", { method: "POST" }),
      ),
    ).toBeNull();
  });

  it("still upgrades plain http on the apex host", () => {
    const response = httpsRedirect(new Request("http://pvpspinarena.com/roulette"));
    expect(response?.status).toBe(308);
    expect(response?.headers.get("location")).toBe("https://pvpspinarena.com/roulette");
  });
});

// The site is no longer built in the Lovable editor (owner, 2026-11-13): no host may frame it.
describe("framing", () => {
  it("is refused on every host, the old editor preview zones included", () => {
    for (const host of ["pvpspinarena.com", "pvp-arena.lovable.app", "x.lovableproject.com"]) {
      const headers = securityHeaders(new Request(`https://${host}/`));
      expect(headers["content-security-policy"], host).toContain("frame-ancestors 'none'");
      expect(headers["x-frame-options"], host).toBe("DENY");
    }
  });
});
