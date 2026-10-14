import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import type { TableState } from "@/lib/poker/api";
import { deriveEvents, type EventCursor } from "@/lib/poker/events";
import { INITIAL, PokerDirector, type Presentation } from "@/lib/poker/director";
import { playPokerSfx } from "@/lib/poker/audio";
import { getPokerPrefs } from "@/lib/poker/prefs";
import { VoiceService, WebSpeechProvider } from "@/lib/poker/voice";
import { soundMuted } from "@/lib/sound";
import type { FlightLayerHandle } from "./FlightLayer";

let voiceSingleton: VoiceService | null = null;
const provider = typeof window !== "undefined" ? new WebSpeechProvider() : null;

function voiceService() {
  if (!voiceSingleton && provider)
    voiceSingleton = new VoiceService(provider, {
      enabled: () => getPokerPrefs().voice && !soundMuted(),
      volume: () => getPokerPrefs().voiceVolume,
      unlocked: () =>
        typeof navigator === "undefined" ||
        !("userActivation" in navigator) ||
        (navigator as Navigator & { userActivation: { hasBeenActive: boolean } }).userActivation
          .hasBeenActive,
    });
  return voiceSingleton;
}

export const voiceSupported = () => !!provider?.available();

/**
 * Presentation for one table view. Each authoritative snapshot is diffed into events; the
 * director turns them into the timeline. On mount (or a new table) the current picture is
 * restored without replaying history.
 */
export function usePresentation(
  state: TableState | null | undefined,
  o: { mySeat: number | null; reduced: boolean; names: Map<number, string>; welcome: boolean },
) {
  const flights = useRef<FlightLayerHandle>(null);
  const opts = useRef(o);
  opts.current = o;
  const director = useMemo(
    () =>
      new PokerDirector(
        {
          sfx: playPokerSfx,
          voice: (l) => voiceService()?.say(l),
          dropVoiceBelow: (p) => voiceService()?.dropBelow(p),
          flight: (f) => flights.current?.fly(f),
          cancelFlights: () => flights.current?.cancelAll(),
        },
        {
          fast: () => getPokerPrefs().fast,
          reduced: () => opts.current.reduced,
          mySeat: () => opts.current.mySeat,
          name: (s) => opts.current.names.get(s) ?? `Seat ${s + 1}`,
        },
      ),
    [],
  );
  useEffect(() => () => director.dispose(), [director]);

  const cursor = useRef<EventCursor | null>(null);
  const tableId = useRef<number | null>(null);
  useEffect(() => {
    if (!state) return;
    if (tableId.current !== state.table.id) {
      tableId.current = state.table.id;
      cursor.current = null;
    }
    const r = deriveEvents(cursor.current, state);
    const first = cursor.current === null;
    cursor.current = r.cursor;
    if (first) {
      const h = state.hand ?? state.last_hand;
      const done = h?.status === "COMPLETED";
      director.restore(
        h?.id ?? null,
        h && h.status !== "COMMIT" && h.status !== "VOIDED" ? h.players.map((p) => p.seat_no) : [],
        h?.status === "VOIDED" ? 0 : (h?.board.length ?? 0),
        h?.status === "BETTING",
        done
          ? {
              shown: h!.players.filter((p) => p.shown_cards).map((p) => p.seat_no),
              winners: h!.players
                .filter((p) => (p.won ?? 0) > 0)
                .map((p) => ({ seat: p.seat_no, amount: p.won!, handName: p.hand_name })),
            }
          : undefined,
      );
      if (opts.current.welcome) director.welcome();
      return;
    }
    director.handle(r.events);
  }, [state, director]);

  useEffect(() => () => voiceService()?.cancelAll(), []);

  const pres: Presentation = useSyncExternalStore(
    director.subscribe,
    director.getSnapshot,
    () => INITIAL,
  );
  return { pres, flights, director };
}
