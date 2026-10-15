import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import type { TableState } from "@/lib/poker/api";
import { deriveEvents, type EventCursor } from "@/lib/poker/events";
import { INITIAL, PokerDirector, type Presentation } from "@/lib/poker/director";
import { duckPokerSfx, playPokerSfx } from "@/lib/poker/audio";
import { getPokerPrefs } from "@/lib/poker/prefs";
import { VoicePriority, VoiceService, WebSpeechProvider } from "@/lib/poker/voice";
import { ClipVoiceProvider } from "@/lib/poker/voice-clips";
import { DEALER_LINES } from "@/lib/poker/dealer-lines";
import { soundMuted } from "@/lib/sound";
import type { FlightLayerHandle } from "./FlightLayer";

let voiceSingleton: VoiceService | null = null;
const provider =
  typeof window !== "undefined" ? new ClipVoiceProvider(new WebSpeechProvider()) : null;

function voiceService() {
  if (!voiceSingleton && provider) {
    if (getPokerPrefs().voice) provider.preload();
    const v = new VoiceService(provider, {
      enabled: () => getPokerPrefs().voice && !soundMuted(),
      volume: () => getPokerPrefs().voiceVolume,
      unlocked: () =>
        typeof navigator === "undefined" ||
        !("userActivation" in navigator) ||
        (navigator as Navigator & { userActivation: { hasBeenActive: boolean } }).userActivation
          .hasBeenActive,
    });
    v.subscribeSpeaking(() => duckPokerSfx(v.isSpeaking() ? 0.4 : 1));
    voiceSingleton = v;
  }
  return voiceSingleton;
}

export const voiceSupported = () => !!provider?.available();

/** Loudness of the dealer's recorded line right now (0..1), or null when none is playing. */
export const dealerMouthLevel = () => provider?.mouthLevel() ?? null;

/**
 * Speaks a line straight from a click handler. Mobile Safari only lets speech start inside a
 * user gesture, so turning the voice on (or moving its slider) speaks right away.
 */
export function previewDealerVoice(text: string = DEALER_LINES.voiceOn) {
  provider?.preload();
  voiceService()?.say({ key: `preview:${Date.now()}`, text, priority: VoicePriority.Important });
}

const noSpeech = () => () => {};
/** Whether the dealer is speaking right now, for her talking motion. */
export function useDealerSpeaking() {
  const v = voiceService();
  return useSyncExternalStore(
    v?.subscribeSpeaking ?? noSpeech,
    v?.isSpeaking ?? (() => false),
    () => false,
  );
}

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
