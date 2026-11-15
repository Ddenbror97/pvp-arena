import type { duelAdmission } from "./duel.functions";
import type { bombAdmission } from "./bomb/bomb.functions";
import { loadingImageFor } from "./maps/loading-art";
import { BOMB_LOADING_IMAGES } from "./bomb/loading";
import { ROTATION_MAP_KEYS } from "./maps/ids";

type DuelTicket = Awaited<ReturnType<typeof duelAdmission>>;
type BombTicket = Awaited<ReturnType<typeof bombAdmission>>;
type Entry<T> = { user: string; match: string; until: number; ticket: T };
// Memory only, one entry per mode. Tickets are consumed once, never persisted or
// reused on reconnect; the room still performs its authoritative session checks.
let duel: Entry<DuelTicket> | null = null;
let bomb: Entry<BombTicket> | null = null;
const valid = <T>(entry: Entry<T> | null, user: string | null, match?: string) =>
  !!entry && entry.user === user && entry.until > Date.now() && (!match || entry.match === match);

function imageReady(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const finish = (error?: Error) => {
      clearTimeout(timer);
      img.onload = img.onerror = null;
      if (error) reject(error);
      else resolve();
    };
    const fail = () => finish(new Error("The map image could not load. Please try again."));
    const timer = setTimeout(fail, 6000);
    img.onload = () => void img.decode().then(() => finish(), fail);
    img.onerror = fail;
    img.src = src;
  });
}

export async function prepareDuelEntry(user: string, match: string, ticket: DuelTicket) {
  if (!(ROTATION_MAP_KEYS as readonly string[]).includes(ticket.mapId))
    throw new Error("The match did not provide a valid map.");
  await imageReady(loadingImageFor(ticket.mapId));
  duel = { user, match, ticket, until: Math.min(ticket.expiresAt, Date.now() + 20_000) };
}
export async function prepareBombEntry(user: string, ticket: BombTicket) {
  await imageReady(BOMB_LOADING_IMAGES[ticket.map]);
  bomb = {
    user,
    match: ticket.matchId,
    ticket,
    until: Math.min(ticket.expiresAt, Date.now() + 20_000),
  };
}
export const preparedDuelMap = (user: string | null, match: string) =>
  valid(duel, user, match) ? duel!.ticket.mapId : null;
export const preparedBombMap = (user: string | null) =>
  valid(bomb, user) ? bomb!.ticket.map : null;
export function takeDuelEntry(user: string, match: string) {
  const ticket = valid(duel, user, match) ? duel!.ticket : null;
  duel = null;
  return ticket;
}
export function takeBombEntry(user: string) {
  const ticket = valid(bomb, user) ? bomb!.ticket : null;
  bomb = null;
  return ticket;
}
