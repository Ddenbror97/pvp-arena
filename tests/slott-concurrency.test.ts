import { existsSync, readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { bestLineCaption, spinReveal } from "@/components/slott/hits";
import { isBaseFinalSpin } from "@/components/slott/presentation";
import {
  claimReelRun,
  reelStrip,
  releaseReelRun,
  visibleColumn,
} from "@/components/slott/reel-run";
import { releaseReelAudio } from "@/components/slott/sfx";
import { admitSpin, reuseSpinKey } from "@/components/slott/spin-guard";
import { presentSpinStart, spinArrivedLive } from "@/components/slott/timing";
import { BOMB, hasBomb, SYMBOLS, WEIGHT_TOTAL } from "@/lib/slott/paytable";
import { mergeSlotSpins, preferNewerSlotGame, reconcileAfter } from "@/lib/slott/reconcile";
import { slotSpinDecision } from "@/lib/slott/spin-decision";

const line = (symbol: number, count: number, score: number, n = 1) => ({
  line: n,
  symbol,
  count,
  score,
});

describe("slot spin gate", () => {
  it("accepts one click and refuses a second in the same turn", () => {
    const gate = { locked: false, held: null as number | null, canSpin: true, nextSpin: 3 };
    expect(admitSpin(gate)).toBe(true);
    gate.locked = true;
    gate.held = 3;
    expect(admitSpin(gate)).toBe(false);
    gate.locked = false;
    expect(admitSpin(gate)).toBe(false);
  });

  it("refuses a keyboard activation while the click is still processing", () => {
    expect(admitSpin({ locked: true, held: 3, canSpin: true, nextSpin: 3 })).toBe(false);
  });

  it("allows the next spin only after the held number advances", () => {
    expect(admitSpin({ locked: false, held: 3, canSpin: true, nextSpin: 3 })).toBe(false);
    expect(admitSpin({ locked: false, held: null, canSpin: true, nextSpin: 4 })).toBe(true);
  });

  it("stays closed when the button is not allowed to spin", () => {
    expect(admitSpin({ locked: false, held: null, canSpin: false, nextSpin: 3 })).toBe(false);
  });

  it("keeps the idempotency key after a timeout and drops it after a rejected spin", () => {
    expect(reuseSpinKey("TypeError: Failed to fetch")).toBe(true);
    expect(reuseSpinKey("network timeout")).toBe(true);
    expect(reuseSpinKey("STALE_ACTION")).toBe(false);
    expect(reuseSpinKey("NOT_YOUR_TURN")).toBe(false);
  });
});

describe("slot spin server decision", () => {
  it("replays the same idempotency key instead of spinning again", () => {
    expect(
      slotSpinDecision({
        existingKey: { gameId: 9, spinNo: 4 },
        gameId: 9,
        spinNo: 4,
        nextSpin: 5,
        playerHasSpin: true,
      }),
    ).toBe("duplicate");
  });

  it("rejects a key reused for a different spin", () => {
    expect(
      slotSpinDecision({
        existingKey: { gameId: 9, spinNo: 4 },
        gameId: 9,
        spinNo: 5,
        nextSpin: 5,
        playerHasSpin: false,
      }),
    ).toBe("conflict");
  });

  it("treats a retry with a new key, after the spin committed, as a duplicate", () => {
    expect(
      slotSpinDecision({
        existingKey: null,
        gameId: 9,
        spinNo: 4,
        nextSpin: 5,
        playerHasSpin: true,
      }),
    ).toBe("duplicate");
  });

  it("lets the second tab observe the row the first tab already committed", () => {
    let nextSpin = 4;
    expect(
      slotSpinDecision({
        existingKey: null,
        gameId: 9,
        spinNo: 4,
        nextSpin,
        playerHasSpin: false,
      }),
    ).toBe("play");
    nextSpin = 5;
    expect(
      slotSpinDecision({
        existingKey: null,
        gameId: 9,
        spinNo: 4,
        nextSpin,
        playerHasSpin: true,
      }),
    ).toBe("duplicate");
  });

  it("refuses a spin number the match has not reached", () => {
    expect(
      slotSpinDecision({
        existingKey: null,
        gameId: 9,
        spinNo: 6,
        nextSpin: 5,
        playerHasSpin: false,
      }),
    ).toBe("stale");
  });

  it("rejects the other player replaying a spin the first player already took", () => {
    expect(
      slotSpinDecision({
        existingKey: null,
        gameId: 9,
        spinNo: 4,
        nextSpin: 5,
        playerHasSpin: false,
      }),
    ).toBe("stale");
  });
});

describe("slot state reconciliation", () => {
  it("keeps a spin that a slower poll has not seen yet", () => {
    const merged = mergeSlotSpins(
      [{ game_id: 1, spin_no: 3, score: 42 }],
      [
        { game_id: 1, spin_no: 1, score: 2 },
        { game_id: 1, spin_no: 2, score: 4 },
      ],
    );
    expect(merged.map((spin) => spin.spin_no)).toEqual([1, 2, 3]);
    expect(merged[2]?.score).toBe(42);
  });

  it("lets the server row replace an optimistic copy of the same spin", () => {
    const merged = mergeSlotSpins(
      [{ game_id: 1, spin_no: 1, score: 1 }],
      [{ game_id: 1, spin_no: 1, score: 8 }],
    );
    expect(merged).toEqual([{ game_id: 1, spin_no: 1, score: 8 }]);
  });

  it("does not rewind next_spin or a finished match", () => {
    const live = { id: 4, status: "ACTIVE", next_spin: 6 };
    expect(preferNewerSlotGame(live, { id: 4, status: "ACTIVE", next_spin: 5 })).toBe(live);
    const done = { id: 4, status: "COMPLETED", next_spin: 12 };
    expect(preferNewerSlotGame(done, { id: 4, status: "ACTIVE", next_spin: 12 })).toBe(done);
    expect(preferNewerSlotGame(live, { id: 8, status: "WAITING", next_spin: 1 }).id).toBe(8);
  });

  it("keeps a spin written while an older read was still in flight", async () => {
    let cache = [{ game_id: 1, spin_no: 1, score: 2 }];
    const merged = await reconcileAfter(
      async () => {
        cache = [...cache, { game_id: 1, spin_no: 2, score: 9 }];
        return [{ game_id: 1, spin_no: 1, score: 2 }];
      },
      () => cache,
      mergeSlotSpins,
    );
    expect(merged.map((spin) => spin.spin_no)).toEqual([1, 2]);
    expect(merged[1]?.score).toBe(9);
  });

  it("does not let a slow game read rewind a newer cache", async () => {
    let cache = { id: 4, status: "ACTIVE", next_spin: 5 };
    const game = await reconcileAfter(
      async () => {
        cache = { id: 4, status: "ACTIVE", next_spin: 6 };
        return { id: 4, status: "ACTIVE", next_spin: 5 };
      },
      () => cache,
      preferNewerSlotGame,
    );
    expect(game?.next_spin).toBe(6);
  });
});

describe("slot animation ownership", () => {
  it("ignores a second start and a stale cancel after unmount", () => {
    const ran = { current: null as string | null };
    expect(claimReelRun(ran, "m:1")).toBe(true);
    expect(claimReelRun(ran, "m:1")).toBe(false);
    expect(claimReelRun(ran, "m:2")).toBe(true);
    releaseReelRun(ran, "m:1");
    expect(ran.current).toBe("m:2");
    releaseReelRun(ran, "m:2");
    expect(ran.current).toBeNull();
  });

  it("lands on the server column, including while filler is still in the strip", () => {
    const column = [4, 5, 6, 7];
    const strip = reelStrip(
      { pending: false, head: [1, 1, 1, 1], filler: [2, 3], column },
      [0, 0, 0, 0],
    );
    expect(visibleColumn(strip, 4)).toEqual(column);
    const looping = reelStrip(
      { pending: true, head: [1, 1, 1, 1], filler: [2], column },
      [0, 0, 0, 0],
    );
    expect(visibleColumn(looping, 4)).toEqual([1, 1, 1, 1]);
  });

  it("does not replay a spin that was already on the board at refresh", () => {
    expect(spinArrivedLive(5, 5)).toBe(false);
    expect(spinArrivedLive(5, 6)).toBe(true);
    expect(presentSpinStart(1_000, 3200, 20_000, null, false)).toBeNull();
  });
});

describe("slot score and six-spin progress", () => {
  it("attributes the floating score to the seat that spun", () => {
    const reveal = spinReveal(
      { seat: "B", score: 42, lines: [line(0, 3, 15)] },
      { A: "Host", B: "Nova" },
      () => "Sapphire",
    );
    expect(reveal).toEqual({ who: "Nova", score: 42, line: "3× Sapphire" });
    expect(bestLineCaption([], () => "Sapphire")).toBeUndefined();
  });

  it("gives each seat six base spins and does not call a later spin the base final", () => {
    const spins = Array.from({ length: 12 }, (_, i) => i + 1);
    expect(spins.filter((n) => n % 2 === 1)).toHaveLength(6);
    expect(spins.filter((n) => n % 2 === 0)).toHaveLength(6);
    expect(isBaseFinalSpin(11, 6)).toBe(true);
    expect(isBaseFinalSpin(12, 6)).toBe(true);
    expect(isBaseFinalSpin(13, 6)).toBe(false);
  });

  it("keeps a bomb on the server grid and outside the weighted symbols", () => {
    expect(BOMB).toBe(20);
    expect(hasBomb([1, 20, 3])).toBe(true);
    expect(hasBomb([1, 2, 3])).toBe(false);
    expect(SYMBOLS.some((symbol) => symbol.id === BOMB)).toBe(false);
  });
});

describe("slot symbols and reduced motion", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps the replaced common and rare names on their ids", () => {
    const byKey = Object.fromEntries(SYMBOLS.map((symbol) => [symbol.key, symbol]));
    expect(byKey.glove).toMatchObject({ id: 0, name: "Sapphire", rarity: "common" });
    expect(byKey.pistol).toMatchObject({ id: 1, name: "Amethyst", rarity: "common" });
    expect(byKey.knife).toMatchObject({ id: 2, name: "Dagger", rarity: "common" });
    expect(byKey.helmet).toMatchObject({ id: 3, name: "Helmet", rarity: "common" });
    expect(byKey.vest).toMatchObject({ id: 4, name: "Armor", rarity: "common" });
    expect(byKey.grenade).toMatchObject({ id: 6, name: "Potion", rarity: "common" });
    expect(byKey["gas-mask"]).toMatchObject({ id: 15, name: "Spike", rarity: "common" });
    expect(byKey["chest-gold"]).toMatchObject({ id: 5, name: "Chest", rarity: "rare" });
    expect(byKey.lightning).toMatchObject({ id: 9, name: "Lightning", rarity: "rare" });
    expect(byKey.skull).toMatchObject({ id: 10, name: "Skull", rarity: "rare" });
    expect(byKey.fire).toMatchObject({ id: 13, name: "Fire", rarity: "rare" });
    expect(byKey["w-coin"]).toMatchObject({ id: 14, name: "Diadem", rarity: "rare" });
    expect(byKey["chest-purple"]).toMatchObject({ id: 18, name: "Orb", rarity: "rare" });
    expect(SYMBOLS.reduce((sum, symbol) => sum + symbol.weight, 0)).toBe(WEIGHT_TOTAL);
    expect(WEIGHT_TOTAL).toBe(1024);
    const src = readFileSync(new URL("../src/lib/slott/symbols.ts", import.meta.url), "utf8");
    const files = [...src.matchAll(/@\/assets\/slott\/([^"]+)/g)].map((match) => match[1]!);
    expect(new Set(files).size).toBe(files.length);
    expect(files).toHaveLength(21);
    for (const file of files) expect(existsSync(`src/assets/slott/${file}`)).toBe(true);
  });

  it("shortens the reel clock under reduced motion and does not take a score", () => {
    vi.stubGlobal("matchMedia", () => ({
      matches: true,
      addEventListener() {},
      removeEventListener() {},
    }));
    const clock = presentSpinStart(10_000, 3200, 10_000, 10_000, true);
    expect(clock).toEqual({ startAt: 10_000, durationMs: 720 });
    expect(clock && "score" in clock).toBe(false);
  });

  it("disconnects the previous reel cue when a newer spin takes the bus", () => {
    const previous = { disconnect: vi.fn() };
    expect(releaseReelAudio(previous)).toBeNull();
    expect(previous.disconnect).toHaveBeenCalledOnce();
    const broken = {
      disconnect() {
        throw new Error("already disconnected");
      },
    };
    expect(releaseReelAudio(broken)).toBeNull();
    expect(releaseReelAudio(null)).toBeNull();
  });
});
