import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Crown,
  Eye,
  Percent,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Spade,
  Users,
  Zap,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  money,
  pokerError,
  pokerSit,
  useLobby,
  type Lobby,
  type LobbyTable,
  type LobbyType,
} from "@/lib/poker/api";
import { newChainHead } from "@/lib/poker/chain";
import { DEALER_IMAGE, DEALER_SIZE } from "@/lib/poker/assets";
import {
  CATEGORIES,
  DEFAULT_FILTERS,
  SORTS,
  blindRange,
  blinds,
  pickFeatured,
  seatOptions,
  sections,
  tableFull,
  type Availability,
  type Category,
  type Listing,
  type LobbyFilters,
  type SortKey,
} from "@/lib/poker/lobby-view";
import { cn } from "@/lib/utils";
import { BuyInDialog } from "./BuyInDialog";

type Pick = { type: LobbyType; table: LobbyTable | null };

const TABLES_ID = "poker-tables";

function findTables() {
  const el = document.getElementById(TABLES_ID);
  el?.scrollIntoView({ behavior: "smooth", block: "start" });
  document.getElementById("poker-search")?.focus({ preventScroll: true });
}

export function PokerLobby() {
  const lobby = useLobby();
  const auth = useAuth();
  // Auth state is client-only; defer it until after hydration to keep SSR markup identical.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const userId = mounted ? auth.userId : null;
  const needsProfile = mounted && auth.needsProfile;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [filters, setFilters] = useState<LobbyFilters>(DEFAULT_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [pick, setPick] = useState<Pick | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const data = lobby.data;
  const open = !!data?.enabled && data.types.length > 0;
  const groups = useMemo(
    () => (data && open ? sections(data, filters) : []),
    [data, open, filters],
  );
  const featured = useMemo(() => (data && open ? pickFeatured(data) : null), [data, open]);
  const visible = groups.reduce((n, g) => n + g.items.length, 0);
  const set = (patch: Partial<LobbyFilters>) => setFilters((f) => ({ ...f, ...patch }));
  useEffect(() => {
    if (!filtersOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setFiltersOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filtersOpen]);
  const filtered =
    filters.category !== null ||
    filters.seats !== null ||
    filters.availability !== "all" ||
    filters.search.trim() !== "";

  const choose = (type: LobbyType, table: LobbyTable | null) => {
    setError(null);
    setPick({ type, table });
  };

  const join = async (amount: number) => {
    if (!userId || !pick) return;
    setBusy(true);
    setError(null);
    try {
      const head = await newChainHead(userId);
      const { data: r, error: e } = await pokerSit({
        table: pick.table?.id ?? null,
        type: pick.table ? null : pick.type.id,
        seat: null,
        buyIn: amount,
        head,
        key: crypto.randomUUID(),
      });
      if (e || !r) {
        void qc.invalidateQueries({ queryKey: ["poker-lobby"] });
        return setError(pokerError(e));
      }
      void qc.invalidateQueries({ queryKey: ["wallet"] });
      void navigate({ to: "/poker/$tableId", params: { tableId: String(r.table_id) } });
    } finally {
      setBusy(false);
    }
  };

  const act = { userId, needsProfile, choose };

  return (
    <div className="poker-lobby">
      <Hero lobby={data} />

      {userId && data?.mine?.length ? (
        <div className="mx-auto mt-4 flex max-w-6xl flex-col gap-2 px-4" role="status">
          {data.mine.map((s) => (
            <Link
              key={s.table_id}
              to="/poker/$tableId"
              params={{ tableId: String(s.table_id) }}
              className="flex items-center justify-between gap-3 rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-50 hover:bg-emerald-500/20"
            >
              <span>
                You still have a seat at <strong>{s.name}</strong> with {money(s.stack)}
                {s.state === "SITTING_OUT" ? " (sitting out)" : ""}.
              </span>
              <span className="inline-flex items-center gap-1 font-semibold">
                Return to table <ArrowRight className="h-4 w-4" aria-hidden />
              </span>
            </Link>
          ))}
        </div>
      ) : null}

      <div className="poker-lobby-body">
        {filtersOpen ? (
          <div
            className="poker-filters-backdrop lg:hidden"
            aria-hidden
            onClick={() => setFiltersOpen(false)}
          />
        ) : null}
        <aside
          id="poker-filters"
          className={cn("poker-filters", filtersOpen && "is-open")}
          aria-label="Filter tables"
        >
          <Filters
            lobby={data}
            filters={filters}
            set={set}
            reset={() => setFilters(DEFAULT_FILTERS)}
          />
          <span className="lg:hidden">
            <button
              type="button"
              className="poker-btn poker-btn-call is-md poker-filters-done"
              onClick={() => setFiltersOpen(false)}
            >
              Show {visible} {visible === 1 ? "result" : "results"}
            </button>
          </span>
        </aside>

        <div className="min-w-0 space-y-5">
          <div className="poker-lobby-top">
            <Featured loading={lobby.isLoading} open={open} featured={featured} {...act} />
            <div className="poker-toolbar" role="search">
              <label className="poker-search">
                <Search className="h-4 w-4 shrink-0 text-[var(--ink-muted)]" aria-hidden />
                <input
                  id="poker-search"
                  type="search"
                  placeholder="Search tables…"
                  aria-label="Search tables"
                  value={filters.search}
                  onChange={(e) => set({ search: e.target.value })}
                />
              </label>
              <span className="lg:hidden">
                <button
                  type="button"
                  className="poker-lobby-chip"
                  aria-expanded={filtersOpen}
                  aria-controls="poker-filters"
                  onClick={() => setFiltersOpen((o) => !o)}
                >
                  <SlidersHorizontal className="h-4 w-4" aria-hidden />
                  Filters
                  {filtered ? <span className="poker-lobby-dot" aria-label="active" /> : null}
                </button>
              </span>
              <label className="poker-sort">
                <span className="sr-only">Sort tables</span>
                <span aria-hidden className="text-[var(--ink-muted)]">
                  Sort by:
                </span>
                <select
                  value={filters.sort}
                  onChange={(e) => set({ sort: e.target.value as SortKey })}
                >
                  {SORTS.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div id={TABLES_ID} className="poker-sections scroll-mt-20">
            {lobby.isLoading ? (
              <ListSkeleton />
            ) : lobby.isError ? (
              <p className="poker-lobby-note" role="alert">
                We couldn't load the poker lobby. It'll retry automatically.
              </p>
            ) : !open ? (
              <div className="poker-lobby-note text-center">
                <p className="font-display text-xl text-[var(--ink)]">Tables open soon</p>
                <p className="mx-auto mt-2 max-w-md text-sm">
                  Poker isn't open for play yet. Meanwhile, try{" "}
                  <Link to="/slott" className="text-[var(--neon-hot)] hover:underline">
                    P2P Slott
                  </Link>{" "}
                  or a{" "}
                  <Link to="/coinflip" className="text-[var(--neon-hot)] hover:underline">
                    Coinflip
                  </Link>
                  .
                </p>
              </div>
            ) : groups.length === 0 ? (
              <div className="poker-lobby-note text-center">
                <p className="font-display text-lg text-[var(--ink)]">No tables match</p>
                <p className="mt-1 text-sm">Try another stake level or clear your search.</p>
                <button
                  type="button"
                  className="poker-btn poker-btn-fold is-sm mt-4"
                  onClick={() => setFilters(DEFAULT_FILTERS)}
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="poker-section-grid">
                {groups.map((g) => (
                  <section key={g.category} aria-labelledby={`poker-cat-${g.category}`}>
                    <div className="poker-section-head">
                      <h2 id={`poker-cat-${g.category}`}>{g.category} Stakes</h2>
                      <p>
                        <span className="hidden sm:inline">Blinds {blindRange(g.types)}</span>
                        {g.live ? (
                          <span className="poker-pill is-live">
                            Live · {g.live} {g.live === 1 ? "table" : "tables"}
                          </span>
                        ) : null}
                      </p>
                    </div>
                    <div className="poker-card-grid">
                      {g.items.map((l) => (
                        <TableCard key={l.key} listing={l} {...act} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {pick ? (
        <BuyInDialog
          open
          onOpenChange={(o) => !o && setPick(null)}
          typeId={pick.type.id}
          title={`${pick.table ? `${pick.table.name} · ` : ""}${blinds(pick.type)} No-Limit Hold'em`}
          min={pick.type.min_buy_in}
          max={pick.type.max_buy_in}
          bb={pick.type.big_blind}
          busy={busy}
          error={error}
          onConfirm={(a) => void join(a)}
        />
      ) : null}
    </div>
  );
}

function Hero({ lobby }: { lobby: Lobby | undefined }) {
  const seats = lobby ? seatOptions(lobby) : [];
  return (
    <section className="poker-hero" aria-labelledby="poker-title">
      <div className="poker-hero-copy">
        <h1 id="poker-title" className="poker-hero-title">
          <Spade className="poker-hero-spade" aria-hidden />
          <span className="poker-hero-word">Poker</span>
        </h1>
        <p className="poker-hero-modes">
          Texas Hold'em <span aria-hidden>•</span> No-Limit
          {seats.length ? (
            <>
              {" "}
              <span aria-hidden>•</span> {seats.map((s) => `${s}-Max`).join(" / ")}
            </>
          ) : null}
        </p>
        <p className="poker-hero-sub">Real players. Real action. Big wins.</p>
        <button
          type="button"
          className="poker-btn poker-btn-call poker-hero-cta"
          onClick={findTables}
        >
          Find Your Table <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="poker-hero-art" aria-hidden>
        <div className="poker-hero-cards">
          <span className="poker-hero-card is-back">
            <b>A</b>
            <i>♠</i>
          </span>
          <span className="poker-hero-card is-front">
            <b>A</b>
            <i>♥</i>
          </span>
        </div>
        <span className="poker-hero-chips is-left" />
        <span className="poker-hero-chips is-right" />
        <img
          src={DEALER_IMAGE}
          alt=""
          width={DEALER_SIZE.w}
          height={DEALER_SIZE.h}
          fetchPriority="high"
          className="poker-hero-dealer"
        />
      </div>

      <div className="poker-hero-panel">
        <p className="poker-hero-panel-title">
          Play <span aria-hidden>•</span> Win <span aria-hidden>•</span> Repeat
        </p>
        <ul>
          <HeroFeature icon={<Zap />} title="Fast action">
            {lobby ? `${lobby.action_seconds}s` : "Timed"} turns
          </HeroFeature>
          <HeroFeature icon={<ShieldCheck />} title="Provably fair">
            Verifiable shuffle
          </HeroFeature>
          <HeroFeature icon={<Percent />} title="Fair rake">
            {((lobby?.fee_bps ?? 500) / 100).toLocaleString("en-US")}% only after a flop
          </HeroFeature>
        </ul>
      </div>
    </section>
  );
}

function HeroFeature({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <li>
      <span className="poker-hero-icon">{icon}</span>
      <span className="poker-hero-feature-title">{title}</span>
      <span className="poker-hero-feature-sub">{children}</span>
    </li>
  );
}

function Filters({
  lobby,
  filters,
  set,
  reset,
}: {
  lobby: Lobby | undefined;
  filters: LobbyFilters;
  set: (p: Partial<LobbyFilters>) => void;
  reset: () => void;
}) {
  const types = lobby?.types ?? [];
  const cats = CATEGORIES.filter((c) => types.some((t) => t.category === c));
  const seats = lobby ? seatOptions(lobby) : [];
  const dirty =
    filters.category !== null || filters.seats !== null || filters.availability !== "all";
  return (
    <div className="poker-filters-inner">
      <div className="flex items-center justify-between">
        <p className="poker-filters-title">
          <SlidersHorizontal className="h-4 w-4" aria-hidden /> Filter tables
        </p>
        {dirty ? (
          <button type="button" className="poker-filters-reset" onClick={reset}>
            Reset
          </button>
        ) : null}
      </div>

      <FilterGroup legend="Stakes">
        <Radio
          name="stakes"
          checked={filters.category === null}
          onChange={() => set({ category: null })}
          label="All Stakes"
        />
        {cats.map((c: Category) => (
          <Radio
            key={c}
            name="stakes"
            checked={filters.category === c}
            onChange={() => set({ category: c })}
            label={c}
            hint={blindRange(types.filter((t) => t.category === c))}
          />
        ))}
      </FilterGroup>

      <FilterGroup legend="Game type">
        <Radio name="game" checked readOnly label="Texas Hold'em" hint="No-Limit" />
      </FilterGroup>

      {seats.length > 1 ? (
        <FilterGroup legend="Seats">
          <Radio
            name="seats"
            checked={filters.seats === null}
            onChange={() => set({ seats: null })}
            label="All tables"
          />
          {seats.map((s) => (
            <Radio
              key={s}
              name="seats"
              checked={filters.seats === s}
              onChange={() => set({ seats: s })}
              label={`${s}-Max`}
            />
          ))}
        </FilterGroup>
      ) : seats.length === 1 ? (
        <FilterGroup legend="Seats">
          <Radio name="seats" checked readOnly label={`${seats[0]}-Max`} />
        </FilterGroup>
      ) : null}

      <FilterGroup legend="Availability">
        {(
          [
            ["all", "All tables"],
            ["open", "Seats open"],
            ["running", "Running now"],
          ] as [Availability, string][]
        ).map(([key, label]) => (
          <Radio
            key={key}
            name="availability"
            checked={filters.availability === key}
            onChange={() => set({ availability: key })}
            label={label}
          />
        ))}
      </FilterGroup>
    </div>
  );
}

function FilterGroup({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className="poker-filter-group">
      <legend>{legend}</legend>
      <div className="space-y-1">{children}</div>
    </fieldset>
  );
}

function Radio({
  name,
  checked,
  onChange,
  label,
  hint,
  readOnly,
}: {
  name: string;
  checked: boolean;
  onChange?: () => void;
  label: string;
  hint?: string;
  readOnly?: boolean;
}) {
  return (
    <label className={cn("poker-radio", checked && "is-checked", readOnly && "is-static")}>
      <input
        type="radio"
        name={name}
        className="sr-only"
        checked={checked}
        readOnly={readOnly}
        disabled={readOnly}
        onChange={() => onChange?.()}
      />
      <span className="poker-radio-dot" aria-hidden />
      <span className="poker-radio-label">{label}</span>
      {hint ? <span className="poker-radio-hint">{hint}</span> : null}
    </label>
  );
}

type Act = {
  userId: string | null;
  needsProfile: boolean;
  choose: (type: LobbyType, table: LobbyTable | null) => void;
};

function SeatButton({
  type,
  table,
  label,
  userId,
  needsProfile,
  choose,
  className,
}: Act & { type: LobbyType; table: LobbyTable | null; label: string; className?: string }) {
  if (!userId) {
    return (
      <Link to="/auth" className={cn("poker-btn poker-btn-raise", className)}>
        Sign in
      </Link>
    );
  }
  return (
    <button
      type="button"
      className={cn("poker-btn poker-btn-raise", className)}
      disabled={needsProfile}
      title={needsProfile ? "Finish your profile to play" : undefined}
      onClick={() => choose(type, table)}
    >
      {label}
    </button>
  );
}

function Featured({
  loading,
  open,
  featured,
  ...act
}: Act & {
  loading: boolean;
  open: boolean;
  featured: { table: LobbyTable; type: LobbyType } | null;
}) {
  if (loading) return <div className="poker-featured is-skeleton" aria-hidden />;
  if (!open) return null;
  if (!featured) {
    return (
      <div className="poker-featured is-empty">
        <span className="poker-featured-crown" aria-hidden>
          <Crown className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="poker-featured-badge">Featured table</p>
          <p className="font-display text-[0.95rem] leading-tight text-[var(--ink)]">
            No table is running right now
          </p>
          <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
            Take the first seat at any stake and the table opens.
          </p>
        </div>
      </div>
    );
  }
  const { table, type } = featured;
  return (
    <div className="poker-featured">
      <span className="poker-featured-crown" aria-hidden>
        <Crown className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p
          className="poker-featured-badge"
          title="The running table with the most players and a free seat"
        >
          Featured table
        </p>
        <p className="truncate font-display text-[0.95rem] text-[var(--ink)]">{table.name}</p>
        <p className="flex flex-wrap items-center gap-x-3 text-xs text-[var(--ink-muted)]">
          <span className="tabular-nums">{blinds(type)}</span>
          <span>{table.max_seats}-Max</span>
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Users className="h-3.5 w-3.5" aria-hidden />
            {table.seated}/{table.max_seats}
          </span>
        </p>
      </div>
      <span className="hidden sm:block">
        <TableArt seats={table.max_seats} filled={table.seated} />
      </span>
      <SeatButton {...act} type={type} table={table} label="Play Now" className="is-md shrink-0" />
    </div>
  );
}

function TableCard({ listing, ...act }: Act & { listing: Listing }) {
  const { type } = listing;
  const table = listing.kind === "table" ? listing.table : null;
  const full = table ? tableFull(table) : false;
  return (
    <article className={cn("poker-tcard", full && "is-full")}>
      <TableArt seats={table?.max_seats ?? type.max_seats} filled={table?.seated ?? 0} />
      <div className="min-w-0 flex-1">
        <p className="poker-tcard-name">
          {table ? (
            <Link
              to="/poker/$tableId"
              params={{ tableId: String(table.id) }}
              className="hover:underline"
            >
              {table.name}
            </Link>
          ) : (
            "Quick seat"
          )}
        </p>
        <p className="poker-tcard-blinds">{blinds(type)}</p>
        <p className="poker-tcard-meta">
          Buy-in {money(type.min_buy_in)} – {money(type.max_buy_in)}
        </p>
        <p className="poker-tcard-meta inline-flex items-center gap-1">
          <Users className="h-3.5 w-3.5" aria-hidden />
          {table ? (
            <span className="tabular-nums">
              {table.seated}/{table.max_seats}
            </span>
          ) : (
            <span className="tabular-nums">{type.players} playing</span>
          )}
        </p>
      </div>
      <div className="poker-tcard-actions">
        {table ? (
          full ? (
            <span className="poker-pill is-full">Full</span>
          ) : table.live ? (
            <span className="poker-pill is-live">Live</span>
          ) : (
            <span className="poker-pill">Waiting</span>
          )
        ) : (
          <span className="poker-pill">
            {listing.kind === "stake" && listing.running ? `${listing.running} running` : "Open"}
          </span>
        )}
        {table && full ? (
          <Link
            to="/poker/$tableId"
            params={{ tableId: String(table.id) }}
            className="poker-btn poker-btn-fold is-sm"
          >
            <Eye className="h-3.5 w-3.5" aria-hidden /> Watch
          </Link>
        ) : (
          <SeatButton
            {...act}
            type={type}
            table={table}
            label={table ? "Join Table" : "Play Now"}
            className="is-sm"
          />
        )}
      </div>
    </article>
  );
}

/** Decorative neon table; seat markers show the real seated count. */
function TableArt({
  seats,
  filled,
  className,
}: {
  seats: number;
  filled: number;
  className?: string;
}) {
  return (
    <span className={cn("poker-tart", className)} aria-hidden>
      <span className="poker-tart-felt">
        <span>PVP</span>
      </span>
      {Array.from({ length: seats }, (_, i) => {
        const a = (i / seats) * Math.PI * 2 + Math.PI / 2;
        return (
          <span
            key={i}
            className={cn("poker-tart-seat", i < filled && "is-filled")}
            style={{
              left: `${(50 + Math.cos(a) * 47).toFixed(2)}%`,
              top: `${(50 + Math.sin(a) * 44).toFixed(2)}%`,
            }}
          />
        );
      })}
    </span>
  );
}

function ListSkeleton() {
  return (
    <div className="poker-section-grid" aria-busy="true" aria-label="Loading tables">
      {[0, 1].map((s) => (
        <div key={s}>
          <div className="poker-section-head">
            <span className="h-5 w-32 animate-pulse rounded bg-white/5" />
          </div>
          <div className="poker-card-grid">
            {[0, 1].map((i) => (
              <div key={i} className="poker-tcard is-skeleton" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
