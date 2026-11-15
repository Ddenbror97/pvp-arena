import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import { guidePromotion, type GuideContext } from "@/lib/guides/promotions";

const KEY = "pvp-guide-cta-dismissed";

/** Non-modal, dismissible suggestion after 40% scroll; never hides its copy. */
export function GuideScrollCta({ guide }: { guide: GuideContext }) {
  const [open, setOpen] = useState(false);
  const promotion = guidePromotion(guide);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(KEY)) return;
    } catch {
      // Reading a guide still works when browser storage is blocked.
    }
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max > 0 && window.scrollY / max >= 0.4) {
        setOpen(true);
        window.removeEventListener("scroll", onScroll);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const close = () => {
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {
      // Dismiss this card even when persistence is unavailable.
    }
    setOpen(false);
  };

  if (!open) return null;
  return (
    <aside
      aria-label={`${promotion.name} suggestion`}
      data-guide-cta
      className="fixed inset-x-3 bottom-[4.75rem] z-50 mx-auto max-w-md rounded-xl border border-primary/30 bg-card/95 p-3 shadow-lg backdrop-blur-sm sm:inset-x-auto sm:right-4 sm:mx-0 sm:w-96 lg:bottom-4"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-primary">{promotion.name}</p>
          <p className="mt-1 whitespace-normal break-words text-sm leading-relaxed text-foreground">
            {promotion.hook}
          </p>
        </div>
        <button
          type="button"
          onClick={close}
          aria-label="Dismiss game suggestion"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <Link
        to={promotion.to}
        onClick={close}
        preload="intent"
        className="mt-2 inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90"
      >
        {promotion.label}
      </Link>
    </aside>
  );
}
