import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { LogOut } from "lucide-react";

/**
 * "Leave this match?" for all three FPS modes (owner, 2026-11-16: "update the leave game ux
 * window … to look more clean"): one small black and white card over a dimmed game. Stay has
 * the focus, Tab stays inside the card, and Escape stays.
 */
export function LeaveConfirm({
  title,
  detail,
  stayLabel,
  leaveLabel,
  to = "/fps-duel",
  onStay,
}: {
  title: string;
  detail: string;
  stayLabel: string;
  leaveLabel: string;
  to?: string;
  onStay: () => void;
}) {
  const stay = useRef<HTMLButtonElement>(null);
  const stayRef = useRef(onStay);
  stayRef.current = onStay;
  useEffect(() => {
    stay.current?.focus();
    const cancel = (e: KeyboardEvent) => {
      if (e.code !== "Escape") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      stayRef.current();
    };
    addEventListener("keydown", cancel, true);
    return () => removeEventListener("keydown", cancel, true);
  }, []);
  return (
    <div
      className="fps-leave-shield"
      onClick={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) onStay();
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="fps-leave-title"
        aria-describedby="fps-leave-detail"
        className="fps-leave-card"
        onKeyDown={(e) => {
          if (e.key !== "Tab") return;
          const controls = e.currentTarget.querySelectorAll<HTMLElement>("button,a");
          const first = controls[0],
            last = controls[controls.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }}
      >
        <span className="fps-leave-icon" aria-hidden>
          <LogOut size={18} />
        </span>
        <h2 id="fps-leave-title">{title}</h2>
        <p id="fps-leave-detail">{detail}</p>
        <div className="fps-leave-actions">
          <button ref={stay} type="button" className="fps-leave-stay" onClick={onStay}>
            {stayLabel}
          </button>
          <Link to={to} className="fps-leave-go">
            {leaveLabel}
          </Link>
        </div>
      </section>
    </div>
  );
}
