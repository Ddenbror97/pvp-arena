import { useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Check, Crosshair, ShieldCheck, Target, Wrench, X, Zap, Flame } from "lucide-react";
import type { BuyItem } from "@/lib/fps/buy";
import type { Primary } from "@/lib/fps/primary";
import { AWP, MP5 } from "@/lib/fps/primary";
import { DEAGLE } from "@/lib/fps/sidearm";
import "./buy-menu.css";

/** Free equipment in both current game modes. The server enforces the round's buy window. */
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
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const code = e.code;
      if (
        ![
          "KeyB",
          "Digit1",
          "Numpad1",
          "Digit2",
          "Numpad2",
          "Digit3",
          "Numpad3",
          "Digit4",
          "Numpad4",
          "Digit5",
          "Numpad5",
        ].includes(code)
      )
        return;
      // Consume loadout shortcuts before the arena's weapon-switch / menu listeners see them.
      e.preventDefault();
      e.stopPropagation();
      if (code === "KeyB") onClose();
      else if (!status && (code === "Digit1" || code === "Numpad1")) onBuy("rifle");
      else if (!status && (code === "Digit2" || code === "Numpad2")) onBuy("awp");
      else if (!status && (code === "Digit3" || code === "Numpad3")) onBuy("mp5");
      else if (sidearm && !status && (code === "Digit4" || code === "Numpad4")) onBuy("deagle");
      else if (
        kit?.available &&
        !kit.equipped &&
        !kit.pending &&
        (code === "Digit5" || code === "Numpad5")
      )
        kit.onEquip();
    };
    document.addEventListener("keydown", key, true);
    return () => document.removeEventListener("keydown", key, true);
  }, [open, status, onBuy, onClose, kit, sidearm]);
  const rifle = side === "police" ? "M4A1-S" : "AK-47";
  const items = [
    {
      id: "rifle" as const,
      name: rifle,
      kind: side === "police" ? "Suppressed assault rifle" : "Assault rifle",
      icon: Target,
      stats: ["30 / 90 rounds", "Full auto"],
      key: "1",
    },
    {
      id: "awp" as const,
      name: "AWP",
      kind: "Bolt-action sniper rifle",
      icon: Crosshair,
      stats: [`${AWP.magazine} / ${AWP.reserve} rounds`, "4× scope · right mouse"],
      key: "2",
    },
    {
      id: "mp5" as const,
      name: "MP5",
      kind: "Submachine gun",
      icon: Zap,
      stats: [`${MP5.magazine} / ${MP5.reserve} rounds`, "Full auto · accurate on the move"],
      key: "3",
    },
  ];
  const deagle = {
    id: "deagle" as const,
    name: DEAGLE.name,
    kind: "Pistol · slot 2",
    icon: Flame,
    stats: [`${DEAGLE.magazine} / ${DEAGLE.reserve} rounds`, "Semi-auto · one-shot headshot"],
    key: "4",
  };
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
          onCloseAutoFocus={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }}
        >
          <header className="buy-menu-header">
            <div>
              <span className="buy-menu-side">
                <ShieldCheck size={14} aria-hidden />
                {side === "police" ? "Counter-Terrorist" : "Terrorist"}
              </span>
              <Dialog.Title asChild>
                <h2>Choose your loadout</h2>
              </Dialog.Title>
              <Dialog.Description>
                All weapons and equipment are free in current modes.
              </Dialog.Description>
            </div>
            <Dialog.Close className="buy-menu-close" aria-label="Close buy menu">
              <X size={20} />
            </Dialog.Close>
          </header>
          <div className="buy-menu-body">
            <h3>
              Primary weapon <span>Choose one</span>
            </h3>
            {status && (
              <p className="buy-menu-status" role="status">
                {status}
              </p>
            )}
            <div className="buy-menu-items">
              {items.map((item) => {
                const selected = current === item.id;
                const Icon = item.icon;
                return (
                  <button
                    type="button"
                    key={item.id}
                    className={selected ? "is-current" : ""}
                    disabled={!!status}
                    onClick={() => onBuy(item.id)}
                    aria-label={`Equip ${item.name}`}
                  >
                    <div className="buy-menu-card-top">
                      <Icon size={25} aria-hidden />
                      <kbd>{item.key}</kbd>
                    </div>
                    <strong>{item.name}</strong>
                    <span>{item.kind}</span>
                    <ul>
                      {item.stats.map((stat) => (
                        <li key={stat}>{stat}</li>
                      ))}
                    </ul>
                    <div className="buy-menu-card-action">
                      <em>
                        {selected ? (
                          <>
                            <Check size={14} aria-hidden /> Equipped · refill
                          </>
                        ) : (
                          "Equip weapon"
                        )}
                      </em>
                      <b>Free</b>
                    </div>
                  </button>
                );
              })}
            </div>
            {sidearm && (
              <>
                <h3>
                  Pistol <span>Slot 2 · kept through rounds</span>
                </h3>
                <div className="buy-menu-items buy-menu-items-single">
                  <button
                    type="button"
                    className={sidearm.carried ? "is-current" : ""}
                    disabled={!!status}
                    onClick={() => onBuy(deagle.id)}
                    aria-label={`Equip ${deagle.name}`}
                  >
                    <div className="buy-menu-card-top">
                      <deagle.icon size={25} aria-hidden />
                      <kbd>{deagle.key}</kbd>
                    </div>
                    <strong>{deagle.name}</strong>
                    <span>{deagle.kind}</span>
                    <ul>
                      {deagle.stats.map((stat) => (
                        <li key={stat}>{stat}</li>
                      ))}
                    </ul>
                    <div className="buy-menu-card-action">
                      <em>
                        {sidearm.carried ? (
                          <>
                            <Check size={14} aria-hidden /> Carried · refill
                          </>
                        ) : (
                          "Equip pistol"
                        )}
                      </em>
                      <b>Free</b>
                    </div>
                  </button>
                </div>
              </>
            )}
            {kit && (
              <>
                <h3>
                  Equipment <span>Counter-Terrorist</span>
                </h3>
                <button
                  type="button"
                  className={`buy-menu-kit${kit.equipped ? " is-current" : ""}`}
                  disabled={!kit.available || kit.equipped || kit.pending}
                  onClick={kit.onEquip}
                  aria-label="Equip defuse kit"
                >
                  <Wrench size={26} aria-hidden />
                  <div>
                    <strong>Defuse kit</strong>
                    <span>Defuse in 5 seconds instead of 10</span>
                  </div>
                  <em>
                    {kit.equipped
                      ? "Equipped"
                      : kit.pending
                        ? "Equipping…"
                        : kit.available
                          ? "Equip · Free"
                          : "Available before the round"}
                  </em>
                  <kbd>5</kbd>
                </button>
                {kit.error && (
                  <p className="buy-menu-error" role="alert">
                    {kit.error}
                  </p>
                )}
              </>
            )}
          </div>
          <footer className="buy-menu-footer">
            <span>
              <kbd>B</kbd> or <kbd>Esc</kbd> to close
            </span>
            <button type="button" onClick={onClose}>
              Back to game
            </button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
