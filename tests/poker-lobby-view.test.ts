import { describe, expect, it } from "vitest";
import type { Lobby, LobbyTable, LobbyType } from "../src/lib/poker/api";
import {
  DEFAULT_FILTERS,
  blindRange,
  pickFeatured,
  sections,
  type LobbyFilters,
} from "../src/lib/poker/lobby-view";

const type = (id: number, category: LobbyType["category"], sb: number, bb: number): LobbyType => ({
  id,
  label: `$${bb}`,
  category,
  small_blind: sb,
  big_blind: bb,
  min_buy_in: bb * 40,
  max_buy_in: bb * 100,
  max_seats: 6,
  tables: 0,
  players: 0,
});
const table = (id: number, type_id: number, seated: number, name = `Table ${id}`): LobbyTable => ({
  id,
  type_id,
  name,
  seated,
  max_seats: 6,
  hand_count: 0,
  live: seated > 1,
  players: [],
});

const lobby: Lobby = {
  enabled: true,
  fee_bps: 500,
  action_seconds: 20,
  types: [
    type(1, "Micro", 2, 5),
    type(2, "Micro", 5, 10),
    type(5, "Mid", 50, 100),
    type(8, "VIP", 500, 1000),
  ],
  tables: [
    table(10, 1, 6, "Ace"),
    table(11, 2, 3, "King"),
    table(12, 5, 3, "Queen"),
    table(13, 8, 0),
  ],
};
const f = (p: Partial<LobbyFilters>) => ({ ...DEFAULT_FILTERS, ...p });
const keys = (p: Partial<LobbyFilters>) =>
  sections(lobby, f(p)).flatMap((s) => s.items.map((i) => i.key));

describe("poker lobby view", () => {
  it("lists a quick seat per stake plus running tables, empty tables hidden", () => {
    expect(keys({})).toEqual(["s1", "t10", "s2", "t11", "s5", "t12", "s8"]);
  });

  it("counts only tables with someone seated as running, not empty OPEN tables", () => {
    const withEmpty: Lobby = {
      ...lobby,
      types: lobby.types.map((t) => ({ ...t, tables: 2 })),
      tables: [...lobby.tables, table(14, 1, 0), table(15, 8, 0)],
    };
    const running = Object.fromEntries(
      sections(withEmpty, DEFAULT_FILTERS)
        .flatMap((s) => s.items)
        .flatMap((i) => (i.kind === "stake" ? [[i.key, i.running]] : [])),
    );
    expect(running).toEqual({ s1: 1, s2: 1, s5: 1, s8: 0 });
  });

  it("filters by category, availability and search, composing all of them", () => {
    expect(keys({ category: "Micro" })).toEqual(["s1", "t10", "s2", "t11"]);
    expect(keys({ availability: "running" })).toEqual(["t10", "t11", "t12"]);
    expect(keys({ availability: "open", category: "Micro" })).toEqual(["s1", "s2", "t11"]);
    expect(keys({ search: "queen" })).toEqual(["t12"]);
    expect(keys({ search: "table  13" })).toEqual([]);
    expect(keys({ search: "King" })).toEqual(["t11"]);
    expect(keys({ search: "micro  king" })).toEqual(["t11"]);
    expect(keys({ search: "$0.05/$0.10" })).toEqual(["s2", "t11"]);
    expect(keys({ search: "king", category: "Mid" })).toEqual([]);
  });

  it("sorts on real values and reverses section order for high to low", () => {
    expect(sections(lobby, f({ sort: "stakes-desc" })).map((s) => s.category)).toEqual([
      "VIP",
      "Mid",
      "Micro",
    ]);
    expect(keys({ sort: "players", category: "Micro" })).toEqual(["t10", "t11", "s1", "s2"]);
    expect(keys({ sort: "seats", category: "Micro" })).toEqual(["s1", "s2", "t11", "t10"]);
  });

  it("features the fullest running table with a free seat, never a full or empty one", () => {
    expect(pickFeatured(lobby)?.table.id).toBe(12);
    expect(pickFeatured({ ...lobby, tables: [table(10, 1, 6), table(13, 8, 0)] })).toBeNull();
  });

  it("formats blind ranges", () => {
    expect(blindRange(lobby.types.slice(0, 2))).toBe("$0.02/$0.05 – $0.05/$0.10");
  });
});
