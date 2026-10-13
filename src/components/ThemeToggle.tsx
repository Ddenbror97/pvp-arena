import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { getTheme, subscribeTheme, toggleTheme } from "@/lib/theme";

/**
 * Icons follow `data-theme` in CSS so the first paint matches the boot script.
 * The accessible name starts as the dark-default label and syncs after mount.
 */
export function ThemeToggle() {
  const [label, setLabel] = useState("Switch to light theme");

  useEffect(() => {
    const sync = () =>
      setLabel(getTheme() === "light" ? "Switch to dark theme" : "Switch to light theme");
    sync();
    return subscribeTheme(sync);
  }, []);

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className="theme-toggle relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-[var(--header-muted)] transition-colors hover:bg-[var(--header-hover)] hover:text-[var(--header-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--header-accent)]"
    >
      <Sun className="theme-icon-sun h-5 w-5" aria-hidden />
      <Moon className="theme-icon-moon absolute h-5 w-5" aria-hidden />
    </button>
  );
}
