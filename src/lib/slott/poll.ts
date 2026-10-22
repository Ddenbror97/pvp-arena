export const SLOT_FRESH_MS = 8_000;

const liveStatus = (status: string | undefined) => status === "ACTIVE" || status === "SETTLEMENT";

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
