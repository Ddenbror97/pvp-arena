import { describe, expect, it } from "vitest";
import { SEQUENCER_GRACE_SECONDS, assessSequencerRound } from "../src/lib/crypto/eth-price";

const sec = (iso: string) => BigInt(Date.parse(iso) / 1000);
const round = (answer: bigint, startedAt: string, updatedAt: string) =>
  [1n, answer, sec(startedAt), sec(updatedAt), 1n] as const;

describe("Base sequencer uptime round", () => {
  // Live feed values on 2026-10-15: up since Jun 26, heartbeat at 17:16:29.
  const heartbeat = round(0n, "2026-06-26T16:31:47Z", "2026-10-15T17:16:29Z");

  it("ignores the daily heartbeat when the sequencer has been up for months", () => {
    expect(assessSequencerRound(heartbeat, Number(sec("2026-10-15T17:17:00Z")))).toEqual({
      ok: true,
    });
  });
  it("holds prices for the grace window after a real recovery", () => {
    const recovered = round(0n, "2026-10-15T17:16:00Z", "2026-10-15T17:16:00Z");
    const t = Number(sec("2026-10-15T17:16:00Z"));
    expect(assessSequencerRound(recovered, t + 60)).toEqual({
      ok: false,
      reason: "SEQUENCER_GRACE",
    });
    expect(assessSequencerRound(recovered, t + SEQUENCER_GRACE_SECONDS)).toEqual({ ok: true });
  });
  it("blocks prices while the sequencer is down", () => {
    const down = round(1n, "2026-06-26T15:31:35Z", "2026-06-26T15:31:35Z");
    expect(assessSequencerRound(down, Number(sec("2026-06-26T15:40:00Z")))).toEqual({
      ok: false,
      reason: "SEQUENCER_DOWN",
    });
  });
});
