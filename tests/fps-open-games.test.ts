import { describe, expect, it } from "vitest";
import { openGames, sameRoomTerms, lobbyPollMs, type OpenGame } from "../src/lib/fps/open-games";
import type { DuelLobbyData } from "../src/lib/fps/quote";

const now = Date.parse("2026-11-02T12:00:00Z");
const room = (extra: Partial<OpenGame> = {}): OpenGame => ({
  id: "room-a",
  creator_id: "a",
  opponent_id: null,
  username: "Player A",
  status: "WAITING",
  private: false,
  stake: 100,
  best_of: 13,
  expires_at: new Date(now + 60000).toISOString(),
  ...extra,
});
const lobby = (rooms: OpenGame[]): DuelLobbyData => ({
  enabled: true,
  cash_enabled: true,
  practice_allowed: true,
  stakes: [100, 200, 500],
  open: rooms,
});

describe("recent FPS open games", () => {
  it("only lists valid public, unfilled, unexpired cash rooms", () => {
    const bad: Array<Partial<OpenGame>> = [
      { expires_at: new Date(now).toISOString() },
      { expires_at: "bad" },
      { status: "FUNDED" },
      { opponent_id: "b" },
      { private: true },
      { stake: 0 },
      { stake: -100 },
      { stake: 100.5 },
      { stake: 5001 },
      { stake: 300 },
    ];
    expect(
      openGames(
        lobby([room(), ...bad.map((extra, i) => room({ ...extra, id: `bad-${i}` }))]),
        now,
      ).map((r) => r.id),
    ).toEqual(["room-a"]);
  });
  it("bounds the payload and deduplicates rooms without inventing a total inventory", () => {
    const input = Array.from({ length: 30 }, (_, i) => room({ id: `room-${i}` }));
    expect(openGames(lobby(input), now)).toHaveLength(20);
    expect(openGames(lobby([room(), room()]), now)).toHaveLength(1);
  });
  it("does not offer cash games when the game or cash entries are paused", () => {
    expect(openGames({ ...lobby([room()]), enabled: false }, now)).toEqual([]);
    expect(openGames({ ...lobby([room()]), cash_enabled: false }, now)).toEqual([]);
    expect(openGames(undefined, now)).toEqual([]);
  });
  it("invalidates a reviewed quote when material room terms change", () => {
    expect(sameRoomTerms(room(), room({ username: "New display name" }))).toBe(true);
    for (const changed of [
      { stake: 200 },
      { best_of: 9 as const },
      { creator_id: "b" },
      { id: "another" },
      { expires_at: new Date(now + 90000).toISOString() },
    ])
      expect(sameRoomTerms(room(), room(changed))).toBe(false);
  });
  it("backs off empty and failed polls without slowing active rooms", () => {
    expect(lobbyPollMs(false, false)).toBe(15000);
    expect(lobbyPollMs(true, true)).toBe(15000);
    expect(lobbyPollMs(true, false)).toBe(5000);
  });
});
