import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { rootHead } from "@/lib/seo/root-head";
import { warmScope } from "@/lib/warm-policy";

/**
 * What a page fetches that the visitor did not ask for (site cleanup, 2026-11-13). Before it,
 * every page load, a legal page or a guide included, pulled 3 MB of poker and pool art and ran
 * 17 lobby reads four seconds after it loaded, and a match did the same while it was starting.
 */
describe("idle warm-up scope", () => {
  it("warms everything on lobby and account pages", () => {
    for (const path of [
      "/",
      "/coinflip",
      "/roulette",
      "/slott",
      "/slott/12",
      "/poker",
      "/8-ball-pool",
    ])
      expect(warmScope(path), path).toBe("all");
    for (const path of ["/fps-duel", "/leaderboards", "/prestige", "/wallet", "/profile", "/auth"])
      expect(warmScope(path), path).toBe("all");
    expect(warmScope("/invite/abc")).toBe("all");
  });

  it("warms only route code on reading pages", () => {
    for (const path of [
      "/guides",
      "/guides/provably-fair-explained",
      "/guides/topics/poker",
      "/terms",
      "/privacy",
      "/responsible-gambling",
      "/editorial",
      "/about",
      "/how-it-works",
      "/fairness",
      "/fps-graphics-guide",
      "/fps-1v1",
    ])
      expect(warmScope(path), path).toBe("code");
  });

  it("warms nothing inside a match or at a table", () => {
    for (const path of [
      "/fps/41",
      "/fps-bomb",
      "/fps-br",
      "/fps-br/",
      "/poker/7",
      "/pool/9",
      "/pool/practice",
    ])
      expect(warmScope(path), path).toBe("none");
  });

  it("is what the router's idle warm-up asks before fetching", () => {
    const router = readFileSync("src/router.tsx", "utf8");
    expect(router).toContain("warmScope(window.location.pathname)");
    expect(router.indexOf('scope === "none"')).toBeLessThan(router.indexOf("loadRouteChunk"));
    expect(router.indexOf('scope !== "all"')).toBeLessThan(
      router.indexOf("prefetchGamePage(queryClient"),
    );
  });
});

describe("document head", () => {
  it("preloads the two text faces the page waits for, ahead of the route's scripts", () => {
    const root = readFileSync("src/routes/__root.tsx", "utf8");
    expect(root).toContain('"../fonts/manrope-latin.woff2?url"');
    expect(root).toContain('"../fonts/unbounded-latin.woff2?url"');
    const shell = root.slice(root.indexOf("function RootShell"));
    const faces = shell.indexOf("TEXT_FACES.map");
    expect(faces).toBeGreaterThan(0);
    expect(shell.slice(faces, shell.indexOf("<HeadContent />"))).toMatch(
      /rel="preload"\s+as="font"\s+type="font\/woff2"\s+href=\{href\}\s+crossOrigin="anonymous"/,
    );
    expect(faces).toBeLessThan(shell.indexOf("<HeadContent />"));
  });

  it("preloads no game art from the root: the slot route preloads its own backdrop", () => {
    const head = rootHead(false, "/app.css");
    expect(head.links.filter((link) => link.rel === "preload")).toEqual([]);
    expect(readFileSync("src/routes/__root.tsx", "utf8")).not.toContain("SLOT_STAGE");
    expect(readFileSync("src/routes/slott.tsx", "utf8")).toContain("href: SLOT_STAGE");
  });
});
