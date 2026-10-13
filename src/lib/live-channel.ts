const open = new Map<string, number>();

/** Reference-counted realtime subscription. Polls read this and back off while a channel is up. */
export function markChannel(name: string, up: boolean) {
  const next = Math.max(0, (open.get(name) ?? 0) + (up ? 1 : -1));
  if (next === 0) open.delete(name);
  else open.set(name, next);
}

export function channelLive(name: string) {
  return open.has(name);
}
