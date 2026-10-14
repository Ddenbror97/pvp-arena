import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, Spade, Users } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { money, pokerError, pokerSit, useLobby, type LobbyType } from "@/lib/poker/api";
import { newChainHead } from "@/lib/poker/chain";
import { DEALER_IMAGE } from "@/lib/poker/assets";
import { avatarSrc } from "@/lib/avatar";
import { BuyInDialog } from "./BuyInDialog";

const CATEGORIES = ["Micro", "Low", "Mid", "High", "VIP"] as const;

export function PokerLobby() {
  const lobby = useLobby();
  const { userId, needsProfile } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [pick, setPick] = useState<LobbyType | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const data = lobby.data;
  const open = !!data?.enabled && data.types.length > 0;

  const join = async (amount: number) => {
    if (!userId || !pick) return;
    setBusy(true);
    setError(null);
    try {
      const head = await newChainHead(userId);
      const { data: r, error: e } = await pokerSit({
        table: null,
        type: pick.id,
        seat: null,
        buyIn: amount,
        head,
        key: crypto.randomUUID(),
      });
      if (e || !r) return setError(pokerError(e));
      void qc.invalidateQueries({ queryKey: ["wallet"] });
      void navigate({ to: "/poker/$tableId", params: { tableId: String(r.table_id) } });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      <section className="poker-hero">
        <div className="relative z-10 max-w-xl space-y-3">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-primary-soft">
            <Spade className="h-3 w-3" aria-hidden /> Six-max · No-Limit Hold'em
          </p>
          <h1 className="font-display text-3xl leading-tight sm:text-4xl">Poker</h1>
          <p className="text-sm leading-relaxed text-foreground/80 sm:text-base">
            Real players, real cash stacks, a live dealer at every table. Every deck is shuffled
            from all players' seeds and can be verified after the hand.
          </p>
          <ul className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
            <li className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-primary-soft" aria-hidden /> Provably fair
              shuffle
            </li>
            <li>
              {((data?.fee_bps ?? 500) / 100).toLocaleString("en-US")}% rake only when a flop is
              dealt
            </li>
            <li>Deposited cash only</li>
          </ul>
        </div>
        <img src={DEALER_IMAGE} alt="" aria-hidden className="poker-hero-dealer" decoding="async" />
      </section>

      {lobby.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-card" />
          ))}
        </div>
      ) : lobby.isError ? (
        <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          We couldn't load the poker lobby. It'll retry automatically.
        </p>
      ) : !open ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <p className="font-display text-xl">Tables open soon</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Poker isn't open for play yet. Meanwhile, try{" "}
            <Link to="/slott" className="text-primary-soft hover:underline">
              P2P Slott
            </Link>{" "}
            or a{" "}
            <Link to="/coinflip" className="text-primary-soft hover:underline">
              Coinflip
            </Link>
            .
          </p>
        </div>
      ) : (
        CATEGORIES.map((cat) => {
          const types = data!.types.filter((t) => t.category === cat);
          if (!types.length) return null;
          return (
            <section key={cat} className="space-y-3" aria-labelledby={`poker-cat-${cat}`}>
              <h2 id={`poker-cat-${cat}`} className="font-display text-lg">
                {cat} stakes
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {types.map((ty) => {
                  const tables = data!.tables.filter((t) => t.type_id === ty.id && t.seated > 0);
                  return (
                    <article key={ty.id} className="poker-type-card">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-display text-lg tabular-nums">
                            {money(ty.small_blind)}/{money(ty.big_blind)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Buy-in {money(ty.min_buy_in)} – {money(ty.max_buy_in)}
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="h-3.5 w-3.5" aria-hidden />
                          {ty.players} playing
                        </span>
                      </div>
                      {tables.length ? (
                        <ul className="mt-3 space-y-1.5">
                          {tables.slice(0, 3).map((t) => (
                            <li key={t.id}>
                              <Link
                                to="/poker/$tableId"
                                params={{ tableId: String(t.id) }}
                                className="poker-table-row"
                              >
                                <span className="flex -space-x-1.5">
                                  {t.players.slice(0, 4).map((p, i) => (
                                    <img
                                      key={i}
                                      src={avatarSrc(p.avatar_url) ?? undefined}
                                      alt=""
                                      className="h-5 w-5 rounded-full border border-background object-cover"
                                    />
                                  ))}
                                </span>
                                <span className="truncate">{t.name}</span>
                                <span className="ml-auto tabular-nums text-muted-foreground">
                                  {t.seated}/{t.max_seats}
                                </span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-3 text-xs text-muted-foreground">
                          No one seated yet. Open a table.
                        </p>
                      )}
                      {userId ? (
                        <button
                          type="button"
                          className="poker-btn poker-btn-raise mt-4 h-10 w-full"
                          disabled={needsProfile}
                          onClick={() => {
                            setError(null);
                            setPick(ty);
                          }}
                        >
                          Play now
                        </button>
                      ) : (
                        <Link to="/auth" className="poker-btn poker-btn-raise mt-4 h-10 w-full">
                          Sign in to play
                        </Link>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })
      )}

      {pick ? (
        <BuyInDialog
          open
          onOpenChange={(o) => !o && setPick(null)}
          typeId={pick.id}
          title={`${money(pick.small_blind)}/${money(pick.big_blind)} No-Limit Hold'em`}
          min={pick.min_buy_in}
          max={pick.max_buy_in}
          bb={pick.big_blind}
          busy={busy}
          error={error}
          onConfirm={(a) => void join(a)}
        />
      ) : null}
    </div>
  );
}
