import { workerEnv } from "@/lib/worker-env";
import {
  isAdult,
  isStoredStatus,
  mapDiditStatus,
  shouldApply,
  type IdentityStatus,
} from "./decision";

const DIDIT = "https://verification.didit.me";
const REUSE_MS = 12 * 60 * 60 * 1000;

type Row = {
  user_id: string;
  session_id: string | null;
  session_url: string | null;
  status: Exclude<IdentityStatus, "none">;
  verified_at: string | null;
  updated_at: string;
};

export type IdentityView = { available: boolean; status: IdentityStatus; url: string | null };

function configured(): { apiKey: string; workflowId: string } | null {
  const apiKey = workerEnv("DIDIT_API_KEY");
  const workflowId = workerEnv("DIDIT_WORKFLOW_ID");
  if (!apiKey || !workflowId) return null;
  return { apiKey, workflowId };
}

function diditHost(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return (
      new URL(url).protocol === "https:" && (host === "didit.me" || host.endsWith(".didit.me"))
    );
  } catch {
    return false;
  }
}

async function table() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return (
    supabaseAdmin as unknown as { from: (name: string) => ReturnType<typeof supabaseAdmin.from> }
  ).from("identity_checks");
}

async function rowFor(userId: string): Promise<Row | null> {
  const { data } = await (
    await table()
  )
    .select("user_id, session_id, session_url, status, verified_at, updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  const row = data as Row | null;
  if (!row || !isStoredStatus(row.status)) return null;
  return row;
}

async function didit(path: string, init: RequestInit = {}): Promise<Response> {
  const cfg = configured();
  if (!cfg) throw new Error("Identity checks are not configured");
  const headers = new Headers(init.headers);
  headers.set("x-api-key", cfg.apiKey);
  headers.set("accept", "application/json");
  return fetch(`${DIDIT}${path}`, { ...init, headers });
}

function readDecision(
  body: unknown,
): { status: string; vendorData: string | null; decision: unknown } | null {
  if (!body || typeof body !== "object") return null;
  const rec = body as Record<string, unknown>;
  const status = typeof rec["status"] === "string" ? rec["status"] : "";
  if (!status) return null;
  const vendor = rec["vendor_data"];
  return {
    status,
    vendorData: typeof vendor === "string" ? vendor : null,
    decision: rec["decision"] ?? rec,
  };
}

async function save(userId: string, patch: Record<string, unknown>) {
  const { error } = await (
    await table()
  ).upsert(
    { user_id: userId, updated_at: new Date().toISOString(), ...patch },
    { onConflict: "user_id" },
  );
  if (error) throw new Error("Could not save the identity check");
}

/** Pulls the live decision for a stored session and updates the row. Never stores the document. */
export async function syncIdentity(userId: string): Promise<IdentityView> {
  const cfg = configured();
  const row = await rowFor(userId);
  if (!cfg) return { available: false, status: row?.status ?? "none", url: null };
  if (!row) return { available: true, status: "none", url: null };
  if (row.status !== "pending" && row.status !== "in_review") {
    return { available: true, status: row.status, url: null };
  }
  if (row.session_id) await applySession(row.session_id);
  const next = await rowFor(userId);
  const status = next?.status ?? row.status;
  const fresh = !!next && Date.now() - new Date(next.updated_at).getTime() < REUSE_MS;
  const url =
    status === "pending" && fresh && next?.session_url && diditHost(next.session_url)
      ? next.session_url
      : null;
  return { available: true, status, url };
}

function callbackUrl(origin?: string): string {
  const fallback = "https://pvpspinarena.com/profile/security?identity=done";
  if (!origin) return fallback;
  try {
    const host = new URL(origin);
    const local =
      (host.hostname === "localhost" || host.hostname === "127.0.0.1") &&
      (host.protocol === "http:" || host.protocol === "https:");
    const live =
      host.protocol === "https:" &&
      (host.hostname === "pvpspinarena.com" || host.hostname === "www.pvpspinarena.com");
    if (!local && !live) return fallback;
    return `${host.origin}/profile/security?identity=done`;
  } catch {
    return fallback;
  }
}

export async function startIdentity(
  userId: string,
  origin?: string,
): Promise<
  { ok: true; status: IdentityStatus; url: string | null } | { ok: false; error: string }
> {
  const cfg = configured();
  if (!cfg) return { ok: false, error: "Identity checks are not available right now." };
  const current = await syncIdentity(userId);
  if (current.status === "approved" || current.status === "in_review")
    return { ok: true, status: current.status, url: null };
  if (current.status === "pending" && current.url)
    return { ok: true, status: "pending", url: current.url };

  const res = await didit("/v3/session/", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      workflow_id: cfg.workflowId,
      vendor_data: userId,
      callback: callbackUrl(origin),
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const detail =
      body && typeof body === "object" && typeof (body as { detail?: unknown }).detail === "string"
        ? (body as { detail: string }).detail
        : "";
    if (res.status === 400 && /credit/i.test(detail)) {
      return { ok: false, error: "Identity checks are not available right now." };
    }
    return { ok: false, error: "Identity checks are temporarily unavailable." };
  }
  const created = (await res.json()) as {
    session_id?: unknown;
    url?: unknown;
    verification_url?: unknown;
  };
  const sessionId = typeof created.session_id === "string" ? created.session_id : "";
  const url =
    typeof created.url === "string"
      ? created.url
      : typeof created.verification_url === "string"
        ? created.verification_url
        : "";
  if (!sessionId || !diditHost(url))
    return { ok: false, error: "Identity checks are temporarily unavailable." };
  await save(userId, {
    session_id: sessionId,
    session_url: url,
    status: "pending",
    verified_at: null,
  });
  return { ok: true, status: "pending", url };
}

/** Applies a Didit session after the webhook signature has been checked. */
export async function applySession(sessionId: string): Promise<void> {
  if (!configured()) return;
  const { data } = await (
    await table()
  )
    .select("user_id, session_id, session_url, status, verified_at, updated_at")
    .eq("session_id", sessionId)
    .maybeSingle();
  const row = data as Row | null;
  if (!row || !isStoredStatus(row.status)) return;
  const res = await didit(`/v3/session/${sessionId}/decision/`);
  if (res.status === 404) return;
  if (!res.ok) return;
  const read = readDecision(await res.json());
  if (!read) return;
  if (read.vendorData && read.vendorData !== row.user_id) return;
  let status = mapDiditStatus(read.status);
  if (!status) return;
  if (status === "approved" && isAdult(read.decision) === false) status = "declined";
  if (!shouldApply({ status: row.status, sessionId: row.session_id }, { sessionId })) return;
  if (status === row.status) return;
  await save(row.user_id, {
    status,
    verified_at: status === "approved" ? new Date().toISOString() : null,
    session_url: status === "pending" ? row.session_url : null,
  });
}
