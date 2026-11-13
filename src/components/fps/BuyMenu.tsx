import { useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Check, Wrench } from "lucide-react";
import type { BuyItem } from "@/lib/fps/buy";
import type { Primary } from "@/lib/fps/primary";
import { DEAGLE } from "@/lib/fps/sidearm";
import "./buy-menu.css";

/** One sector of the wheel: a weapon (or the defuse kit) with its key and readout. */
type Sector = {
  id: BuyItem | "kit";
  key: string;
  name: string;
  /** `/fps/br/icons/<icon>.webp`; none draws the kit's wrench. */
  icon?: string;
  /** Equipped / carried right now. */
  current: boolean;
  disabled: boolean;
  /** The centre's line when this sector is equipped or unavailable. */
  note?: string | undefined;
  pistol?: boolean;
};

const OUTER = 49; // % of the wheel
const INNER = 21;
const GAP_DEG = 1.4;

/** An annular wedge as a CSS polygon in % of the square wheel (clips the button and its hit area). */
function wedge(from: number, to: number) {
  const pts: string[] = [];
  const steps = Math.max(6, Math.ceil((to - from) / 4));
  const at = (r: number, deg: number) => {
    const a = (deg * Math.PI) / 180;
    return `${(50 + r * Math.cos(a)).toFixed(2)}% ${(50 + r * Math.sin(a)).toFixed(2)}%`;
  };
  for (let i = 0; i <= steps; i++) pts.push(at(OUTER, from + ((to - from) * i) / steps));
  for (let i = steps; i >= 0; i--) pts.push(at(INNER, from + ((to - from) * i) / steps));
  return `polygon(${pts.join(", ")})`;
}

const KEYS: Record<string, string> = {};
for (let i = 1; i <= 7; i++) {
  KEYS[`Digit${i}`] = String(i);
  KEYS[`Numpad${i}`] = String(i);
}

/**
 * The buy wheel (owner, 2026-11-13: "a modern clean wheel"): every free weapon as a sector of a
 * radial menu, its render, name and key; the centre reads out the pointed-at sector. Click a
 * sector or press its digit. Free equipment in both current game modes; the server enforces the
 * round's buy window.
 */
