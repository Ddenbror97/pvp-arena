import { useEffect } from "react";
import type { Primary } from "@/lib/fps/primary";
import { AWP } from "@/lib/fps/primary";
import "./buy-menu.css";

/**
 * Spawn buy menu (B). Practice has no economy: the AWP and the side's rifle are free; the server
 * decides whether the purchase is inside the buy window (buy.ts) and hands out a fresh weapon.
 */
export function BuyMenu({
  open,
  side,
  current,
  status,
  onBuy,
  onClose,
}: {
  open: boolean;
  /** The side the player is on now (decides which rifle is offered). */
  side: "police" | "terrorist";
  current: Primary;
  /** Null when buying is possible; otherwise why not (shown instead of the buttons). */
  status: string | null;
  onBuy: (item: Primary) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => {
      if (e.code === "Escape" || e.code === "KeyB") {
        e.preventDefault();
        onClose();
      } else if (!status && (e.code === "Digit1" || e.code === "Numpad1")) onBuy("rifle");
      else if (!status && (e.code === "Digit2" || e.code === "Numpad2")) onBuy("awp");
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [open, status, onBuy, onClose]);
  if (!open) return null;
  const rifle = side === "police" ? "M4A1-S" : "AK-47";
  const items: Array<{ id: Primary; name: string; kind: string; stats: string[]; key: string }> = [
    {
      id: "rifle",
      name: rifle,
      kind: side === "police" ? "Assault rifle · suppressed" : "Assault rifle",
      stats: ["30 / 90 rounds", "Full auto", "Reload 1.8 s"],
      key: "1",
    },
    {
      id: "awp",
      name: "AWP",
      kind: "Sniper rifle · bolt action",
      stats: [
        `${AWP.magazine} / ${AWP.reserve} rounds`,
        "One-shot to head, chest, stomach",
        "4× scope (right mouse)",
        `Bolt ${(AWP.cycleMs / 1000).toFixed(2)} s · reload ${(AWP.reloadMs / 1000).toFixed(2)} s`,
      ],
      key: "2",
    },
  ];
  return (
    <div className="buy-menu" role="dialog" aria-modal="true" aria-label="Buy menu">
      <section>
        <header>
          <h2>Buy</h2>
          <small>Practice · free · B or Esc to close</small>
        </header>
        {status ? (
          <p className="buy-menu-status">{status}</p>
        ) : (
          <div className="buy-menu-items">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                className={current === item.id ? "is-current" : ""}
                onClick={() => onBuy(item.id)}
              >
                <kbd>{item.key}</kbd>
                <strong>{item.name}</strong>
                <span>{item.kind}</span>
                <ul>
                  {item.stats.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
                <em>{current === item.id ? "Equipped · refill" : "Free"}</em>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
