import { describe, expect, it } from "vitest";
import {
  DISCORD_PROVIDER,
  discordAvatarFetchUrl,
  discordSignInMessage,
  isDiscordProvider,
  oauthRedirect,
} from "@/lib/discord-auth";

describe("Discord sign-in", () => {
  it("uses Supabase's built-in Discord provider (it maps Discord's id and verified email)", () => {
    expect(DISCORD_PROVIDER).toBe("discord");
    expect(isDiscordProvider("discord")).toBe(true);
    expect(isDiscordProvider("custom:discord")).toBe(true);
    expect(isDiscordProvider("email")).toBe(false);
  });

  it("returns only to the site's own pages", () => {
    expect(oauthRedirect("https://pvpspinarena.com", "/auth")).toBe(
      "https://pvpspinarena.com/auth",
    );
    expect(oauthRedirect("https://www.pvpspinarena.com", "/profile/security")).toBe(
      "https://www.pvpspinarena.com/profile/security",
    );
    expect(oauthRedirect("http://localhost:3000", "/auth")).toBe("http://localhost:3000/auth");
    expect(oauthRedirect("http://pvpspinarena.com", "/auth")).toBeNull();
    expect(oauthRedirect("https://evil.example", "/auth")).toBeNull();
  });

  it("says what went wrong in words the player can act on", () => {
    expect(discordSignInMessage("access_denied", "")).toMatch(/cancelled/);
    expect(
      discordSignInMessage(
        "provider_email_needs_verification",
        "Unverified email with discord. Verify the email with discord in order to sign in",
      ),
    ).toMatch(/Verify your email address in Discord/);
    expect(discordSignInMessage("identity_already_exists", "")).toMatch(/already linked/);
    expect(discordSignInMessage("server_error", "error missing provider id")).toMatch(
      /Couldn't sign in/,
    );
  });

  it("reads the built-in provider's avatar address, only from Discord's CDN", () => {
    const of = (avatar_url: string) =>
      discordAvatarFetchUrl({
        identities: [{ provider: "discord", identity_data: { avatar_url } }],
      });
    expect(of("https://cdn.discordapp.com/avatars/123456789012345678/a_abc123.gif")).toBe(
      "https://cdn.discordapp.com/avatars/123456789012345678/a_abc123.png?size=256",
    );
    expect(of("https://cdn.discordapp.com/embed/avatars/3.png")).toBeNull();
    expect(of("https://evil.example/avatars/123456789012345678/abc.png")).toBeNull();
    expect(of("https://cdn.discordapp.com/avatars/123456789012345678/abc.png?x=1")).toBeNull();
  });

  it("builds the avatar URL from Discord's id and avatar hash", () => {
    const user = {
      identities: [
        { provider: "discord", identity_data: { id: "123456789012345678", avatar: "a_abc123" } },
      ],
    };
    expect(discordAvatarFetchUrl(user)).toBe(
      "https://cdn.discordapp.com/avatars/123456789012345678/a_abc123.png?size=256",
    );
  });
});
