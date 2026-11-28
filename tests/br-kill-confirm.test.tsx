import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BrCounters, BrKillConfirm, BrPhaseBanner } from "../src/components/fps/BrHud";
import type { BrHud } from "../src/lib/fps/br/br-arena";
import type { BrMatchState } from "../src/lib/fps/br/match";
import { stampKillDistances } from "../src/lib/fps/br/match";
import { CONFIRM_STREAK_MS, nextConfirm, type KillConfirm } from "../src/lib/fps/br/kill-confirm";

// Owner, 2026-11-27: a blood-red KILLED with the victim's name and the kill distance in metres,
// from authoritative events, never twice for one kill; the kill count beside the players alive.

type Elim = { type: "elim"; seat: number; by: number; gun: string; m?: number };
const body = (x: number, y: number, z: number) => ({ body: { x, y, z } });

describe("BR kill distance (server)", () => {
  it("stamps the killer-to-victim distance in whole metres on another player's elimination", () => {
    const state = {
      seats: [body(0, 0, 0), body(30, 4, 40), body(5, 0, 5)],
      combat: [{ type: "elim", seat: 1, by: 0, gun: "m4" }] as Elim[],
    } as unknown as BrMatchState;
    stampKillDistances(state);
    expect((state.combat[0] as Elim).m).toBe(Math.round(Math.hypot(30, 4, 40)));
  });
  it("leaves self, zone and already stamped eliminations alone", () => {
    const combat: Elim[] = [
      { type: "elim", seat: 2, by: 2, gun: "gas" },
      { type: "elim", seat: 1, by: 0, gun: "m4", m: 7 },
    ];
    const state = {
      seats: [body(0, 0, 0), body(100, 0, 0), body(5, 0, 5)],
      combat,
    } as unknown as BrMatchState;
    stampKillDistances(state);
    expect(combat[0]!.m).toBeUndefined();
    expect(combat[1]!.m).toBe(7);
  });
});

describe("BR kill confirmation (client)", () => {
  const event = (seat: number) => ({
    kind: "confirm" as const,
    seat,
    victim: `BOT ${seat}`,
    weapon: "m4" as const,
    m: 142,
  });
  it("shows a kill once, however often the event arrives (fast path, view, reconnect replay)", () => {
    const seen = new Set<number>();
    const first = nextConfirm(null, seen, event(7), 1000);
    expect(first).toMatchObject({ seat: 7, victim: "BOT 7", m: 142, streak: 1 });
    expect(nextConfirm(first, seen, event(7), 1050)).toBeNull();
    expect(nextConfirm(first, seen, event(7), 9000)).toBeNull();
  });
  it("counts a streak for kills in quick succession and starts over after a pause", () => {
    const seen = new Set<number>();
    const a = nextConfirm(null, seen, event(1), 0)!;
    const b = nextConfirm(a, seen, event(2), 1500)!;
    expect(b.streak).toBe(2);
    const c = nextConfirm(b, seen, event(3), 1500 + CONFIRM_STREAK_MS + 1)!;
    expect(c.streak).toBe(1);
  });
  it("renders KILLED, the name, the weapon and the distance", () => {
    const confirm: KillConfirm = {
      seat: 7,
      at: 0,
      victim: "BOT Atlas-3",
      weapon: "m4",
      m: 142,
      streak: 2,
    };
    const html = renderToStaticMarkup(<BrKillConfirm confirm={confirm} />);
    expect(html).toContain("KILLED");
    expect(html).toContain("BOT Atlas-3");
    expect(html).toContain("<b>142</b>");
    expect(html).toContain("×2");
    expect(html).toContain('aria-live="assertive"');
    expect(renderToStaticMarkup(<BrKillConfirm confirm={{ ...confirm, m: null }} />)).not.toContain(
      "br-kc-dist",
    );
    expect(renderToStaticMarkup(<BrKillConfirm confirm={null} />)).toBe("");
  });
});

describe("BR counters", () => {
  it("shows kills beside the players alive, and the players aboard while the plane flies", () => {
    const ground = renderToStaticMarkup(<BrCounters alive={32} kills={3} aboard={null} />);
    expect(ground).toMatch(/<b[^>]*>3<\/b>.*Killed/);
    expect(ground).toMatch(/<b[^>]*>32<\/b>.*Alive/);
    expect(ground).not.toContain("Aboard");
    const plane = renderToStaticMarkup(<BrCounters alive={100} kills={0} aboard={87} />);
    expect(plane).toMatch(/<b[^>]*>87<\/b>.*Aboard/);
  });
  it("names the phase and turns the jump countdown urgent in its last seconds", () => {
    const html = renderToStaticMarkup(
      <BrPhaseBanner
        hud={
          {
            phase: "plane",
            myPhase: "plane",
            jumpOpen: true,
            countdown: 4,
            alive: 100,
            aboard: 87,
          } as unknown as BrHud
        }
      />,
    );
    expect(html).toContain("Jump now");
    expect(html).toContain("urgent");
  });
});
