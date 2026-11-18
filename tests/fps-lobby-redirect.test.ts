import { describe, expect, it } from "vitest";
import { fpsLobbyRedirect } from "@/lib/seo/fps-lobby-redirect";

describe("retired FPS lobby URL", () => {
  it("permanently redirects both forms to the homepage and preserves query parameters", () => {
    for (const method of ["GET", "HEAD"]) {
      for (const path of ["/fps-duel", "/fps-duel/"]) {
        const response = fpsLobbyRedirect(
          new Request(`https://pvpspinarena.com${path}?utm_source=old-link&mode=br`, { method }),
        );
        expect(response?.status).toBe(301);
        expect(response?.headers.get("location")).toBe(
          "https://pvpspinarena.com/?utm_source=old-link&mode=br",
        );
      }
    }
  });
  it("leaves the homepage, real match routes, similarly named paths and posts alone", () => {
    for (const path of ["/", "/fps-br", "/fps-bomb", "/fps/example", "/fps-duel-extra"]) {
      expect(fpsLobbyRedirect(new Request(`https://pvpspinarena.com${path}`))).toBeNull();
    }
    expect(
      fpsLobbyRedirect(new Request("https://pvpspinarena.com/fps-duel", { method: "POST" })),
    ).toBeNull();
  });
});
