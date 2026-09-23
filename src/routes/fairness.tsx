import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { drawTicket, hexToBytes, sha256Hex } from "@/lib/jackpot/fairness";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/fairness")({
  head: () => ({
    meta: [
      { title: "Fairness protocol — PVPCasino" },
      { name: "description", content: "How PVPCasino picks jackpot winners: seed commitment, HMAC-SHA256 and unbiased rejection sampling. Verify any game yourself." },
      { property: "og:title", content: "Fairness protocol — PVPCasino" },
      { property: "og:description", content: "Commit/reveal draws with HMAC-SHA256 and unbiased ticket mapping. Verify any game yourself." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
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

function FairnessPage() {
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
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-3xl">Fairness protocol v1</h1>
      <p className="mt-3 text-muted-foreground">
        Every jackpot winner is decided on the server with cryptographic randomness before the wheel spins. The wheel only replays
        a result that is already recorded. Before a round takes entries we publish a hash of a secret seed; once the round ends we
        reveal the seed so anyone can recompute the winner.
      </p>

      <pre className="tabular mt-6 overflow-x-auto rounded-2xl border border-border bg-card p-5 text-xs leading-relaxed">{SPEC}</pre>

      <h2 className="mt-10 font-display text-lg">What this does and doesn't prove</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
        <li>The seed was fixed before any entry: its hash was public from the moment the round opened.</li>
        <li>The draw input has no free parameter: the message is fully determined by the game number and protocol version.</li>
        <li>Ticket mapping is integer-only and unbiased thanks to rejection sampling.</li>
        <li>
          Limitation: the operator generates the seed alone. A future version will mix in an independent randomness source before
          any real-money use.
        </li>
      </ul>

      <h2 className="mt-10 font-display text-lg">Verify a draw</h2>
      <p className="mt-2 text-sm text-muted-foreground">Or open any completed game and press “Verify”.</p>
      <div className="mt-4 grid gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="seed">Revealed server seed (hex)</Label>
          <Input id="seed" value={seed} onChange={(e) => setSeed(e.target.value)} className="tabular" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="gid">Game number</Label>
            <Input id="gid" value={gameId} onChange={(e) => setGameId(e.target.value)} inputMode="numeric" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pot">Final pot in cents</Label>
            <Input id="pot" value={pot} onChange={(e) => setPot(e.target.value)} inputMode="numeric" />
          </div>
        </div>
        <Button onClick={run} className="w-fit">Compute</Button>
        {out && <pre className="tabular whitespace-pre-wrap break-all rounded-xl bg-card p-4 text-xs">{out}</pre>}
      </div>
    </div>
  );
}
