import { useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import type { Guide } from "@/content/guides/types";
import { Cs2TradeUpCalculator } from "./Cs2TradeUpCalculator";
import { WEAR_RANGE, wearOf } from "@/lib/cs2-tradeup";

const field =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground";
const box = "rounded-xl border border-border bg-secondary/40 p-3";

function Shell({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  return (
    <section id="calculator" className="rounded-2xl border border-primary/30 bg-card p-5 sm:p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-primary">
        Live calculator
      </p>
      <h2 className="mt-2 font-display text-2xl text-foreground">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Cs2InventoryWidget() {
  const [rows, setRows] = useState([{ name: "", qty: 1, price: "" }]);
  const [fee, setFee] = useState(true);
  const gross = rows.reduce((s, r) => s + (Number(r.qty) || 0) * (Number(r.price) || 0), 0);
  const net = fee ? gross * 0.85 : gross;
  return (
    <Shell
      title="CS2 / CSGO inventory value"
      text="Add items and unit prices you already know. This is not a live Steam listing feed. Toggle the 15% Community Market fee to see a cash-out-style total."
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[28rem] border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="pb-2 pr-2">Item</th>
              <th className="pb-2 pr-2">Qty</th>
              <th className="pb-2">Unit $</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-border/70">
                <td className="py-1.5 pr-2">
                  <input
                    className={field}
                    value={r.name}
                    placeholder="AK-47 | Redline"
                    onChange={(e) =>
                      setRows((p) =>
                        p.map((x, n) => (n === i ? { ...x, name: e.target.value } : x)),
                      )
                    }
                  />
                </td>
                <td className="py-1.5 pr-2 w-20">
                  <input
                    type="number"
                    min={1}
                    className={field}
                    value={r.qty}
                    onChange={(e) =>
                      setRows((p) =>
                        p.map((x, n) => (n === i ? { ...x, qty: Number(e.target.value) } : x)),
                      )
                    }
                  />
                </td>
                <td className="py-1.5">
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    className={field}
                    value={r.price}
                    onChange={(e) =>
                      setRows((p) =>
                        p.map((x, n) => (n === i ? { ...x, price: e.target.value } : x)),
                      )
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="text-sm font-semibold text-primary"
          onClick={() => setRows((p) => [...p, { name: "", qty: 1, price: "" }])}
        >
          Add item
        </button>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={fee} onChange={(e) => setFee(e.target.checked)} />{" "}
          Subtract 15% Steam Market fee
        </label>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className={box}>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Gross value</p>
          <p className="mt-1 font-display text-xl text-foreground">${gross.toFixed(2)}</p>
        </div>
        <div className={box}>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {fee ? "After Steam fee" : "No fee applied"}
          </p>
          <p className="mt-1 font-display text-xl text-foreground">${net.toFixed(2)}</p>
        </div>
      </div>
    </Shell>
  );
}

const CASE_ODDS = [
  { name: "Mil-Spec", p: 0.7992 },
  { name: "Restricted", p: 0.1598 },
  { name: "Classified", p: 0.032 },
  { name: "Covert", p: 0.0064 },
  { name: "Rare special (knife / gloves)", p: 0.0026 },
];

function Cs2CaseOddsWidget() {
  const [n, setN] = useState(10);
  const [cost, setCost] = useState("3.50");
  const spend = n * (Number(cost) || 0);
  return (
    <Shell
      title="CS2 case odds"
      text="Valve published these drop rates for China in 2017. Official CS2 cases still use this rarity ladder. Enter openings and key+case cost to see expected hits — not a promise of any one session."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-muted-foreground">
          Openings
          <input
            type="number"
            min={1}
            className={`mt-1 ${field}`}
            value={n}
            onChange={(e) => setN(Math.max(1, Number(e.target.value) || 1))}
          />
        </label>
        <label className="text-xs font-semibold text-muted-foreground">
          Case + key cost $
          <input
            type="number"
            min={0}
            step={0.01}
            className={`mt-1 ${field}`}
            value={cost}
            onChange={(e) => setCost(e.target.value)}
          />
        </label>
      </div>
      <table className="mt-5 w-full border-collapse text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="pb-2">Rarity</th>
            <th className="pb-2">Drop rate</th>
            <th className="pb-2">Expected in this batch</th>
          </tr>
        </thead>
        <tbody>
          {CASE_ODDS.map((r) => (
            <tr key={r.name} className="border-t border-border/70">
              <td className="py-2 text-foreground">{r.name}</td>
              <td className="py-2">{(r.p * 100).toFixed(2)}%</td>
              <td className="py-2">{(n * r.p).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 text-sm text-muted-foreground">
        Spend at ${Number(cost) || 0} each:{" "}
        <span className="text-foreground">${spend.toFixed(2)}</span>. How cases and keys work is
        covered on the{" "}
        <Link
          to="/guides/$slug"
          params={{ slug: "csgo-case-opening" }}
          className="text-primary hover:underline"
        >
          case opening guide
        </Link>
        .
      </p>
    </Shell>
  );
}

function Cs2FloatWidget() {
  const [f, setF] = useState("0.15");
  const float = Math.min(1, Math.max(0, Number(f) || 0));
  const wear = wearOf(float);
  const band = WEAR_RANGE.find((w) => w.wear === wear)!;
  return (
    <Shell
      title="CS2 float checker"
      text="Paste a float from 0.0000 to 1.0000. Wear names are the official CS2 bands. An inspect link does not contain the float by itself — read it from an inventory or inspect site, then check it here."
    >
      <label className="text-xs font-semibold text-muted-foreground">
        Float value
        <input
          className={`mt-1 ${field}`}
          value={f}
          onChange={(e) => setF(e.target.value)}
          inputMode="decimal"
        />
      </label>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className={box}>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Wear</p>
          <p className="mt-1 font-display text-xl text-foreground">{band.label}</p>
        </div>
        <div className={box}>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Band</p>
          <p className="mt-1 font-display text-xl text-foreground">
            {band.min.toFixed(2)}–{band.max.toFixed(2)}
          </p>
        </div>
        <div className={box}>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Distance to next
          </p>
          <p className="mt-1 font-display text-xl text-foreground">
            {wear === "BS" ? "—" : (band.max - float).toFixed(4)}
          </p>
        </div>
      </div>
      <ul className="mt-4 grid gap-1 text-sm sm:grid-cols-2">
        {WEAR_RANGE.map((w) => (
          <li
            key={w.wear}
            className={w.wear === wear ? "text-foreground" : "text-muted-foreground"}
          >
            {w.label}: {w.min.toFixed(2)} to {w.max.toFixed(2)}
          </li>
        ))}
      </ul>
    </Shell>
  );
}

function MartingaleWidget() {
  const [start, setStart] = useState("1");
  const [bank, setBank] = useState("100");
  const [limit, setLimit] = useState("500");
  const [pWin, setPWin] = useState("48.65");
  const s = Math.max(0.01, Number(start) || 1);
  const b = Math.max(s, Number(bank) || 100);
  const t = Math.max(s, Number(limit) || 500);
  const p = Math.min(0.99, Math.max(0.01, (Number(pWin) || 48.65) / 100));
  const rows = useMemo(() => {
    const out: { n: number; bet: number; spent: number; pLose: number }[] = [];
    let bet = s;
    let spent = 0;
    let n = 0;
    while (n < 24 && bet <= b - spent && bet <= t) {
      spent += bet;
      out.push({ n: n + 1, bet, spent, pLose: (1 - p) ** (n + 1) });
      bet *= 2;
      n += 1;
    }
    return out;
  }, [s, b, t, p]);
  const last = rows[rows.length - 1];
  return (
    <Shell
      title="Martingale calculator"
      text="This tool only sizes the doubling sequence. It does not change the house edge. For why the system fails, use the martingale strategy guide — this page stays on the numbers."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-muted-foreground">
          Starting stake $
          <input
            className={`mt-1 ${field}`}
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </label>
        <label className="text-xs font-semibold text-muted-foreground">
          Bankroll $
          <input
            className={`mt-1 ${field}`}
            value={bank}
            onChange={(e) => setBank(e.target.value)}
          />
        </label>
        <label className="text-xs font-semibold text-muted-foreground">
          Table / site max $
          <input
            className={`mt-1 ${field}`}
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
          />
        </label>
        <label className="text-xs font-semibold text-muted-foreground">
          Win chance %
          <input
            className={`mt-1 ${field}`}
            value={pWin}
            onChange={(e) => setPWin(e.target.value)}
          />
        </label>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        Sequence stops after {rows.length} losses at a ${last ? last.bet.toFixed(2) : "0"} next bet
        (bankroll or max). Chance of that losing run:{" "}
        {last ? `${(last.pLose * 100).toFixed(2)}%` : "—"}. Default 48.65% is European even-money;
        use 48.48% for Purple/Silver on our 33-slot wheel.
      </p>
      <table className="mt-4 w-full border-collapse text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="pb-2">Loss #</th>
            <th className="pb-2">Stake</th>
            <th className="pb-2">Total at risk</th>
            <th className="pb-2">P(this many losses)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.n} className="border-t border-border/70">
              <td className="py-1.5">{r.n}</td>
              <td className="py-1.5">${r.bet.toFixed(2)}</td>
              <td className="py-1.5">${r.spent.toFixed(2)}</td>
              <td className="py-1.5">{(r.pLose * 100).toFixed(2)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 text-sm">
        <Link
          to="/guides/$slug"
          params={{ slug: "martingale-strategy" }}
          className="text-primary hover:underline"
        >
          Martingale strategy guide
        </Link>{" "}
        ·{" "}
        <Link to="/responsible-gambling" className="text-primary hover:underline">
          Responsible gambling
        </Link>
      </p>
    </Shell>
  );
}

function RtpWidget() {
  const [rtp, setRtp] = useState("96");
  const [bet, setBet] = useState("1");
  const [spins, setSpins] = useState("100");
  const r = Math.min(100, Math.max(0, Number(rtp) || 0));
  const edge = (100 - r) / 100;
  const wagered = (Number(bet) || 0) * (Number(spins) || 0);
  const loss = wagered * edge;
  return (
    <Shell
      title="RTP calculator"
      text="RTP is the long-run share returned to players. Expected loss = amount wagered × (1 − RTP). A 96% RTP is not a 96% chance to win a session."
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-semibold text-muted-foreground">
          RTP %
          <input className={`mt-1 ${field}`} value={rtp} onChange={(e) => setRtp(e.target.value)} />
        </label>
        <label className="text-xs font-semibold text-muted-foreground">
          Bet size $
          <input className={`mt-1 ${field}`} value={bet} onChange={(e) => setBet(e.target.value)} />
        </label>
        <label className="text-xs font-semibold text-muted-foreground">
          Number of bets
          <input
            className={`mt-1 ${field}`}
            value={spins}
            onChange={(e) => setSpins(e.target.value)}
          />
        </label>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className={box}>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">House edge</p>
          <p className="mt-1 font-display text-xl text-foreground">{(edge * 100).toFixed(2)}%</p>
        </div>
        <div className={box}>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Wagered</p>
          <p className="mt-1 font-display text-xl text-foreground">${wagered.toFixed(2)}</p>
        </div>
        <div className={box}>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Expected loss</p>
          <p className="mt-1 font-display text-xl text-foreground">${loss.toFixed(2)}</p>
        </div>
      </div>
      <p className="mt-4 text-sm">
        <Link
          to="/guides/$slug"
          params={{ slug: "rtp-explained" }}
          className="text-primary hover:underline"
        >
          RTP explained
        </Link>{" "}
        ·{" "}
        <Link
          to="/guides/$slug"
          params={{ slug: "house-edge" }}
          className="text-primary hover:underline"
        >
          House edge
        </Link>
      </p>
    </Shell>
  );
}

function money(n: number, digits = 2) {
  if (!Number.isFinite(n)) return "—";
  const sign = n < 0 ? "−" : "";
  return `${sign}$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

function netFromAmerican(price: number) {
  if (!Number.isFinite(price) || price === 0 || Math.abs(price) < 100) return null;
  return price > 0 ? price / 100 : 100 / Math.abs(price);
}

function impliedFromAmerican(price: number) {
  const net = netFromAmerican(price);
  if (net == null) return null;
  return 1 / (1 + net);
}

function LotteryWidget() {
  const [cash, setCash] = useState("200000000");
  const [fed, setFed] = useState("24");
  const [state, setState] = useState("5");
  const [game, setGame] = useState("292201338");
  const c = Math.max(0, Number(cash) || 0);
  const f = Math.min(100, Math.max(0, Number(fed) || 0)) / 100;
  const s = Math.min(100, Math.max(0, Number(state) || 0)) / 100;
  const n = Math.max(1, Number(game) || 1);
  const withhold = c * f;
  const stateTax = c * s;
  const left = c - withhold - stateTax;
  const ev = left / n;
  return (
    <Shell
      title="Lottery calculator"
      text="Illustration only. Withholding is not the final tax, and a state rate of 5% is an example you replace. This is not tax advice. It does not change the odds."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-muted-foreground">
          Published cash option $
          <input className={`mt-1 ${field}`} value={cash} onChange={(e) => setCash(e.target.value)} />
        </label>
        <label className="text-xs font-semibold text-muted-foreground">
          Combination count
          <select className={`mt-1 ${field}`} value={game} onChange={(e) => setGame(e.target.value)}>
            <option value="292201338">Powerball, 292,201,338</option>
            <option value="290472336">Mega Millions, 290,472,336</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-muted-foreground">
          Federal withholding %
          <input className={`mt-1 ${field}`} value={fed} onChange={(e) => setFed(e.target.value)} />
        </label>
        <label className="text-xs font-semibold text-muted-foreground">
          Example state rate %
          <input className={`mt-1 ${field}`} value={state} onChange={(e) => setState(e.target.value)} />
        </label>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className={box}>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Withholding</p>
          <p className="mt-1 font-display text-xl">{money(withhold, 0)}</p>
        </div>
        <div className={box}>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Example state line</p>
          <p className="mt-1 font-display text-xl">{money(stateTax, 0)}</p>
        </div>
        <div className={box}>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Cash left, illustration</p>
          <p className="mt-1 font-display text-xl">{money(left, 0)}</p>
        </div>
        <div className={box}>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Jackpot-only value of one line</p>
          <p className="mt-1 font-display text-xl">{money(ev)}</p>
        </div>
      </div>
    </Shell>
  );
}

function HedgeWidget() {
  const [stake, setStake] = useState("100");
  const [original, setOriginal] = useState("300");
  const [hedge, setHedge] = useState("-150");
  const s0 = Math.max(0, Number(stake) || 0);
  const f0 = netFromAmerican(Number(original));
  const f = netFromAmerican(Number(hedge));
  const ready = f0 != null && f != null && s0 > 0;
  const profit = ready ? s0 * f0 : 0;
  const hedgeStake = ready ? (profit + s0) / (1 + f) : 0;
  const locked = profit - hedgeStake;
  const hedgeWin = hedgeStake * (f ?? 0);
  return (
    <Shell
      title="Hedge calculator"
      text="Sizes a second stake so both outcomes land on the same net. A negative lock is a certain loss. This is not a pick and not betting advice. Adults 18+."
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-semibold text-muted-foreground">
          Original stake $
          <input className={`mt-1 ${field}`} value={stake} onChange={(e) => setStake(e.target.value)} />
        </label>
        <label className="text-xs font-semibold text-muted-foreground">
          Original American odds
          <input className={`mt-1 ${field}`} value={original} onChange={(e) => setOriginal(e.target.value)} />
        </label>
        <label className="text-xs font-semibold text-muted-foreground">
          Hedge American odds
          <input className={`mt-1 ${field}`} value={hedge} onChange={(e) => setHedge(e.target.value)} />
        </label>
      </div>
      {ready ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className={box}>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Hedge stake</p>
            <p className="mt-1 font-display text-xl">{money(hedgeStake)}</p>
          </div>
          <div className={box}>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Locked net</p>
            <p className="mt-1 font-display text-xl">{money(locked)}</p>
          </div>
          <div className={box}>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">If the hedge wins</p>
            <p className="mt-1 font-display text-xl">{money(hedgeWin - s0)}</p>
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          Enter American odds of at least 100, with a minus sign for favorites.
        </p>
      )}
    </Shell>
  );
}

function ArbitrageWidget() {
  const [a, setA] = useState("110");
  const [b, setB] = useState("110");
  const [total, setTotal] = useState("1000");
  const ia = impliedFromAmerican(Number(a));
  const ib = impliedFromAmerican(Number(b));
  const outlay = Math.max(0, Number(total) || 0);
  const ready = ia != null && ib != null && outlay > 0;
  const sum = ready ? ia + ib : 0;
  const stakeA = ready ? (outlay * ia) / sum : 0;
  const stakeB = ready ? outlay - stakeA : 0;
  const backA = ready ? stakeA / ia : 0;
  const backB = ready ? stakeB / ib : 0;
  const profit = Math.min(backA, backB) - outlay;
  return (
    <Shell
      title="Arbitrage calculator"
      text="Shows the gap when two opposite prices sum to less than 100%. It cannot keep the second price from moving or a book from voiding one side. Not betting advice. Adults 18+."
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-semibold text-muted-foreground">
          Side A American odds
          <input className={`mt-1 ${field}`} value={a} onChange={(e) => setA(e.target.value)} />
        </label>
        <label className="text-xs font-semibold text-muted-foreground">
          Side B American odds
          <input className={`mt-1 ${field}`} value={b} onChange={(e) => setB(e.target.value)} />
        </label>
        <label className="text-xs font-semibold text-muted-foreground">
          Total stake $
          <input className={`mt-1 ${field}`} value={total} onChange={(e) => setTotal(e.target.value)} />
        </label>
      </div>
      {ready ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className={box}>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Implied sum</p>
            <p className="mt-1 font-display text-xl">{(sum * 100).toFixed(2)}%</p>
          </div>
          <div className={box}>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Stakes</p>
            <p className="mt-1 font-display text-xl">
              {money(stakeA)} / {money(stakeB)}
            </p>
          </div>
          <div className={box}>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {sum < 1 ? "Paper profit" : "Paper loss"}
            </p>
            <p className="mt-1 font-display text-xl">{money(profit)}</p>
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          Enter two American prices of at least 100, and a total stake.
        </p>
      )}
    </Shell>
  );
}

function GamblingTaxWidget() {
  const [wins, setWins] = useState("10000");
  const [losses, setLosses] = useState("4000");
  const [rate, setRate] = useState("24");
  const [cap, setCap] = useState("100");
  const w = Math.max(0, Number(wins) || 0);
  const l = Math.max(0, Number(losses) || 0);
  const r = Math.min(100, Math.max(0, Number(rate) || 0)) / 100;
  const c = Math.min(100, Math.max(0, Number(cap) || 0)) / 100;
  const allowed = Math.min(l, w) * c;
  const net = w - allowed;
  const tax = net * r;
  return (
    <Shell
      title="Gambling tax calculator"
      text="A labeled illustration. Losses reduce the figure only at the cap you type. This does not file a return and is not tax advice. Adults 18+."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-muted-foreground">
          Wins $
          <input className={`mt-1 ${field}`} value={wins} onChange={(e) => setWins(e.target.value)} />
        </label>
        <label className="text-xs font-semibold text-muted-foreground">
          Losses $
          <input className={`mt-1 ${field}`} value={losses} onChange={(e) => setLosses(e.target.value)} />
        </label>
        <label className="text-xs font-semibold text-muted-foreground">
          Flat rate %
          <input className={`mt-1 ${field}`} value={rate} onChange={(e) => setRate(e.target.value)} />
        </label>
        <label className="text-xs font-semibold text-muted-foreground">
          Loss cap %
          <input className={`mt-1 ${field}`} value={cap} onChange={(e) => setCap(e.target.value)} />
        </label>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className={box}>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Losses allowed</p>
          <p className="mt-1 font-display text-xl">{money(allowed)}</p>
        </div>
        <div className={box}>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Net in the example</p>
          <p className="mt-1 font-display text-xl">{money(net)}</p>
        </div>
        <div className={box}>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Tax at the flat rate</p>
          <p className="mt-1 font-display text-xl">{money(tax)}</p>
        </div>
      </div>
    </Shell>
  );
}

function RouletteSimWidget() {
  const [wheel, setWheel] = useState<"eu" | "us">("eu");
  const [stake, setStake] = useState("1");
  const [spins, setSpins] = useState("1000");
  const [result, setResult] = useState<{ end: number; expected: number; wins: number; n: number } | null>(
    null,
  );
  function run() {
    const n = Math.min(5000, Math.max(1, Math.floor(Number(spins) || 1000)));
    const s = Math.max(0, Number(stake) || 0);
    const pockets = wheel === "eu" ? 37 : 38;
    let end = 0;
    let wins = 0;
    for (let i = 0; i < n; i++) {
      if (Math.floor(Math.random() * pockets) < 18) {
        end += s;
        wins += 1;
      } else end -= s;
    }
    const edge = wheel === "eu" ? 1 / 37 : 1 / 19;
    setResult({ end, expected: -n * s * edge, wins, n });
  }
  return (
    <Shell
      title="Roulette simulator"
      text="Even-money practice spins on a 37-pocket or 38-pocket wheel. This demo is not the live PVPspinArena wheel and is not provably fair. Adults 18+."
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-semibold text-muted-foreground">
          Wheel
          <select
            className={`mt-1 ${field}`}
            value={wheel}
            onChange={(e) => setWheel(e.target.value === "us" ? "us" : "eu")}
          >
            <option value="eu">European, 37 pockets</option>
            <option value="us">American, 38 pockets</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-muted-foreground">
          Stake per spin $
          <input className={`mt-1 ${field}`} value={stake} onChange={(e) => setStake(e.target.value)} />
        </label>
        <label className="text-xs font-semibold text-muted-foreground">
          Spins, up to 5,000
          <input className={`mt-1 ${field}`} value={spins} onChange={(e) => setSpins(e.target.value)} />
        </label>
      </div>
      <button
        type="button"
        onClick={run}
        className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
      >
        Run practice spins
      </button>
      {result && (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className={box}>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">This path</p>
            <p className="mt-1 font-display text-xl">{money(result.end)}</p>
          </div>
          <div className={box}>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Expected loss</p>
            <p className="mt-1 font-display text-xl">{money(Math.abs(result.expected))}</p>
          </div>
          <div className={box}>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Wins</p>
            <p className="mt-1 font-display text-xl">
              {result.wins} / {result.n}
            </p>
          </div>
        </div>
      )}
    </Shell>
  );
}

function BetTrackerWidget() {
  const [rows, setRows] = useState([
    { stake: "100", odds: "-110", result: "loss" },
    { stake: "100", odds: "-110", result: "win" },
  ]);
  const parsed = rows.map((r) => {
    const stake = Math.max(0, Number(r.stake) || 0);
    const net = netFromAmerican(Number(r.odds));
    const profit = r.result === "push" || net == null ? 0 : r.result === "win" ? stake * net : -stake;
    return { stake, profit, ok: net != null || r.result === "push" };
  });
  const staked = parsed.reduce((s, r) => s + r.stake, 0);
  const profit = parsed.reduce((s, r) => s + r.profit, 0);
  const roi = staked > 0 ? (profit / staked) * 100 : 0;
  return (
    <Shell
      title="Bet tracker"
      text="A log that stays in this tab. ROI is net profit divided by stake. A push adds no profit. This is not a pick sheet. Adults 18+."
    >
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-3 gap-2">
            <input
              className={field}
              value={r.stake}
              aria-label="Stake"
              onChange={(e) =>
                setRows((p) => p.map((x, n) => (n === i ? { ...x, stake: e.target.value } : x)))
              }
            />
            <input
              className={field}
              value={r.odds}
              aria-label="American odds"
              onChange={(e) =>
                setRows((p) => p.map((x, n) => (n === i ? { ...x, odds: e.target.value } : x)))
              }
            />
            <select
              className={field}
              value={r.result}
              aria-label="Result"
              onChange={(e) =>
                setRows((p) => p.map((x, n) => (n === i ? { ...x, result: e.target.value } : x)))
              }
            >
              <option value="win">Win</option>
              <option value="loss">Loss</option>
              <option value="push">Push</option>
            </select>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="mt-3 text-sm text-primary hover:underline"
        onClick={() => setRows((p) => [...p, { stake: "100", odds: "-110", result: "loss" }])}
      >
        Add a row
      </button>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className={box}>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Staked</p>
          <p className="mt-1 font-display text-xl">{money(staked)}</p>
        </div>
        <div className={box}>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Net</p>
          <p className="mt-1 font-display text-xl">{money(profit)}</p>
        </div>
        <div className={box}>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">ROI</p>
          <p className="mt-1 font-display text-xl">{roi.toFixed(1)}%</p>
        </div>
      </div>
    </Shell>
  );
}

export function GuideWidget({ type }: { type: NonNullable<Guide["widget"]> }) {
  if (type === "cs2-trade-up") return <Cs2TradeUpCalculator />;
  if (type === "cs2-inventory") return <Cs2InventoryWidget />;
  if (type === "cs2-case-odds") return <Cs2CaseOddsWidget />;
  if (type === "cs2-float") return <Cs2FloatWidget />;
  if (type === "martingale") return <MartingaleWidget />;
  if (type === "rtp") return <RtpWidget />;
  if (type === "lottery") return <LotteryWidget />;
  if (type === "hedge") return <HedgeWidget />;
  if (type === "arbitrage") return <ArbitrageWidget />;
  if (type === "gambling-tax") return <GamblingTaxWidget />;
  if (type === "roulette-sim") return <RouletteSimWidget />;
  return <BetTrackerWidget />;
}
