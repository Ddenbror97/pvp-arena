import { X } from "lucide-react";
import { setPokerPrefs } from "@/lib/poker/prefs";
import { setSoundMuted, soundMuted } from "@/lib/sound";
import { DEALER_LINES } from "@/lib/poker/dealer-lines";
import { previewDealerVoice } from "./usePresentation";

/** First-visit table tips. Short, dismissible, shown once per browser. */
export function Onboarding({ onDone }: { onDone: () => void }) {
  const close = (voice: boolean) => {
    setPokerPrefs({ welcomed: true, ...(voice ? { voice: true } : {}) });
    if (voice) {
      // Asking for the voice is asking for sound, even if the site was muted earlier.
      if (soundMuted()) setSoundMuted(false);
      previewDealerVoice(DEALER_LINES.intro);
    }
    onDone();
  };
  return (
    <div
      className="poker-coach"
      role="dialog"
      aria-modal="false"
      aria-labelledby="poker-coach-title"
    >
      <button
        type="button"
        className="poker-coach-x"
        onClick={() => close(false)}
        aria-label="Skip introduction"
      >
        <X className="h-4 w-4" />
      </button>
      <h2 id="poker-coach-title" className="font-display text-sm">
        Welcome to the table
      </h2>
      <ul className="mt-2 space-y-1.5 text-[12.5px] leading-snug text-foreground/85">
        <li>Six-max No-Limit Hold'em. The ring around a player shows their time to act.</li>
        <li>When it's your turn, choose Fold, Check/Call or Raise below. Keys: F, C, R.</li>
        <li>Every deck is provably fair. Open Hands to verify any finished hand.</li>
      </ul>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className="poker-btn poker-btn-raise h-8 flex-1 text-xs"
          onClick={() => close(true)}
        >
          Play with dealer voice
        </button>
        <button
          type="button"
          className="poker-btn poker-btn-fold h-8 flex-1 text-xs"
          onClick={() => close(false)}
        >
          Got it
        </button>
      </div>
    </div>
  );
}
