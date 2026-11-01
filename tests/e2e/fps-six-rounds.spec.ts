import { test, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { fixture } from "./helpers/fps-fixture";
import type { MatchState, Player } from "../../src/lib/fps/protocol";
import type { GameplayAudit } from "./helpers/fps-gameplay-bot";

test.afterEach(async ({ page }) => {
  const data = await page
    .evaluate(() => ({
      state: Reflect.get(window, "fpsPolishTest")?.state,
      audit: Reflect.get(window, "fpsGameplayAudit"),
    }))
    .catch(() => null);
  if (data) await writeFile("test-results/fps-six-round-audit.json", JSON.stringify(data, null, 2));
});

/** Aim-arena main lane from the west spawn (x mirrored for the east spawn). */
const MAIN_LANE: [number, number][] = [
  [-14.9, 2.5],
  [-12.6, 2.5],
  [-11.8, 0.6],
  [-7, -0.6],
  [-3, -2.4],
];
// Uses real keyboard/mouse controls and real validated bot inputs. No health, spawn or score shortcuts.
test("six complete bot rounds: controls, damage, roles, reload and respawn", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await fixture(page, "A", 9);
  await page.evaluate(async () => {
    const botPath = "/tests/e2e/helpers/fps-gameplay-bot.ts",
      simPath = "/src/lib/fps/simulation.ts";
    const { createGameplayBot } = await import(botPath),
      { WEAPONS } = await import(simPath),
      bot = createGameplayBot();
    const audit: GameplayAudit = {
      damage: [],
      rounds: [],
      resets: [],
      positions: [],
      violations: [],
    };
    let lastRound = 1,
      lastSample = 0;
    Reflect.set(window, "fpsGameplayBot", bot);
    Reflect.set(window, "fpsGameplayAudit", audit);
    Reflect.set(window, "fpsTestOpponent", (state: MatchState, now: number) =>
      bot.input(state, now),
    );
    Reflect.set(
      window,
      "fpsTestAfterStep",
      (state: MatchState, before: Record<"A" | "B", Player>, now: number) => {
        if (state.round !== lastRound) {
          audit.resets.push({ round: state.round, players: structuredClone(state.players) });
          lastRound = state.round;
        }
        for (const seat of ["A", "B"] as const) {
          const attacker = seat === "A" ? "B" : "A",
            events = state.events.filter(
              (e) => e.seat === attacker && ["hit", "headshot"].includes(e.type),
            );
          const stats = WEAPONS[state.players[attacker].weapon],
            damage = events.reduce(
              (n, e) =>
                n +
                (e.hit?.damage ??
                  stats.damage * (e.type === "headshot" ? stats.headshotMultiplier : 1)),
              0,
            );
          if (state.players[seat].hp < before[seat].hp) {
            audit.damage.push({
              round: state.round,
              seat,
              before: before[seat].hp,
              after: state.players[seat].hp,
              events: events.map((e) => e.type),
            });
            if (state.players[seat].hp !== Math.max(0, before[seat].hp - damage))
              audit.violations.push(`Invalid damage round ${state.round} seat ${seat}`);
          }
          if (
            ![
              state.players[seat].x,
              state.players[seat].y,
              state.players[seat].z,
              state.players[seat].yaw,
              state.players[seat].hp,
            ].every(Number.isFinite)
          )
            audit.violations.push("Nonfinite player state");
        }
        for (const event of state.events)
          if (event.type === "round-end")
            audit.rounds.push({
              round: state.round,
              winner: event.seat,
              score: { ...state.score },
            });
        if (now - lastSample > 100) {
          audit.positions.push({
            round: state.round,
            at: now,
            players: structuredClone(state.players),
          });
          lastSample = now;
        }
      },
    );
  });
  await page.locator("canvas").click();
  await expect.poll(() => page.evaluate(() => !!document.pointerLockElement)).toBe(true);
  const state = () =>
    page.evaluate(() =>
      structuredClone(Reflect.get(window, "fpsPolishTest").state),
    ) as Promise<MatchState>;
  const aim = async (head = false) => {
    const s = await state(),
      a = s.players.A,
      b = s.players.B,
      dx = b.x - a.x,
      dz = b.z - a.z;
    const target = b.y + (head ? (b.crouched ? 0.95 : 1.6) : b.crouched ? 0.4 : 0.9);
    const yaw = Math.atan2(-dx, -dz) - (a.recoilYaw ?? 0),
      pitch =
        Math.atan2(target - (a.y + (a.crouched ? 0.95 : 1.6)), Math.hypot(dx, dz)) -
        (a.recoilPitch ?? 0);
    const turn = Math.atan2(Math.sin(yaw - a.yaw), Math.cos(yaw - a.yaw));
    // Deliver relative pointer deltas through the production handler. Absolute
    // WebDriver positions outside the viewport lose deltas under pointer lock.
    await page.evaluate(
      ({ x, y }) =>
        document.dispatchEvent(new MouseEvent("mousemove", { movementX: x, movementY: y })),
      { x: -turn / 0.002, y: -(pitch - a.pitch) / 0.002 },
    );
  };
  const turnTo = async (yaw: number) => {
    const a = (await state()).players.A;
    const turn = Math.atan2(Math.sin(yaw - a.yaw), Math.cos(yaw - a.yaw));
    if (Math.abs(turn) > 0.001)
      await page.evaluate(
        ({ x, y }) =>
          document.dispatchEvent(new MouseEvent("mousemove", { movementX: x, movementY: y })),
        { x: -turn / 0.002, y: a.pitch / 0.002 },
      );
  };
  const walkTo = async (x: number, z: number) => {
    for (let step = 0; step < 400; step++) {
      const a = (await state()).players.A;
      if (Math.hypot(x - a.x, z - a.z) < 0.35) return;
      await turnTo(Math.atan2(-(x - a.x), -(z - a.z)));
      await page.keyboard.down("KeyW");
      await page.waitForTimeout(90);
      await page.keyboard.up("KeyW");
    }
    throw new Error(`walkTo(${x}, ${z}) did not arrive`);
  };
  const arm = (enabled: boolean) =>
    page.evaluate((enabled) => Reflect.get(window, "fpsGameplayBot").arm(enabled), enabled);
  for (let round = 1; round <= 6; round++) {
    await expect
      .poll(
        async () => {
          const s = await state();
          return [s.round, s.phase].join(":");
        },
        { timeout: 20000 },
      )
      .toBe(`${round}:live`);
    await expect
      .poll(async () => (await state()).players.A.weapon, {
        message: `round ${round} should acknowledge its rifle loadout`,
        timeout: 1500,
      })
      .toBe("rifle");
    await arm(false);
    if (round === 1 || round === 5) {
      if (round === 5) {
        await page.keyboard.press("Digit2");
        await expect.poll(async () => (await state()).players.A.weapon).toBe("pistol");
      }
      const hp = (await state()).players.B.hp;
      await page.mouse.down();
      await page.waitForTimeout(500);
      await page.mouse.up();
      await page.waitForTimeout(350);
      expect((await state()).players.B.hp, "cover blocks spawn shots").toBe(hp);
      if (round === 5) {
        const before = (await state()).players.A;
        await page.keyboard.press("KeyR");
        await expect.poll(async () => (await state()).players.A.reloadUntil).toBeGreaterThan(0);
        await expect.poll(async () => (await state()).players.A.reloadUntil).toBe(0);
        const after = (await state()).players.A;
        expect(after.ammo).toBe(12);
        expect(after.ammo + after.reserve).toBe(before.ammo + before.reserve);
      }
    }
    const firstSeq = (await state()).players.A.lastSeq;
    await expect.poll(async () => (await state()).players.A.lastSeq).toBeGreaterThan(firstSeq + 3);
    // Aim arena: A spawns west facing +x in odd rounds and east facing -x in even rounds.
    const spawnYaw = round % 2 ? -Math.PI / 2 : Math.PI / 2;
    await expect
      .poll(async () => {
        await page.evaluate((target) => {
          const f = Reflect.get(window, "fpsPolishTest"),
            yaw = f.controls.diagnostics().camera[3];
          const turn = Math.atan2(Math.sin(target - yaw), Math.cos(target - yaw));
          if (Math.abs(turn) > 0.001)
            document.dispatchEvent(
              new MouseEvent("mousemove", { movementX: -turn / 0.002, movementY: 0 }),
            );
        }, spawnYaw);
        const yaw = (await state()).players.A.yaw;
        return Math.abs(Math.atan2(Math.sin(spawnYaw - yaw), Math.cos(spawnYaw - yaw)));
      })
      .toBeLessThan(0.02);
    // Walk the main lane with real mouse turns and W: out of the spawn exit, past the side
    // stack and lane cover, to the north side of the centre stack (mirrored per side).
    const side = (await state()).players.A.x < 0 ? 1 : -1;
    for (const [wx, wz] of MAIN_LANE) await walkTo(wx * side, wz);
    // The bot takes the mirrored lane to the facing corner, 6 m away across the centre.
    await expect
      .poll(
        async () => {
          const b = (await state()).players.B;
          return Math.hypot(b.x + MAIN_LANE.at(-1)![0] * side, b.z - MAIN_LANE.at(-1)![1]);
        },
        { timeout: 60_000 },
      )
      .toBeLessThan(0.4);
    await aim(round === 3);
    await page.waitForTimeout(300);
    if (round === 6) {
      await page.keyboard.press("Space");
      await expect.poll(async () => (await state()).players.A.y).toBeGreaterThan(0);
      await expect.poll(async () => (await state()).players.A.y).toBe(0);
      await page.keyboard.down("KeyA");
      await page.waitForTimeout(250);
      await page.keyboard.up("KeyA");
      for (let frame = 0; frame < 3; frame++) {
        await aim();
        await page.screenshot({ path: `test-results/bot-walk-${frame}.png` });
        await page.waitForTimeout(130);
      }
    }
    await page.screenshot({ path: `test-results/bot-round-${round}-combat.png` });
    await arm(true);
    if (round === 4) {
      await expect.poll(async () => (await state()).players.A.hp, { timeout: 5000 }).toBe(0);
    } else {
      const deadline = Date.now() + 10000;
      while (Date.now() < deadline && (await state()).phase === "live") {
        await aim(round === 3);
        await page.waitForTimeout(120);
        await page.mouse.down();
        await page.waitForTimeout(round === 3 ? 130 : 300);
        await page.mouse.up();
        await page.waitForTimeout(200);
      }
      await expect.poll(async () => (await state()).phase).not.toBe("live");
    }
    await page.mouse.up();
    const end = await state();
    expect(end.round).toBe(round);
    expect(end.players[round === 4 ? "A" : "B"].hp).toBe(0);
    await page.screenshot({ path: `test-results/bot-round-${round}-end.png` });
    console.log(`Finished round ${round}: ${end.score.A}-${end.score.B}`);
    await info.attach(`round-${round}`, {
      body: JSON.stringify(end),
      contentType: "application/json",
    });
  }
  const end = await state();
  expect(end.phase).toBe("completed");
  expect(end.score).toEqual({ A: 5, B: 1 });
  const audit: GameplayAudit = await page.evaluate(() => Reflect.get(window, "fpsGameplayAudit"));
  await writeFile("test-results/fps-six-round-audit.json", JSON.stringify(audit, null, 2));
  expect(audit.violations).toEqual([]);
  expect(audit.rounds).toHaveLength(6);
  expect(audit.resets).toHaveLength(5);
  for (const reset of audit.resets)
    for (const p of Object.values(reset.players)) {
      expect(p.hp).toBe(100);
      expect(p.ammo).toBe(30);
      expect(p.reloadUntil).toBe(0);
    }
  expect(audit.damage.some((d) => d.seat === "A")).toBe(true);
  expect(audit.damage.some((d) => d.events.includes("headshot"))).toBe(true);
  expect(audit.damage.some((d) => d.events.includes("hit"))).toBe(true);
  expect(errors).toEqual([]);
  await page.evaluate(() => Reflect.get(window, "fpsPolishTest").dispose());
});
