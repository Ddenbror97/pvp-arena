import { useEffect, useMemo, useState } from "react";
import manifest from "@/assets/poker/dealer/manifest.json";
import { Dealer, type DealerPreview } from "@/components/poker/Dealer";
import { DEALER_CLIPS, type DealerClipId } from "@/lib/poker/dealer-clips";
import { loadDealerFrame, preloadDealerFrames } from "@/lib/poker/dealer-frames";
import { cn } from "@/lib/utils";

const CLIPS = Object.keys(DEALER_CLIPS) as DealerClipId[];

/** Poses where a neighbor could not be separated. Shown in the grid, not played on the table. */
const OVERLAP = new Set([
  "deal-03",
  "deal-04",
  "deal-06",
  "deal-reach",
  "shuffle-04",
  "playful-2",
  "thoughtful",
  "celebrate-b2",
  "point-b2",
  "wait-b2",
  "fan-b2",
  "blow-kiss",
]);

/**
 * Dev gallery for the dealer frames. Not linked from the lobby. Production
 * requests 404 before this module is part of the page.
 */
export function DealerGallery() {
  const [clip, setClip] = useState<DealerClipId>("shuffle");
  const [nonce, setNonce] = useState(0);
  const [reduced, setReduced] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [stats, setStats] = useState("Decoding core frames…");
  const preview = useMemo<DealerPreview>(() => ({ clip, nonce }), [clip, nonce]);

  useEffect(() => {
    let gone = false;
    const t0 = performance.now();
    void preloadDealerFrames().then(() => {
      if (gone) return;
      const ms = performance.now() - t0;
      const mem = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
      const heap = mem ? `, heap ${(mem.usedJSHeapSize / 1048576).toFixed(1)} MB` : "";
      setStats(`Core frames decoded in ${ms.toFixed(0)} ms${heap}`);
    });
    return () => {
      gone = true;
    };
  }, []);

  useEffect(() => {
    let gone = false;
    for (const frame of manifest.frames) {
      void loadDealerFrame(frame.id).then((url) => {
        if (!gone) setUrls((cur) => (cur[frame.id] ? cur : { ...cur, [frame.id]: url }));
      });
    }
    return () => {
      gone = true;
    };
  }, []);

  const play = (id: DealerClipId) => {
    setClip(id);
    setNonce((n) => n + 1);
  };

  return (
    <div className="dealer-gallery">
      <h1>Dealer frames</h1>
      <p>
        Ordered poses from the two sheets, on the table felt. These are not consecutive
        frames of one filmed gesture. A half-extended arm between the deck and a full
        reach was not in the art, so the deal steps from the deck to the contact pose.
      </p>
      <div className={cn("dealer-gallery-stage", narrow && "is-narrow")}>
        <Dealer
          pose="idle"
          look={null}
          caption={null}
          className="poker-stage-dealer"
          preview={preview}
          motion={reduced ? "reduced" : "full"}
        />
        {narrow ? (
          <div className="dealer-gallery-actions" aria-hidden>
            <span>Fold</span>
            <span>Call</span>
            <span>Raise</span>
          </div>
        ) : null}
      </div>
      <div className="dealer-gallery-tools">
        <button type="button" data-on={reduced ? "1" : "0"} onClick={() => setReduced((v) => !v)}>
          Reduced motion
        </button>
        <button type="button" data-on={narrow ? "1" : "0"} onClick={() => setNarrow((v) => !v)}>
          390px width
        </button>
        <span>{stats}</span>
      </div>
      <div className="dealer-gallery-bar">
        {CLIPS.map((id) => (
          <button key={id} type="button" data-on={clip === id ? "1" : "0"} onClick={() => play(id)}>
            {id}
          </button>
        ))}
      </div>
      <div className="dealer-gallery-grid">
        {manifest.frames.map((frame) => (
          <figure key={frame.id} className="dealer-gallery-cell">
            {urls[frame.id] ? <img src={urls[frame.id]} alt="" /> : null}
            <figcaption>
              {frame.id} · {frame.sheet}
              {OVERLAP.has(frame.id) ? " · overlap" : ""}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
