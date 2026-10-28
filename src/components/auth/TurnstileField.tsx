import { useEffect, useRef } from "react";
import { turnstileSiteKey } from "@/lib/auth-otp/turnstile";

type TurnstileApi = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
};

function turnstileApi(): TurnstileApi | undefined {
  return (window as Window & { turnstile?: TurnstileApi }).turnstile;
}

const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

/** Managed Cloudflare Turnstile. Calls back with a single-use token. */
export function TurnstileField({
  resetKey,
  onToken,
}: {
  resetKey: number;
  onToken: (token: string | null) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useEffect(() => {
    const node = host.current;
    if (!node) return;
    let widgetId: string | null = null;
    let cancelled = false;
    const sitekey = turnstileSiteKey();

    const mount = () => {
      const turnstile = turnstileApi();
      if (cancelled || !turnstile) return;
      if (widgetId) return;
      widgetId = turnstile.render(node, {
        sitekey,
        theme: "dark",
        size: "flexible",
        appearance: "always",
        callback: (token: string) => onTokenRef.current(token),
        "expired-callback": () => onTokenRef.current(null),
        "error-callback": () => onTokenRef.current(null),
      });
    };

    let script = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT}"]`);
    if (!script) {
      script = document.createElement("script");
      script.src = SCRIPT;
      script.async = true;
      document.head.appendChild(script);
    }
    script.addEventListener("load", mount);
    if (turnstileApi()) mount();

    return () => {
      cancelled = true;
      script?.removeEventListener("load", mount);
      const turnstile = turnstileApi();
      if (widgetId && turnstile) turnstile.remove(widgetId);
      onTokenRef.current(null);
    };
  }, [resetKey]);

  return <div ref={host} className="min-h-[65px]" />;
}
