import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { hashIdentifier } from "@/lib/auth-otp/otp";
import { COMPLIANCE } from "@/lib/config";
import { workerEnv } from "@/lib/worker-env";
import {
  GAME_SIGNUP_CLIENT_EVENTS,
  GAME_SIGNUP_FLAG,
  gameSignupReserveAllowed,
  type GameId,
  type GameSignupClientEvent,
} from "./game-signup-policy";

const gameSchema = z.enum(["jackpot", "roulette", "coinflip", "poker", "slott"]);
const eventSchema = z.enum(GAME_SIGNUP_CLIENT_EVENTS);

function requestDecision(game: string) {
  return gameSignupReserveAllowed({
    flag: workerEnv(GAME_SIGNUP_FLAG),
    cfConnectingIp: getRequestHeader("cf-connecting-ip"),
    forwardedFor: getRequestHeader("x-forwarded-for"),
    country: getRequestHeader("cf-ipcountry"),
    geoEnabled: COMPLIANCE.geoRestriction.enabled,
    blockedCountries: COMPLIANCE.geoRestriction.blockedCountries,
    game,
  });
}

async function visitorHash(game: GameId): Promise<string | null> {
  const decision = requestDecision(game);
  if (!decision.ok) return null;
  const pepper = workerEnv("OTP_PEPPER");
  if (!pepper) return null;
  return hashIdentifier(pepper, decision.ip);
}

function asRecord(data: unknown): Record<string, unknown> | null {
  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data) as unknown;
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
  return data && typeof data === "object" ? (data as Record<string, unknown>) : null;
}

export const reserveGameSignupImpressionFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ game: gameSchema }).parse(input))
  .handler(async ({ data }): Promise<{ show: boolean }> => {
    try {
      const hash = await visitorHash(data.game);
      if (!hash) return { show: false };
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: row, error } = await supabaseAdmin.rpc(
        "reserve_game_signup_impression" as never,
        { p_ip_hash: hash, p_game: data.game } as never,
      );
      if (error) return { show: false };
      return { show: asRecord(row)?.["show"] === true };
    } catch {
      return { show: false };
    }
  });

export const recordGameSignupEventFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ event: eventSchema }).parse(input))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    try {
      const hash = await visitorHash("jackpot");
      if (!hash) return { ok: false };
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: row, error } = await supabaseAdmin.rpc(
        "record_game_signup_event" as never,
        { p_ip_hash: hash, p_event: data.event satisfies GameSignupClientEvent } as never,
      );
      if (error) return { ok: false };
      return { ok: asRecord(row)?.["ok"] === true };
    } catch {
      return { ok: false };
    }
  });
