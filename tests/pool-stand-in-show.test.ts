import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  standInRackAction,
  standInRackReady,
  standInShouldAim,
  type StandInTableView,
} from "../src/lib/pool/stand-in-show";

function live(patch: Partial<StandInTableView> = {}): StandInTableView {
  return {
    status: "PLAYING",
    standIn: "B",
    turn: "B",
    shot: 4,
    winner: null,
    lastKind: "shot",
    lastStandIn: false,
    ...patch,
  };
}

describe("stand-in picture", () => {
  it("aims only while the away seat still has the table", () => {
    expect(standInShouldAim(live())).toBe(true);
    expect(standInShouldAim(live({ standIn: null, turn: "A" }))).toBe(false);
    expect(standInShouldAim(live({ winner: "B" }))).toBe(false);
    expect(standInShouldAim(live({ status: "COMPLETED" }))).toBe(false);
  });

  it("keeps the aimed rack when the server commits that stand-in shot", () => {
    expect(standInRackAction(null, live())).toBe("idle");
    expect(standInRackAction(4, live())).toBe("keep");
    expect(
      standInRackAction(4, live({ shot: 5, lastKind: "shot", lastStandIn: true })),
    ).toBe("keep");
    expect(
      standInRackAction(
        4,
        live({ shot: 5, lastKind: "shot", lastStandIn: true, winner: "B", status: "COMPLETED" }),
      ),
    ).toBe("keep");
  });

  it("drops the rack when the player sits down, the clock expires, or a person shoots", () => {
    expect(standInRackAction(4, live({ standIn: null, turn: "B" }))).toBe("abort");
    expect(standInRackAction(4, live({ shot: 5, lastKind: "timeout" }))).toBe("abort");
    expect(standInRackAction(4, live({ shot: 5, lastKind: "forfeit" }))).toBe("abort");
    expect(standInRackAction(4, live({ shot: 5, lastKind: "shot", lastStandIn: false }))).toBe(
      "abort",
    );
    expect(standInRackAction(4, live({ status: "CANCELLED" }))).toBe("abort");
  });

  it("releases the frozen rack only after the server shot is published", () => {
    expect(standInRackReady(4, 4)).toBe(false);
    expect(standInRackReady(4, 5)).toBe(true);
  });

  it("holds the match rack until the stand-in shot is watched", () => {
    const match = readFileSync(new URL("../src/components/pool/PoolMatch.tsx", import.meta.url), "utf8");
    const roll = match.indexOf("void rollStandIn");
    const pulled = match.indexOf("const onCuePulled");
    const between = match.slice(roll, pulled);
    expect(match).toContain("heldRack ??");
    expect(match).toContain("standInRackAction");
    expect(between).not.toContain("cancel = true");
    expect(between).not.toContain("if (!aimingThis)");
    expect(between).toContain("showShot.current !== shotN");
  });
});