export function BuyMenu({
  open,
  side,
  current,
  status,
  onBuy,
  onClose,
  kit = null,
  sidearm = null,
}: {
  open: boolean;
  side: "police" | "terrorist";
  current: Primary;
  status: string | null;
  onBuy: (item: BuyItem) => void;
  onClose: () => void;
  /** 5v5: the Desert Eagle for the sidearm slot (1v1 players always carry one). */
  sidearm?: { carried: boolean } | null;
  kit?: {
    available: boolean;
    equipped: boolean;
    pending: boolean;
    error?: string | null;
    onEquip: () => void;
  } | null;
}) {
  const busy = !!status;
  const sectors = useMemo<Sector[]>(() => {
    const out: Sector[] = [
      {
        id: "rifle",
        key: "1",
        name: side === "police" ? "M4A1-S" : "AK-47",
        icon: side === "police" ? "m4" : "ak47",
        current: current === "rifle",
        disabled: busy,
      },
      {
        id: "awp",
        key: "2",
        name: "AWP",
        icon: "awp",
        current: current === "awp",
        disabled: busy,
      },
      {
        id: "mp5",
        key: "3",
        name: "MP5",
        icon: "mp5",
        current: current === "mp5",
        disabled: busy,
      },
      {
        id: "hunting",
        key: "4",
        name: "Hunting Rifle",
        icon: "hunting",
        current: current === "hunting",
        disabled: busy,
      },
      {
        id: "spas12",
        key: "5",
        name: "SPAS-12",
        icon: "spas12",
        current: current === "spas12",
        disabled: busy,
      },
    ];
    if (sidearm)
      out.push({
        id: "deagle",
        key: "6",
        name: DEAGLE.name,
        icon: "deagle",
        current: sidearm.carried,
        disabled: busy,
        pistol: true,
      });
    if (kit)
      out.push({
        id: "kit",
        key: "7",
        name: "Defuse kit",
        current: kit.equipped,
        disabled: !kit.available || kit.equipped || kit.pending,
        note: kit.equipped
          ? "Equipped"
          : kit.pending
            ? "Equipping…"
            : kit.available
              ? undefined
              : "Available before the round",
      });
    return out;
  }, [side, current, busy, sidearm, kit]);

  const [hover, setHover] = useState<string | null>(null);
  useEffect(() => {
    if (!open) setHover(null);
  }, [open]);

  const choose = (s: Sector) => {
    if (s.disabled) return;
    if (s.id === "kit") kit?.onEquip();
    else onBuy(s.id);
  };

  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const digit = KEYS[e.code];
      if (e.code !== "KeyB" && !digit) return;
      // Consume loadout shortcuts before the arena's weapon-switch / menu listeners see them.
      e.preventDefault();
      e.stopPropagation();
      if (e.code === "KeyB") return onClose();
      const s = sectors.find((x) => x.key === digit);
      if (s) choose(s);
    };
    document.addEventListener("keydown", key, true);
    return () => document.removeEventListener("keydown", key, true);
    // `choose` only reads `sectors`, `kit` and `onBuy`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sectors, onClose, onBuy, kit]);

  const n = sectors.length;
  const span = 360 / n;
  const shown =
    sectors.find((s) => s.id === hover) ?? sectors.find((s) => s.current && s.id !== "kit");

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Dialog.Portal
        container={
          typeof document === "undefined" ? undefined : (document.fullscreenElement ?? undefined)
        }
      >
        <Dialog.Overlay className="buy-menu-backdrop" />
        <Dialog.Content
          className="buy-menu"
          aria-label="Buy menu"
          // Focus the wheel itself, not its first sector (that would light up as pointed at).
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            (e.currentTarget as HTMLElement | null)?.focus();
          }}
          onCloseAutoFocus={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }}
        >
          <Dialog.Title className="buy-menu-sr">Buy menu</Dialog.Title>
          <Dialog.Description className="buy-menu-sr">
            Click a weapon or press its number key. B or Esc closes.
          </Dialog.Description>
          <div className="buy-wheel" onPointerLeave={() => setHover(null)}>
            <div className="buy-wheel-ring" aria-hidden />
            {sectors.map((s, i) => {
              const mid = -90 + i * span;
              const from = mid - span / 2 + GAP_DEG / 2;
              const to = mid + span / 2 - GAP_DEG / 2;
              const a = (mid * Math.PI) / 180;
              const r = (OUTER + INNER) / 2;
              return (
                <button
                  type="button"
                  key={s.id}
                  className={`buy-wheel-sector${s.current ? " is-current" : ""}${
                    hover === s.id ? " is-hover" : ""
                  }`}
                  style={{ clipPath: wedge(from, to) }}
                  disabled={s.disabled}
                  aria-label={`Equip ${s.name}, key ${s.key}`}
                  aria-pressed={s.current}
                  onPointerEnter={() => setHover(s.id)}
                  onFocus={() => setHover(s.id)}
                  onBlur={() => setHover((h) => (h === s.id ? null : h))}
                  onClick={() => choose(s)}
                >
                  <span
                    className="buy-wheel-label"
                    style={{
                      left: `${50 + r * Math.cos(a)}%`,
                      top: `${50 + r * Math.sin(a)}%`,
                    }}
                  >
                    {s.icon ? (
                      <img
                        className={`buy-wheel-icon${s.pistol ? " is-pistol" : ""}`}
                        src={`/fps/br/icons/${s.icon}.webp`}
                        alt=""
                        draggable={false}
                      />
                    ) : (
                      <Wrench className="buy-wheel-kit" aria-hidden />
                    )}
                    <strong>{s.name}</strong>
                    <small>
                      <kbd>{s.key}</kbd>
                      {s.current ? (
                        <>
                          <Check size={11} aria-hidden /> Equipped
                        </>
                      ) : (
                        "Free"
                      )}
                    </small>
                  </span>
                </button>
              );
            })}
            <div className="buy-wheel-hub" aria-live="polite">
              {status || kit?.error ? (
                <p className="buy-menu-status" role="status">
                  {status ?? kit?.error}
                </p>
              ) : shown ? (
                <>
                  <strong>{shown.name}</strong>
                  <em>{shown.note ?? (shown.current ? "Equipped" : "Free")}</em>
                </>
              ) : null}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
