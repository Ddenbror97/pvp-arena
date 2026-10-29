export const SLOT_FRESH_MS = 8_000;

const liveStatus = (status: string | undefined) => status === "ACTIVE" || status === "SETTLEMENT";

export type SlotFeedRow = {
  id?: number;
  status?: string;
  next_spin?: number;
  ends_at?: string | null;
};

/**
 * A live spin updates one match. Open and live lists change when a table is
 * created, joined, finished, or cancelled.
 */
export function slotFeedTargets(row: SlotFeedRow): {
  open: boolean;
  live: boolean;
  recent: boolean;
  mine: boolean;
} {
  const status = row.status;
  const endsKnown = row.ends_at === null || typeof row.ends_at === "string";
  const spinning =
    status === "ACTIVE" &&
    endsKnown &&
    row.ends_at == null &&
    typeof row.next_spin === "number" &&
    row.next_spin > 1;
  if (spinning) return { open: false, live: false, recent: false, mine: false };
  const listed = status === "WAITING" || status === "ACTIVE" || status === "CANCELLED";
  return {
    open: listed,
    live:
      status === "ACTIVE" ||
      status === "SETTLEMENT" ||
      status === "COMPLETED" ||
      status === "CANCELLED",
    recent: status === "COMPLETED" || status === "CANCELLED",
    mine:
      status === "WAITING" ||
      status === "ACTIVE" ||
      status === "SETTLEMENT" ||
      status === "COMPLETED" ||
      status === "CANCELLED",
  };
}

/**
 * Match polls while a broadcast for this game is fresh are a safety net.
 * A quiet or disconnected channel keeps the tighter interval.
 */
export function slotRefetchMs(input: {
  kind: "game" | "spins" | "bonus";
  status: string | undefined;
  channelUp: boolean;
  fresh: boolean;
}): number | false {
  if (input.kind === "game" && input.status === "WAITING") return input.channelUp ? 8_000 : 4_000;
  if (!liveStatus(input.status)) return false;
  if (!input.channelUp) return input.kind === "bonus" ? 3_000 : 1_500;
  if (input.fresh) return input.kind === "bonus" ? 20_000 : 12_000;
  return input.kind === "bonus" ? 8_000 : 4_000;
}
