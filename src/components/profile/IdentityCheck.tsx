import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { identityStatusFn, startIdentityFn } from "@/lib/identity/identity.functions";
import type { IdentityStatus } from "@/lib/identity/decision";

const COPY: Record<IdentityStatus, string> = {
  none: "Optional. Verifying who you are helps keep this account yours.",
  pending: "In progress.",
  approved: "Verified.",
  declined: "Not approved.",
  in_review: "In review.",
  expired: "Expired.",
};

export function IdentityCheck() {
  const load = useServerFn(identityStatusFn);
  const start = useServerFn(startIdentityFn);
  const [status, setStatus] = useState<IdentityStatus>("none");
  const [available, setAvailable] = useState(true);
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let gone = false;
    load()
      .then((view) => {
        if (gone) return;
        setAvailable(view.available);
        setStatus(view.status);
        setUrl(view.url);
      })
      .catch(() => {
        if (!gone) setAvailable(false);
      });
    return () => {
      gone = true;
    };
  }, [load]);

  async function begin() {
    setBusy(true);
    try {
      const result = await start({ data: { origin: window.location.origin } });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setStatus(result.status);
      if (result.url) window.location.assign(result.url);
    } catch {
      toast.error("Could not start the identity check.");
    } finally {
      setBusy(false);
    }
  }

  const canStart =
    available && status !== "approved" && status !== "in_review" && !(status === "pending" && url);

  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <h2 className="font-display text-lg">Identity check</h2>
        {status === "approved" && (
          <BadgeCheck className="h-5 w-5 text-primary" aria-label="Verified" />
        )}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        {available ? COPY[status] : "Not available right now."}
      </p>
      {status === "pending" && url && (
        <Button className="mt-4" disabled={busy} onClick={() => window.location.assign(url)}>
          Continue identity check
        </Button>
      )}
      {canStart && (
        <Button className="mt-4" disabled={busy} onClick={() => void begin()}>
          {busy ? "Starting…" : status === "none" ? "Verify identity" : "Try again"}
        </Button>
      )}
    </section>
  );
}
