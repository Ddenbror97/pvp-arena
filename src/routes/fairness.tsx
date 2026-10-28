import { createFileRoute, Link } from "@tanstack/react-router";
import { indexableHead } from "@/lib/seo/indexable-head";
import { useState } from "react";
import { drawTicket, hexToBytes, sha256Hex } from "@/lib/jackpot/fairness";
import {
  coinflipMessage,
  coinflipOutcome,
  verifyCoinflip,
  type CoinSide,
} from "@/lib/fairness/coinflip";
import { verifyGame } from "@/lib/jackpot/fairness";
import CF_VECTORS from "@/lib/fairness/coinflip-v1-vectors.json";
import { rouletteMessage, verifyRoulette } from "@/lib/fairness/roulette";
import { verifySlott } from "@/lib/fairness/slott";
import { fetchSlotGame, fetchSlotSpins } from "@/lib/slott/api";
import { fetchPoolState } from "@/lib/pool/api";
import { bytesFromHex, replayMatch, stepsFromRecord } from "@/lib/pool/verify";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/fairness")({
  head: () =>
    indexableHead({
      path: "/fairness",
      title: "Fairness — Provably Fair Games | PVPspinArena",
      description:
        "Check a draw from its committed seed, a poker shuffle from the players' secrets, or an 8-ball match by replaying the shots. The rack seed does not pick the winner.",
      crumb: "Fairness",
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

const POKER_SPEC = `At sit-down, each player's browser commits L0 = the head of a SHA-256 hash chain
  (L_k = SHA256(L_{k+1}), secret end kept in that browser).

When a hand opens:
  server_seed      = 32 random bytes;  server_seed_hash = SHA256(server_seed) -> published
  each player reveals v with SHA256(v) = their current link   (5 s window)
  entropy = SHA256("PVPCasino:poker:v1:entropy:{hand}:" + "{seat}={v}" joined by "|", sorted by seat)

Shuffle (Fisher-Yates over cards 0..51, i = 51 down to 1):
  draw = first 4 bytes of HMAC-SHA256(server_seed, "PVPCasino:poker:v1:{hand}:{entropy}:{i}:{counter}")
  reject draw >= floor(2^32 / (i+1)) * (i+1), else j = draw mod (i+1)   (no modulo bias)

A missing reveal voids the hand before any card or blind: no money moves.
After the hand: server_seed is published and anyone can rebuild the whole deck.`;

type Tab = "jackpot" | "coinflip" | "roulette" | "slott" | "poker" | "pool";

function FairnessPage() {
  const [tab, setTab] = useState<Tab>("jackpot");

  return (
    <div className="mx-auto w-full max-w-6xl">
      <h1 className="font-display text-2xl sm:text-3xl">Fairness protocol</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Jackpot, Coinflip, Roulette and P2P Slott commit a secret seed and reveal it so you can
        recompute the draw. Poker publishes the shuffle. 8-ball does not draw a winner: the seed
        only racks the balls, and you replay the shots through the published rules. A paid winner
        that disagrees with that replay is not a verified result.
      </p>

      <div
        className="mt-5 grid grid-cols-3 gap-1.5 sm:grid-cols-6 rounded-xl border border-border bg-card p-1.5"
        role="tablist"
        aria-label="Protocol"
      >
        {(
          [
            ["jackpot", "Jackpot"],
            ["coinflip", "Coinflip"],
            ["roulette", "Roulette"],
            ["slott", "P2P Slott"],
            ["poker", "Poker"],
            ["pool", "8-ball"],
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
              tab === id
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "jackpot" ? (
          <JackpotSection />
        ) : tab === "coinflip" ? (
          <CoinflipSection />
        ) : tab === "roulette" ? (
          <RouletteSection />
        ) : tab === "slott" ? (
          <SlottSection />
        ) : tab === "poker" ? (
          <PokerSection />
        ) : (
          <PoolSection />
        )}
      </div>
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Want to check results by hand? Read our{" "}
        <Link
          to="/guides/$slug"
          params={{ slug: "provably-fair-calculator" }}
          className="text-primary hover:underline"
        >
          provably fair calculator guide
        </Link>{" "}
        or learn how{" "}
        <Link
          to="/guides/$slug"
          params={{ slug: "hmac-sha256-provably-fair" }}
          className="text-primary hover:underline"
        >
          HMAC-SHA256
        </Link>{" "}
        works.
      </p>
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
        The pot is split into one ticket per cent. A committed seed and rejection sampling pick the
        winning ticket — you can recompute it below, or open any completed game and press “Verify”.
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Verify a draw">
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="seed">Revealed server seed (hex)</Label>
              <Input
                id="seed"
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                className="tabular"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="gid">Game number</Label>
                <Input
                  id="gid"
                  value={gameId}
                  onChange={(e) => setGameId(e.target.value)}
                  inputMode="numeric"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pot">Final pot in cents</Label>
                <Input
                  id="pot"
                  value={pot}
                  onChange={(e) => setPot(e.target.value)}
                  inputMode="numeric"
                />
              </div>
            </div>
            <Button onClick={run} className="w-full min-[420px]:w-fit">
              Compute
            </Button>
            {out && (
              <pre className="tabular whitespace-pre-wrap break-all rounded-xl bg-background/60 p-3 text-xs">
                {out}
              </pre>
            )}
          </div>
        </Card>

        <RecordedCheck title="Check a recorded Jackpot game" id="jpcheck" run={checkJackpot} />
      </div>

      <div className="mt-4 grid gap-2 lg:grid-cols-2">
        <details className="rounded-2xl border border-border bg-card p-4">
          <summary className="cursor-pointer font-display text-sm">How the draw works</summary>
          <pre className="tabular mt-3 overflow-x-auto text-[11px] leading-relaxed text-muted-foreground">
            {SPEC}
          </pre>
        </details>

        <details className="rounded-2xl border border-border bg-card p-4">
          <summary className="cursor-pointer font-display text-sm">
            What this does and doesn’t prove
          </summary>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-xs text-muted-foreground">
            <li>
              The seed was fixed before any entry: its hash was public from the moment the round
              opened.
            </li>
            <li>
              The draw input has no free parameter: the message is fully determined by the game
              number and protocol version.
            </li>
            <li>Ticket mapping is integer-only and unbiased thanks to rejection sampling.</li>
            <li>
              Limitation: the operator generates the seed alone. A future version will mix in an
              independent randomness source before any real-money use.
            </li>
          </ul>
        </details>
      </div>
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
      setOut(
        `SHA256(seed) = ${hash}\nmessage      = ${coinflipMessage(gameId.trim(), 1)}\nHMAC         = ${o.hmacHex}\nfirst byte   = ${o.firstByte} -> ${o.side}`,
      );
    } catch (e) {
      setOut(e instanceof Error ? e.message : "Invalid input");
    }
  }
  return (
    <section aria-label="Coinflip fairness">
      <p className="text-sm text-muted-foreground">
        Uses the same seed-commitment engine as Jackpot, with its own message prefix so results from
        one game can never be reused for another. One HMAC bit decides the side — exactly 50/50.
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Verify a coinflip">
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cfseed">Revealed server seed (hex)</Label>
              <Input
                id="cfseed"
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                className="tabular"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cfgid">Coinflip game number</Label>
              <Input
                id="cfgid"
                value={gameId}
                onChange={(e) => setGameId(e.target.value)}
                inputMode="numeric"
              />
            </div>
            <Button onClick={run} className="w-full min-[420px]:w-fit">
              Compute
            </Button>
            {out && (
              <pre className="tabular whitespace-pre-wrap break-all rounded-xl bg-background/60 p-3 text-xs">
                {out}
              </pre>
            )}
            <p className="text-[11px] text-muted-foreground">
              Runs entirely in your browser; nothing is sent to our servers.
            </p>
          </div>
        </Card>

        <RecordedCheck title="Check a recorded Coinflip game" id="cfcheck" run={checkCoinflip} />
      </div>

      <div className="mt-4 grid gap-2 lg:grid-cols-2">
        <details className="rounded-2xl border border-border bg-card p-4">
          <summary className="cursor-pointer font-display text-sm">How the draw works</summary>
          <pre className="tabular mt-3 overflow-x-auto text-[11px] leading-relaxed text-muted-foreground">
            {CF_SPEC}
          </pre>
        </details>

        <details className="rounded-2xl border border-border bg-card p-4">
          <summary className="cursor-pointer font-display text-sm">
            Published test vectors ({CF_VECTORS.length})
          </summary>
          <div className="mt-3 max-h-64 overflow-y-auto">
            <table className="tabular w-full text-[11px]">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="pr-3">game_id</th>
                  <th className="pr-3">server_seed</th>
                  <th className="pr-3">first byte</th>
                  <th>side</th>
                </tr>
              </thead>
              <tbody>
                {CF_VECTORS.map((v, i) => (
                  <tr key={i}>
                    <td className="pr-3">{v.game_id}</td>
                    <td className="break-all pr-3">{v.server_seed}</td>
                    <td className="pr-3">{v.first_byte}</td>
                    <td>{v.side}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </div>
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
      const cleaned = gameId.trim().replace(/^#/, "").replace(/[\s,]/g, "");
      const id = /^\d+$/.test(cleaned) ? Number(cleaned) : NaN;
      if (!Number.isSafeInteger(id) || id < 1)
        throw new Error("Enter a round number, for example 389 or #389.");
      const { data: g, error } = await supabase
        .from("roulette_games")
        .select(
          "id, status, server_seed, server_seed_hash, draw_version, wheel_version, winning_slot, winning_color",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw new Error("Could not load that round.");
      if (!g) throw new Error("Round not found.");
      if (!g.server_seed) throw new Error("The seed is revealed once the round has finished.");
      const { data: w } = await supabase
        .from("roulette_wheels")
        .select("layout")
        .eq("version", g.wheel_version)
        .single();
      const v = await verifyRoulette({
        ...g,
        server_seed: g.server_seed,
        layout: (w?.layout ?? []) as string[],
      });
      const match =
        v.hashOk &&
        (g.status === "CANCELLED" || (v.slot === g.winning_slot && v.color === g.winning_color));
      setOut(
        `commitment   = ${v.hashOk ? "matches" : "MISMATCH"}\nmessage      = ${rouletteMessage(g.id, g.draw_version, v.counter)}\nwheel        = v${g.wheel_version} (${w?.layout.length} slots)\nslot         = ${v.slot} -> ${v.color}\nrecorded     = ${g.status === "CANCELLED" ? "cancelled (refunded)" : `${g.winning_slot} -> ${g.winning_color}`}\nverified     = ${match ? "yes" : "NO"}`,
      );
    } catch (e) {
      setOut(e instanceof Error ? e.message : "Invalid input");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section aria-label="Roulette fairness">
      <p className="text-sm text-muted-foreground">
        Same engine as Jackpot and Coinflip with its own message prefix. Each wheel slot is exactly
        equally likely; the slot decides the coin.
      </p>
      <div className="grid gap-4">
        <Card title="Verify a roulette round">
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rlgid">Round number</Label>
              <Input
                id="rlgid"
                value={gameId}
                onChange={(e) => setGameId(e.target.value)}
                inputMode="numeric"
              />
            </div>
            <Button onClick={run} disabled={busy} className="w-full min-[420px]:w-fit">
              Verify
            </Button>
            {out && (
              <pre className="tabular whitespace-pre-wrap break-all rounded-xl bg-background/60 p-3 text-xs">
                {out}
              </pre>
            )}
            <p className="text-[11px] text-muted-foreground">
              The seed and wheel are loaded from public data; the maths runs in your browser.
            </p>
          </div>
        </Card>
        <details className="rounded-2xl border border-border bg-card p-4">
          <summary className="cursor-pointer font-display text-sm">How the draw works</summary>
          <pre className="tabular mt-3 overflow-x-auto text-[11px] leading-relaxed text-muted-foreground">{`HMAC-SHA256(key = server_seed, message = "PVPCasino:roulette:v1:{round}:{draw_version}:{counter}")
r = first 8 bytes (big-endian); limit = floor(2^64 / n) * n
if r >= limit: counter += 1 and redraw (max 1000)
 slot = r mod n; colour = wheel.layout[slot]`}</pre>
        </details>
      </div>
    </section>
  );
}

function SlottSection() {
  const [gameId, setGameId] = useState("");
  const [out, setOut] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    try {
      const cleaned = gameId.trim().replace(/^#/, "").replace(/[\s,]/g, "");
      const id = /^\d+$/.test(cleaned) ? Number(cleaned) : NaN;
      if (!Number.isSafeInteger(id) || id < 1)
        throw new Error("Enter a match number, for example 12 or #12.");
      const g = await fetchSlotGame(id).catch(() => {
        throw new Error("Could not load that match.");
      });
      if (!g) throw new Error("Match not found.");
      if (!g.server_seed) throw new Error("The seed is revealed once the match has finished.");
      const v = await verifySlott(g, await fetchSlotSpins(id));
      setOut(
        [
          ...v.checks.map((c) => `${c.ok ? "ok " : "NO "} ${c.label}: ${c.detail}`),
          `verified = ${v.ok ? "yes" : "NO"}`,
        ].join("\n"),
      );
    } catch (e) {
      setOut(e instanceof Error ? e.message : "Invalid input");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section aria-label="P2P Slott fairness">
      <p className="text-sm text-muted-foreground">
        Every cell of every spin comes from the seed committed when the match was created. Scores,
        WILD counts and bonuses are recomputed from the grids in your browser.
      </p>
      <div className="grid gap-4">
        <Card title="Verify a P2P Slott match">
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="slgid">Match number</Label>
              <Input
                id="slgid"
                value={gameId}
                onChange={(e) => setGameId(e.target.value)}
                inputMode="numeric"
              />
            </div>
            <Button onClick={run} disabled={busy} className="w-full min-[420px]:w-fit">
              Verify
            </Button>
            {out && (
              <pre className="tabular whitespace-pre-wrap break-all rounded-xl bg-background/60 p-3 text-xs">
                {out}
              </pre>
            )}
          </div>
        </Card>
        <details className="rounded-2xl border border-border bg-card p-4">
          <summary className="cursor-pointer font-display text-sm">How a spin is drawn</summary>
          <pre className="tabular mt-3 overflow-x-auto text-[11px] leading-relaxed text-muted-foreground">{`for cell = 0..19 (reel = cell / 4, row = cell % 4):
  h    = HMAC-SHA256(key = server_seed, message = "PVPCasino:slott:v1:{match}:{spin}:{cell}")
  roll = (h[0] * 256 + h[1]) mod 1024          (2^16 is a multiple of 1024: no modulo bias)
  symbol = first symbol whose cumulative weight exceeds roll
score = sum of symbol values + payline wins (3/4/5 in a row pay x5/x15/x50, WILD substitutes)
bonus tier = number of WILDs on the grid (3+), paid into the shared pot within the caps`}</pre>
        </details>
      </div>
    </section>
  );
}

function PokerSection() {
  return (
    <section aria-label="Poker fairness">
      <p className="text-sm text-muted-foreground">
        The deck is shuffled from the server's committed seed and a secret revealed by every player
        dealt in, so the server cannot pick the deck by itself. Each finished hand can be rebuilt
        card by card.
      </p>
      <div className="grid gap-4">
        <Card title="Verify a poker hand">
          <p className="text-sm text-muted-foreground">
            At any table, open the <strong className="text-foreground">Hands</strong> tab and press
            Verify on a finished hand. Your browser checks the seed against the hash it saw before
            the deal, checks every player's reveal against their chain, and recomputes the shuffle.
          </p>
          <Link
            to="/poker"
            className="mt-3 inline-block text-sm font-semibold text-primary hover:underline"
          >
            Open the poker lobby
          </Link>
        </Card>
        <details className="rounded-2xl border border-border bg-card p-4" open>
          <summary className="cursor-pointer font-display text-sm">
            How the deck is shuffled
          </summary>
          <pre className="tabular mt-3 overflow-x-auto text-[11px] leading-relaxed text-muted-foreground">
            {POKER_SPEC}
          </pre>
        </details>
        <p className="text-xs text-muted-foreground">
          Limits: a player can refuse to reveal and void a hand, which is a re-deal, never a payout.
          Voids are public and attributed, and repeated voids sit a player out. The server deals the
          cards, so the protocol proves the deck was not chosen; it cannot prove nobody looked.
        </p>
      </div>
    </section>
  );
}

function PoolSection() {
  const [id, setId] = useState("");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setOut(null);
    try {
      const matchId = Number(id.trim());
      if (!Number.isInteger(matchId) || matchId < 1) throw new Error("Enter a match number.");
      const view = await fetchPoolState(matchId);
      if (!view.server_seed) {
        setOut("The rack seed is still hidden. It is published once the match is playing.");
        return;
      }
      const steps = stepsFromRecord(view.events);
      if (!steps) {
        setOut("The shot list could not be read.");
        return;
      }
      const replay = await replayMatch(
        bytesFromHex(view.server_seed),
        view.server_seed_hash,
        steps,
        view.state?.physics === "pool-phys-v1" ||
        view.state?.physics === "pool-phys-v2" ||
        view.state?.physics === "pool-phys-v3" ||
        view.state?.physics === "pool-phys-v4" ||
        view.state?.physics === "pool-phys-v5" ||
        view.state?.physics === "pool-phys-v6" ||
        view.state?.physics === "pool-phys-v7"
          ? view.state.physics
          : "pool-phys-v2",
      );
      const paid =
        view.winner_id == null
          ? replay.winner == null
          : (replay.winner === "A" && view.winner_id === view.creator_id) ||
            (replay.winner === "B" && view.winner_id === view.opponent_id);
      const lines = [
        replay.seedOk ? "Seed matches the commitment." : "Seed does not match the commitment.",
        replay.ok && paid
          ? "Replay matches the stored result."
          : "Replay does not match the stored result.",
        replay.winner
          ? `Rules winner: seat ${replay.winner}${replay.reason ? ` (${replay.reason})` : ""}.`
          : "The replay has no winner yet.",
        `Steps checked: ${replay.steps.length}.`,
      ];
      setOut(lines.join("\n"));
    } catch (error) {
      setOut(error instanceof Error ? error.message : "Could not load that match.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-label="8-ball fairness">
      <p className="text-sm text-muted-foreground">
        8-ball is skill plus a published ruleset. The server does not pick who wins. It runs the
        same function a replay runs, so a browser cannot submit pocketed balls or a payout. The only
        random value is the rack, and that seed stays hidden until the match is playing. A timeout
        or a forfeit is the rule for not acting, not a house choice. A live table has no cash-out.
        Ending the match forfeits that seat, and the other player is paid the win. This page proves
        the shot list. It does not reverse a payment. A match checks out under the physics id stored
        with its rack (pool-phys-v1 through pool-phys-v7) and rules pvp-8ball-v1.
      </p>
      <div className="grid gap-4">
        <Card title="Replay a match">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Label className="sr-only" htmlFor="pool-match">
              Match number
            </Label>
            <Input
              id="pool-match"
              inputMode="numeric"
              placeholder="Match number"
              value={id}
              onChange={(event) => setId(event.target.value)}
            />
            <Button type="button" disabled={busy} onClick={() => void run()}>
              {busy ? "Replaying…" : "Replay"}
            </Button>
          </div>
          {out ? (
            <pre className="tabular mt-3 whitespace-pre-wrap break-all rounded-xl bg-background/60 p-3 text-xs">
              {out}
            </pre>
          ) : null}
          <Link
            to="/8-ball-pool"
            className="mt-3 inline-block text-sm font-semibold text-primary hover:underline"
          >
            Open the 8-ball lobby
          </Link>
        </Card>
        <details className="rounded-2xl border border-border bg-card p-4" open>
          <summary className="cursor-pointer font-display text-sm">What is committed</summary>
          <pre className="tabular mt-3 overflow-x-auto text-[11px] leading-relaxed text-muted-foreground">{`rack seed = 32 random bytes, hidden until the match is playing
commitment = SHA-256(rack seed), published when the table opens
rack = Fisher-Yates of balls 1-7 and 9-15; the 8 stays in the centre
shots have no random error

each step is one of:
  shot     angle, power, side, follow, cue placement, called pocket for the 8
  timeout  the seat to act did not shoot before the clock
  forfeit  that seat timed out three times, both seats left on that turn, or a player ended the live match

call a pocket only for the 8
8 on the break wins, unless the cue ball is also scratched
8 before your group is clear loses, including with your last object ball
8 in the wrong pocket, or a scratch on the 8, loses
a foul is ball in hand anywhere; the break is kitchen only
one reconnect window per shot; coming back does not restart the clock
refunds: empty table after 24 hours, start timeout, or both gone before the break

winner = pvp-8ball-v1(rack, steps) under pool-phys-v1
the database rebuilds that rack and each shot before it pays
a self-consistent hash is not a payout
a paid winner that is not that output is not a verified result
a later physics version will not confirm this match`}</pre>
        </details>
      </div>
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

type CheckOut = { ok: boolean; lines: string[] };

function parseId(v: string) {
  const id = Number(v.trim());
  if (!Number.isInteger(id) || id < 1) throw new Error("Enter a game number.");
  return id;
}

async function checkJackpot(v: string): Promise<CheckOut> {
  const id = parseId(v);
  const { data: g, error } = await supabase
    .from("jackpot_games")
    .select(
      "id, status, draw_version, pot_amount, server_seed_hash, server_seed, winning_ticket, winner_id",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("Could not load that game.");
  if (!g) throw new Error("Game not found.");
  if (g.status !== "COMPLETED" || !g.server_seed)
    throw new Error("The seed is revealed once the game has finished.");
  const { data: entries, error: e2 } = await supabase
    .from("jackpot_entries")
    .select("user_id, ticket_start, ticket_end")
    .eq("game_id", id);
  if (e2) throw new Error("Could not load the entries.");
  const r = await verifyGame(g, entries ?? []);
  return {
    ok: r.ok,
    lines: [
      ...r.checks.map((c) => `${c.ok ? "✓" : "✗"} ${c.label}: ${c.detail}`),
      `recorded ticket = ${g.winning_ticket}, winner ${g.winner_id?.slice(0, 8)}...`,
    ],
  };
}

async function checkCoinflip(v: string): Promise<CheckOut> {
  const id = parseId(v);
  const { data: g, error } = await supabase
    .from("coinflip_games")
    .select("id, status, draw_version, server_seed_hash, server_seed, winning_side")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("Could not load that game.");
  if (!g) throw new Error("Game not found.");
  if (g.status !== "COMPLETED" || !g.server_seed)
    throw new Error("The seed is revealed once the game has finished.");
  const r = await verifyCoinflip({
    ...g,
    id: String(g.id),
    winning_side: g.winning_side as CoinSide | null,
  });
  return {
    ok: r.ok,
    lines: [
      ...r.checks.map((c) => `${c.ok ? "✓" : "✗"} ${c.label}: ${c.detail}`),
      `recorded side = ${g.winning_side}`,
    ],
  };
}

function RecordedCheck({
  title,
  id,
  run,
}: {
  title: string;
  id: string;
  run: (v: string) => Promise<CheckOut>;
}) {
  const [v, setV] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<CheckOut | { err: string } | null>(null);
  async function go() {
    setBusy(true);
    try {
      setRes(await run(v));
    } catch (e) {
      setRes({ err: e instanceof Error ? e.message : "Invalid input" });
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card title={title}>
      <div className="grid gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={id}>Game number</Label>
          <Input id={id} value={v} onChange={(e) => setV(e.target.value)} inputMode="numeric" />
        </div>
        <Button onClick={go} disabled={busy} className="w-full min-[420px]:w-fit">
          Verify
        </Button>
        {res &&
          ("err" in res ? (
            <p className="text-xs text-muted-foreground">{res.err}</p>
          ) : (
            <div
              className={cn(
                "rounded-xl border p-3",
                res.ok
                  ? "border-primary/40 bg-primary/10"
                  : "border-destructive/50 bg-destructive/10",
              )}
            >
              <p
                className={cn(
                  "font-display text-sm uppercase tracking-widest",
                  res.ok ? "text-primary" : "text-destructive",
                )}
              >
                {res.ok ? "Verified · match" : "Mismatch · verification failed"}
              </p>
              <pre className="tabular mt-2 whitespace-pre-wrap break-all text-[11px] text-muted-foreground">
                {res.lines.join("\n")}
              </pre>
            </div>
          ))}
        <p className="text-[11px] text-muted-foreground">
          Loads the recorded result from public data and compares it in your browser.
        </p>
      </div>
    </Card>
  );
}
