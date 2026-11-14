/**
 * Anti-cheat restrictions on the client (migration 20261114030000): a room refuses or ends a
 * restricted player's connection with RESTRICTED_CLOSE; the shared match socket then stops
 * reconnecting and announces RESTRICTED_EVENT, and the notice (FairPlayNotice) reads the
 * player's own status from the database. The client is told nothing else: no evidence, no
 * levels, no thresholds.
 */
import { supabase } from "@/integrations/supabase/client";

export { RESTRICTED_CLOSE, RESTRICTED_EVENT } from "./restriction-close";

export type FairPlayStatus =
  | { restricted: false }
  | {
      restricted: true;
      id: string;
      kind: "competitive" | "ban";
      permanent: boolean;
      until: string | null;
      since: string;
      reason: string;
      appeal: { status: "open" | "upheld" | "overturned"; created_at: string } | null;
      can_appeal: boolean;
    };

export async function fairPlayStatus(): Promise<FairPlayStatus> {
  const { data, error } = await supabase.rpc("fps_ac_my_status" as never);
  // Not signed in, or the feature is not in this database yet: nothing to show.
  if (error || !data) return { restricted: false };
  return data as FairPlayStatus;
}

export async function fileAppeal(restriction: string, message: string) {
  const { error } = await supabase.rpc(
    "fps_ac_appeal" as never,
    { p_restriction: restriction, p_message: message } as never,
  );
  if (error) {
    if (/APPEAL_EXISTS/.test(error.message)) throw new Error("An appeal is already open.");
    if (/APPEAL_LENGTH/.test(error.message))
      throw new Error("Write between 10 and 2,000 characters.");
    throw new Error("The appeal could not be sent. Try again later.");
  }
}
