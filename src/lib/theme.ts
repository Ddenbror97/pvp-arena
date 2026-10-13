/** Application appearance. The header does not use this; it stays on the dark chrome tokens. */
export const THEME_STORAGE_KEY = "pvp-spin-arena-theme";

export type AppTheme = "light" | "dark";

const listeners = new Set<() => void>();
let current: AppTheme = "dark";

function readApplied(): AppTheme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

if (typeof document !== "undefined") current = readApplied();

export function getTheme(): AppTheme {
  return current;
}

export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Re-apply storage after hydration, in case the attribute was not in the server markup. */
export function ensureTheme(): void {
  let next: AppTheme = "dark";
  try {
    if (localStorage.getItem(THEME_STORAGE_KEY) === "light") next = "light";
  } catch {
    next = readApplied();
  }
  current = next;
  document.documentElement.setAttribute("data-theme", next);
  listeners.forEach((listener) => listener());
}

export function setTheme(next: AppTheme): void {
  current = next;
  const root = document.documentElement;
  root.setAttribute("data-theme", next);
  root.classList.add("theme-switching");
  window.setTimeout(() => root.classList.remove("theme-switching"), 240);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    /* Storage can be blocked; the attribute still applies for this view. */
  }
  listeners.forEach((listener) => listener());
}

export function toggleTheme(): void {
  setTheme(current === "light" ? "dark" : "light");
}
