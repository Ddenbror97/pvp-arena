import { createFileRoute } from "@tanstack/react-router";
import { ogImageMeta } from "@/lib/og";
import { useState } from "react";
import { drawTicket, hexToBytes, sha256Hex } from "@/lib/jackpot/fairness";
import { coinflipMessage, coinflipOutcome } from "@/lib/fairness/coinflip";
import CF_VECTORS from "@/lib/fairness/coinflip-v1-vectors.json";
import { rouletteMessage, verifyRoulette } from "@/lib/fairness/roulette";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/fairness")({
  head: () => ({
    meta: [
      { title: "Fairness protocol — PVPspinArena" },
      { name: "description", content: "How PVPspinArena decides Jackpot, Coinflip and Roulette results: seed commitment, HMAC-SHA256, unbiased mapping. Verify any game yourself." },
      { property: "og:title", content: "Fairness protocol — PVPspinArena" },
      { property: "og:description", content: "Commit/reveal draws with HMAC-SHA256 and unbiased ticket mapping. Verify any game yourself." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
      ...ogImageMeta(),
    ],
  }),
  component: FairnessPage,
});

const SPEC = `Before entries open:
  server_seed      = 32 random bytes (CSPRNG, Postgres pgcrypto)
  server_seed_hash = SHA256(server_seed)            -> published on the game

Fixed message (known before any entry):
  message(c) = "PVPCasino:jackpot:v1:" + game_id + ":" + draw_version + ":" + c

After entries close (N = final pot in cents = ticket count):
  limit = floor(2^64 / N) * N
  for c = 0, 1, 2, ...:
    h = HMAC-SHA256(key = server_seed, data = message(c))
    r = first 8 bytes of h, big-endian unsigned 64-bit
    if r < limit: winning_ticket = r mod N; stop       (rejection sampling: no modulo bias)
  winner = entry with ticket_start <= winning_ticket < ticket_end

After settlement: server_seed is revealed on the game record.`;

const CF_SPEC = `When the game is created (before any opponent exists):
  server_seed      = 32 random bytes (CSPRNG, Postgres pgcrypto)
  server_seed_hash = SHA256(server_seed)            -> published on the game

Fixed message (no free parameter):
  message = "PVPCasino:coinflip:v1:" + game_id + ":" + draw_version

  h    = HMAC-SHA256(key = server_seed, data = UTF-8(message))
  side = (h[0] & 1) == 0 ? HEADS : TAILS             (exactly 50/50: one bit)

The result is fixed when the opponent joins, hidden until the flip starts,
and the seed is revealed once the game is settled.`;

type Tab = "jackpot" | "coinflip" | "roulette";

