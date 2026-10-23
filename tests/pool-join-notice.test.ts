import { describe, expect, it } from "vitest";
import { poolJoinAnnouncement } from "../src/lib/pool/join-notice";

const game = { id: 42, status: "STARTING", creatorId: "host" };

describe("pool join notice", () => {
  it("tells the host once when they are away from the table", () => {
    const first = poolJoinAnnouncement({
      game,
      userId: "host",
      pathname: "/wallet",
      toldId: null,
    });
    expect(first).toEqual({ toast: true, toldId: 42 });
    const again = poolJoinAnnouncement({
      game,
      userId: "host",
      pathname: "/guides/8-ball-pool-rules",
      toldId: first.toldId,
    });
    expect(again.toast).toBe(false);
  });

  it("stays quiet on the lobby, the match, and while the table is still empty", () => {
    expect(
      poolJoinAnnouncement({ game, userId: "host", pathname: "/8-ball-pool", toldId: null }).toast,
    ).toBe(false);
    expect(
      poolJoinAnnouncement({ game, userId: "host", pathname: "/pool/42", toldId: null }).toast,
    ).toBe(false);
    expect(
      poolJoinAnnouncement({
        game: { ...game, status: "WAITING" },
        userId: "host",
        pathname: "/wallet",
        toldId: null,
      }).toast,
    ).toBe(false);
    expect(
      poolJoinAnnouncement({ game, userId: "other", pathname: "/wallet", toldId: null }).toast,
    ).toBe(false);
  });
});
