import { useMemo, useState } from "react";
import {
  TRADEUP_CATALOG,
  type Rarity,
  type TradeInput,
  RARITY_LABEL,
  NEXT_RARITY,
  WEAR_RANGE,
  calculateTradeUp,
  expectedValue,
  wearOf,
} from "@/lib/cs2-tradeup";

const RARITIES: Rarity[] = [
  "consumer",
  "industrial",
  "milspec",
  "restricted",
  "classified",
  "covert",
];

type TradeRow = Omit<TradeInput, "cost"> & { cost: string };

function emptyRow(collectionId: string): TradeRow {
  const col = TRADEUP_CATALOG.find((c) => c.id === collectionId) ?? TRADEUP_CATALOG[0];
  if (!col) return { collectionId, float: 0.15, min: 0, max: 1, cost: "" };
  const sample = RARITIES.flatMap((r) => col.skins[r] ?? [])[0] ?? { min: 0, max: 1 };
  return { collectionId: col.id, float: 0.15, min: sample.min, max: sample.max, cost: "" };
}

function fmtPct(n: number): string {
  return `${(n * 100).toFixed(n >= 0.1 ? 1 : 2)}%`;
}

function fmtFloat(n: number): string {
  return n.toFixed(4);
}

export function Cs2TradeUpCalculator() {
  const [rarity, setRarity] = useState<Rarity>("milspec");
  const [statTrak, setStatTrak] = useState(false);
  const slots = rarity === "covert" ? 5 : 10;
  const [rows, setRows] = useState<TradeRow[]>(() =>
    Array.from({ length: 10 }, () => emptyRow("dust2")),
  );
  const [prices, setPrices] = useState<Record<string, string>>({});

  const active = rows.slice(0, slots);
  const result = useMemo(
    () =>
      calculateTradeUp(
        TRADEUP_CATALOG,
        active.map(({ collectionId, float, min, max }) => ({ collectionId, float, min, max })),
        rarity,
      ),
    [active, rarity],
  );

  const inputCost = active.reduce((s, r) => s + (Number(r.cost) || 0), 0);
  const priceMap = Object.fromEntries(Object.entries(prices).map(([k, v]) => [k, Number(v) || 0]));
  const ev = expectedValue(result.outcomes, priceMap, inputCost);
  const next = NEXT_RARITY[rarity];

  const setRow = (i: number, patch: Partial<TradeRow>) => {
    setRows((prev) => prev.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  };

  const fillAll = (collectionId: string) => {
    setRows((prev) => prev.map((row) => ({ ...emptyRow(collectionId), cost: row.cost })));
  };

  return (
    <section id="calculator" className="rounded-2xl border border-primary/30 bg-card p-5 sm:p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-primary">
        Live calculator
      </p>
      <h2 className="mt-2 font-display text-2xl text-foreground">CS2 trade up calculator</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {slots} {statTrak ? "StatTrak " : ""}
        {RARITY_LABEL[rarity]} inputs → one{" "}
        {next === "extraordinary" ? "knife or pair of gloves" : RARITY_LABEL[next]}. Odds are
        collection-weighted. Floats use the post-October 2025 normalized formula. Prices are
        optional and typed by you — this is not a live Steam feed.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-semibold text-muted-foreground">
          Input rarity
          <select
            className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
            value={rarity}
            onChange={(e) => setRarity(e.target.value as Rarity)}
          >
            {RARITIES.map((r) => (
              <option key={r} value={r}>
                {RARITY_LABEL[r]} →{" "}
                {NEXT_RARITY[r] === "extraordinary"
                  ? "Knife / gloves (5 skins)"
                  : RARITY_LABEL[NEXT_RARITY[r]]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-end gap-2 pb-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={statTrak}
            onChange={(e) => setStatTrak(e.target.checked)}
          />
          StatTrak contract (all inputs must match)
        </label>
        <label className="text-xs font-semibold text-muted-foreground">
          Fill every slot from
          <select
            className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
            defaultValue="dust2"
            onChange={(e) => fillAll(e.target.value)}
          >
            {TRADEUP_CATALOG.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[36rem] border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="pb-2 pr-2">#</th>
              <th className="pb-2 pr-2">Collection</th>
              <th className="pb-2 pr-2">Float</th>
              <th className="pb-2 pr-2">Skin min</th>
              <th className="pb-2 pr-2">Skin max</th>
              <th className="pb-2">Cost $</th>
            </tr>
          </thead>
          <tbody>
            {active.map((row, i) => (
              <tr key={i} className="border-t border-border/70">
                <td className="py-1.5 pr-2 text-muted-foreground">{i + 1}</td>
                <td className="py-1.5 pr-2">
                  <select
                    className="h-8 w-full rounded-md border border-input bg-background px-2 text-foreground"
                    value={row.collectionId}
                    onChange={(e) => setRow(i, { collectionId: e.target.value })}
                  >
                    {TRADEUP_CATALOG.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-1.5 pr-2">
                  <input
                    type="number"
                    min={0}
                    max={1}
                    step={0.001}
                    value={row.float}
                    onChange={(e) => setRow(i, { float: Number(e.target.value) })}
                    className="h-8 w-24 rounded-md border border-input bg-background px-2 text-foreground"
                  />
                  <span className="ml-1 text-xs text-muted-foreground">{wearOf(row.float)}</span>
                </td>
                <td className="py-1.5 pr-2">
                  <input
                    type="number"
                    min={0}
                    max={1}
                    step={0.01}
                    value={row.min}
                    onChange={(e) => setRow(i, { min: Number(e.target.value) })}
                    className="h-8 w-20 rounded-md border border-input bg-background px-2 text-foreground"
                  />
                </td>
                <td className="py-1.5 pr-2">
                  <input
                    type="number"
                    min={0}
                    max={1}
                    step={0.01}
                    value={row.max}
                    onChange={(e) => setRow(i, { max: Number(e.target.value) })}
                    className="h-8 w-20 rounded-md border border-input bg-background px-2 text-foreground"
                  />
                </td>
                <td className="py-1.5">
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={row.cost}
                    onChange={(e) => setRow(i, { cost: e.target.value })}
                    className="h-8 w-20 rounded-md border border-input bg-background px-2 text-foreground"
                    placeholder="0"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-secondary/40 p-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Average normalized float
          </p>
          <p className="mt-1 font-display text-xl text-foreground">{fmtFloat(result.avgNorm)}</p>
        </div>
        <div className="rounded-xl border border-border bg-secondary/40 p-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Input cost</p>
          <p className="mt-1 font-display text-xl text-foreground">${inputCost.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-border bg-secondary/40 p-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Expected value
          </p>
          <p
            className={`mt-1 font-display text-xl ${ev >= 0 ? "text-emerald-400" : "text-foreground"}`}
          >
            {inputCost || Object.values(priceMap).some(Boolean)
              ? `$${ev.toFixed(2)}`
              : "Add prices"}
          </p>
        </div>
      </div>

      {result.wasted > 0 && (
        <p className="mt-4 text-sm text-gold">
          {fmtPct(result.wasted)} of this contract has no next-tier skin in its collection (for
          example Dust 2 has no Covert). Those inputs cannot produce an outcome.
        </p>
      )}

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[32rem] border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="pb-2 pr-2">Outcome</th>
              <th className="pb-2 pr-2">Chance</th>
              <th className="pb-2 pr-2">Float</th>
              <th className="pb-2 pr-2">Wear</th>
              <th className="pb-2">Your price $</th>
            </tr>
          </thead>
          <tbody>
            {result.outcomes.map((o) => {
              const key = `${o.collectionId}:${o.name}`;
              return (
                <tr key={key} className="border-t border-border/70">
                  <td className="py-2 pr-2">
                    <span className="text-foreground">{o.name}</span>
                    <span className="block text-xs text-muted-foreground">{o.collectionName}</span>
                  </td>
                  <td className="py-2 pr-2 text-foreground">{fmtPct(o.probability)}</td>
                  <td className="py-2 pr-2 text-foreground">{fmtFloat(o.float)}</td>
                  <td className="py-2 pr-2 text-foreground">
                    {WEAR_RANGE.find((w) => w.wear === o.wear)?.label}
                  </td>
                  <td className="py-2">
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={prices[key] ?? ""}
                      onChange={(e) => setPrices((p) => ({ ...p, [key]: e.target.value }))}
                      className="h-8 w-24 rounded-md border border-input bg-background px-2 text-foreground"
                      placeholder="0"
                    />
                  </td>
                </tr>
              );
            })}
            {result.outcomes.length === 0 && (
              <tr>
                <td colSpan={5} className="py-4 text-muted-foreground">
                  No next-tier skins in the selected collections. Mix in a collection that has a{" "}
                  {next === "extraordinary" ? "knife or glove" : RARITY_LABEL[next]} finish.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
