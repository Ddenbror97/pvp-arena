import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { queryOptions, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import {
  cosmeticRows,
  fetchIdentities,
  fetchPrestigeState,
  identityQueryKey,
  type PrestigeIdentity,
  type PrestigeState,
} from "@/lib/prestige/api";
import { LevelUpAnimation } from "./LevelUpAnimation";

type Ctx = {
  state: PrestigeState | undefined;
  loading: boolean;
  error: unknown;
  reload: () => void;
  wantGuestState: () => () => void;
};

const PrestigeCtx = createContext<Ctx | null>(null);

export const prestigeQuery = (userId: string | null) =>
  queryOptions({ queryKey: ["prestige", userId], queryFn: fetchPrestigeState, staleTime: 15_000 });

export function PrestigeProvider({ children }: { children: ReactNode }) {
  const { ready, userId, profile } = useAuth();
  const qc = useQueryClient();
  // Signed-out visitors only need the state on the Prestige page, which asks for it.
  const [guestDemand, setGuestDemand] = useState(0);
  const wantGuestState = useCallback(() => {
    setGuestDemand((n) => n + 1);
    return () => setGuestDemand((n) => n - 1);
  }, []);
  // Wait for the session: fetching earlier returns the signed-out state, which a
  // signed-in visitor would see swap to a skeleton and then to their own page.
  const q = useQuery({
    ...prestigeQuery(userId),
    // userId comes straight from the session, so a signed-in visitor never asks for the guest state.
    enabled: !!userId || (ready && guestDemand > 0),
    refetchInterval: userId ? 20_000 : false,
    retry: 1,
  });
  const seen = useRef<number | null>(null);
  const [rise, setRise] = useState<{ from: number; to: number } | null>(null);

  useEffect(() => {
    seen.current = null;
    setRise(null);
  }, [userId]);

  useEffect(() => {
    const level = q.data?.level;
    if (!userId || level == null) return;
    if (seen.current == null) {
      seen.current = level;
      return;
    }
    if (level > seen.current) setRise({ from: seen.current, to: level });
    seen.current = level;
  }, [q.data?.level, userId]);

  const value = useMemo<Ctx>(
    () => ({
      state: q.data,
      loading: q.isPending,
      error: q.error,
      reload: () => void q.refetch(),
      wantGuestState,
    }),
    [ready, q.data, q.isPending, q.error, q.refetch, wantGuestState],
  );

  const unlocks =
    rise && q.data ? q.data.levels.filter((l) => l.level > rise.from && l.level <= rise.to) : [];
  const { frame, crown } = equippedAssets(q.data);

  return (
    <PrestigeCtx.Provider value={value}>
      {children}
      {rise && q.data ? (
        <LevelUpAnimation
          from={rise.from}
          to={rise.to}
          tier={q.data.tier}
          unlocks={unlocks}
          avatar={profile?.avatar_url}
          name={profile?.username}
          frame={frame}
          crown={crown}
          onDone={() => {
            setRise(null);
            void qc.invalidateQueries({ queryKey: ["prestige-identities"] });
          }}
        />
      ) : null}
    </PrestigeCtx.Provider>
  );
}

export function usePrestige(opts?: { guest?: boolean }) {
  const ctx = useContext(PrestigeCtx);
  if (!ctx) throw new Error("PrestigeProvider missing");
  const guest = !!opts?.guest;
  const want = ctx.wantGuestState;
  useEffect(() => (guest ? want() : undefined), [guest, want]);
  return ctx;
}

/** Put server-fetched frames into the cache before the lists render, once per key. */
export function useSeedIdentities(
  groups: string[][],
  hit: { ids: string[]; rows: PrestigeIdentity[] } | null,
) {
  const qc = useQueryClient();
  if (!hit) return;
  const requested = new Set(hit.ids);
  for (const ids of groups) {
    const key = identityQueryKey(ids);
    if (!key.length || !key.every((id) => requested.has(id))) continue;
    const qk = ["prestige-identities", key] as const;
    if (qc.getQueryData(qk) !== undefined) continue;
    const want = new Set(key);
    qc.setQueryData(
      qk,
      hit.rows.filter((row) => want.has(row.user_id)),
    );
  }
}

/**
 * Frames already fetched for these players, even when they were stored under a
 * wider list key. A duel asks for two ids; the lobby stored them with the chat.
 */
export function identityRowsOnHand(qc: QueryClient, ids: string[]): PrestigeIdentity[] | undefined {
  if (!ids.length) return undefined;
  const want = new Set(ids);
  const found = new Map<string, PrestigeIdentity>();
  for (const [, rows] of qc.getQueriesData<PrestigeIdentity[]>({
    queryKey: ["prestige-identities"],
  })) {
    if (!rows) continue;
    for (const row of rows) {
      if (want.has(row.user_id)) found.set(row.user_id, row);
    }
  }
  if (found.size === 0) return undefined;
  return ids.flatMap((id) => {
    const row = found.get(id);
    return row ? [row] : [];
  });
}

export function usePrestigeIdentities(ids: string[]) {
  const qc = useQueryClient();
  const key = identityQueryKey(ids);
  const q = useQuery({
    queryKey: ["prestige-identities", key],
    queryFn: () => fetchIdentities(key),
    enabled: key.length > 0,
    staleTime: 30_000,
    placeholderData: () => identityRowsOnHand(qc, key),
  });
  const map = useMemo(() => {
    const m = new Map<string, PrestigeIdentity>();
    for (const row of q.data ?? []) m.set(row.user_id, row);
    return m;
  }, [q.data]);
  return map;
}

export function equippedAssets(state: PrestigeState | undefined) {
  const rows = state ? cosmeticRows(state) : [];
  return {
    frame:
      rows.find((l) => l.cosmetic_id && l.cosmetic_id === state?.equipped_frame)?.asset_key ?? null,
    crown:
      rows.find((l) => l.cosmetic_id && l.cosmetic_id === state?.equipped_crown)?.asset_key ?? null,
  };
}