function FairnessPage() {
  const [tab, setTab] = useState<Tab>("jackpot");

  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="font-display text-2xl sm:text-3xl">Fairness protocol</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Every result is decided on the server with cryptographic randomness before any animation plays.
        We commit to a secret seed before a round opens and reveal it afterwards, so anyone can recompute the outcome.
      </p>

      <div className="mt-5 grid grid-cols-3 gap-1.5 rounded-xl border border-border bg-card p-1.5" role="tablist" aria-label="Protocol">
        {(
          [
            ["jackpot", "Jackpot"],
            ["coinflip", "Coinflip"],
            ["roulette", "Roulette"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn(
              "rounded-lg py-2 font-display text-xs uppercase tracking-widest transition",
              tab === id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6">{tab === "jackpot" ? <JackpotSection /> : tab === "coinflip" ? <CoinflipSection /> : <RouletteSection />}</div>
    </div>
  );
}

function JackpotSection() {
  const [seed, setSeed] = useState("");
  const [gameId, setGameId] = useState("");
  const [pot, setPot] = useState("");
  const [out, setOut] = useState<string | null>(null);

  async function run() {
    try {
      const hash = await sha256Hex(hexToBytes(seed));
      const r = await drawTicket(seed, BigInt(gameId), 1, BigInt(pot));
      setOut(`SHA256(seed) = ${hash}\nwinning_ticket = ${r.ticket} (round ${r.counter})`);
    } catch (e) {
      setOut(e instanceof Error ? e.message : "Invalid input");
    }
  }

  return (
    <section aria-label="Jackpot fairness">
      <p className="text-sm text-muted-foreground">
        The pot is split into one ticket per cent. A committed seed and rejection sampling pick the winning ticket — you can
        recompute it below, or open any completed game and press “Verify”.
      </p>

      <Card title="Verify a draw">
        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="seed">Revealed server seed (hex)</Label>
            <Input id="seed" value={seed} onChange={(e) => setSeed(e.target.value)} className="tabular" />
          </div>
          <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="gid">Game number</Label>
              <Input id="gid" value={gameId} onChange={(e) => setGameId(e.target.value)} inputMode="numeric" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pot">Final pot in cents</Label>
              <Input id="pot" value={pot} onChange={(e) => setPot(e.target.value)} inputMode="numeric" />
            </div>
          </div>
          <Button onClick={run} className="w-full min-[420px]:w-fit">Compute</Button>
          {out && <pre className="tabular whitespace-pre-wrap break-all rounded-xl bg-background/60 p-3 text-xs">{out}</pre>}
        </div>
      </Card>

      <details className="mt-4 rounded-2xl border border-border bg-card p-4">
        <summary className="cursor-pointer font-display text-sm">How the draw works</summary>
        <pre className="tabular mt-3 overflow-x-auto text-[11px] leading-relaxed text-muted-foreground">{SPEC}</pre>
      </details>

      <details className="mt-2 rounded-2xl border border-border bg-card p-4">
        <summary className="cursor-pointer font-display text-sm">What this does and doesn’t prove</summary>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-xs text-muted-foreground">
          <li>The seed was fixed before any entry: its hash was public from the moment the round opened.</li>
          <li>The draw input has no free parameter: the message is fully determined by the game number and protocol version.</li>
          <li>Ticket mapping is integer-only and unbiased thanks to rejection sampling.</li>
          <li>
            Limitation: the operator generates the seed alone. A future version will mix in an independent randomness source
            before any real-money use.
          </li>
        </ul>
      </details>
    </section>
  );
}

function CoinflipSection() {
  const [seed, setSeed] = useState("");
  const [gameId, setGameId] = useState("");
  const [out, setOut] = useState<string | null>(null);
  async function run() {
    try {
      const hash = await sha256Hex(hexToBytes(seed));
      const o = await coinflipOutcome(seed, gameId.trim(), 1);
      setOut(`SHA256(seed) = ${hash}\nmessage      = ${coinflipMessage(gameId.trim(), 1)}\nHMAC         = ${o.hmacHex}\nfirst byte   = ${o.firstByte} -> ${o.side}`);
    } catch (e) {
      setOut(e instanceof Error ? e.message : "Invalid input");
    }
  }
  return (
    <section aria-label="Coinflip fairness">
      <p className="text-sm text-muted-foreground">
        Uses the same seed-commitment engine as Jackpot, with its own message prefix so results from one game can never be
        reused for another. One HMAC bit decides the side — exactly 50/50.
      </p>

      <Card title="Verify a coinflip">
        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="cfseed">Revealed server seed (hex)</Label>
            <Input id="cfseed" value={seed} onChange={(e) => setSeed(e.target.value)} className="tabular" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cfgid">Coinflip game number</Label>
            <Input id="cfgid" value={gameId} onChange={(e) => setGameId(e.target.value)} inputMode="numeric" />
          </div>
          <Button onClick={run} className="w-full min-[420px]:w-fit">Compute</Button>
          {out && <pre className="tabular whitespace-pre-wrap break-all rounded-xl bg-background/60 p-3 text-xs">{out}</pre>}
          <p className="text-[11px] text-muted-foreground">Runs entirely in your browser; nothing is sent to our servers.</p>
        </div>
      </Card>

      <details className="mt-4 rounded-2xl border border-border bg-card p-4">
        <summary className="cursor-pointer font-display text-sm">How the draw works</summary>
        <pre className="tabular mt-3 overflow-x-auto text-[11px] leading-relaxed text-muted-foreground">{CF_SPEC}</pre>
      </details>

      <details className="mt-2 rounded-2xl border border-border bg-card p-4">
        <summary className="cursor-pointer font-display text-sm">Published test vectors ({CF_VECTORS.length})</summary>
        <div className="mt-3 max-h-64 overflow-y-auto overscroll-contain">
          <table className="tabular w-full text-[11px]">
            <thead className="text-left text-muted-foreground"><tr><th className="pr-3">game_id</th><th className="pr-3">server_seed</th><th className="pr-3">first byte</th><th>side</th></tr></thead>
            <tbody>
              {CF_VECTORS.map((v, i) => (
                <tr key={i}><td className="pr-3">{v.game_id}</td><td className="break-all pr-3">{v.server_seed}</td><td className="pr-3">{v.first_byte}</td><td>{v.side}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}

function RouletteSection() {
  const [gameId, setGameId] = useState("");
  const [out, setOut] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    try {
      const id = Number(gameId.trim());
      if (!Number.isInteger(id) || id < 1) throw new Error("Enter a round number.");
      const { data: g, error } = await supabase.from("roulette_games")
        .select("id, status, server_seed, server_seed_hash, draw_version, wheel_version, winning_slot, winning_color").eq("id", id).maybeSingle();
      if (error) throw new Error("Could not load that round.");
      if (!g) throw new Error("Round not found.");
      if (!g.server_seed) throw new Error("The seed is revealed once the round has finished.");
      const { data: w } = await supabase.from("roulette_wheels").select("layout").eq("version", g.wheel_version).single();
      const v = await verifyRoulette({ ...g, server_seed: g.server_seed, layout: (w?.layout ?? []) as string[] });
      const match = v.hashOk && (g.status === "CANCELLED" || (v.slot === g.winning_slot && v.color === g.winning_color));
      setOut(`commitment   = ${v.hashOk ? "matches" : "MISMATCH"}\nmessage      = ${rouletteMessage(g.id, g.draw_version, v.counter)}\nwheel        = v${g.wheel_version} (${w?.layout.length} slots)\nslot         = ${v.slot} -> ${v.color}\nrecorded     = ${g.status === "CANCELLED" ? "cancelled (refunded)" : `${g.winning_slot} -> ${g.winning_color}`}\nverified     = ${match ? "yes" : "NO"}`);
    } catch (e) {
      setOut(e instanceof Error ? e.message : "Invalid input");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section aria-label="Roulette fairness">
      <p className="text-sm text-muted-foreground">
        Same engine as Jackpot and Coinflip with its own message prefix. Each wheel slot is exactly equally likely; the
        slot decides the coin.
      </p>
      <Card title="Verify a roulette round">
        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="rlgid">Round number</Label>
            <Input id="rlgid" value={gameId} onChange={(e) => setGameId(e.target.value)} inputMode="numeric" />
          </div>
          <Button onClick={run} disabled={busy} className="w-full min-[420px]:w-fit">Verify</Button>
          {out && <pre className="tabular whitespace-pre-wrap break-all rounded-xl bg-background/60 p-3 text-xs">{out}</pre>}
          <p className="text-[11px] text-muted-foreground">The seed and wheel are loaded from public data; the maths runs in your browser.</p>
        </div>
      </Card>
      <details className="mt-4 rounded-2xl border border-border bg-card p-4">
        <summary className="cursor-pointer font-display text-sm">How the draw works</summary>
        <pre className="tabular mt-3 overflow-x-auto text-[11px] leading-relaxed text-muted-foreground">{`HMAC-SHA256(key = server_seed, message = "PVPCasino:roulette:v1:{round}:{draw_version}:{counter}")
r = first 8 bytes (big-endian); limit = floor(2^64 / n) * n
if r >= limit: counter += 1 and redraw (max 1000)
slot = r mod n; colour = wheel.layout[slot]`}</pre>
      </details>
    </section>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-2xl border border-border bg-card p-4">
      <h2 className="font-display text-sm uppercase tracking-widest">{title}</h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}
