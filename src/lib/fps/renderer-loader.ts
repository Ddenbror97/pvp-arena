let renderer: Promise<typeof import("./renderer")> | undefined;
/** Download/parse on match intent, instantiate WebGL only inside the match. */
export function loadArenaRenderer() {
  return (renderer ??= import("./renderer").catch((error) => {
    renderer = undefined;
    throw error;
  }));
}
export function warmArenaRenderer() {
  if (typeof window !== "undefined") void loadArenaRenderer().catch(() => {});
}
