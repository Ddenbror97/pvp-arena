import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  fairPlayStatus,
  fileAppeal,
  RESTRICTED_EVENT,
  type FairPlayStatus,
} from "@/lib/fps/restriction";

const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

/**
 * The fair-play notice for the PvPStrike pages: shown when a room refuses or ends the
 * connection for an anti-cheat restriction, and on opening a PvPStrike page while one is in
 * force. What it says comes from the player's own status (fps_ac_my_status): temporary or
 * permanent, until when, a general reason, and an appeal. Nothing about how it was decided.
 */
export function FairPlayNotice() {
  const [status, setStatus] = useState<FairPlayStatus>({ restricted: false });
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    const load = async () => {
      const s = await fairPlayStatus();
      if (!live) return;
      setStatus(s);
      if (s.restricted) setOpen(true);
    };
    void load();
    const onRestricted = () => void load();
    window.addEventListener(RESTRICTED_EVENT, onRestricted);
    return () => {
      live = false;
      window.removeEventListener(RESTRICTED_EVENT, onRestricted);
    };
  }, []);

  if (!status.restricted) return null;
  const ban = status.kind === "ban";
  const title = ban
    ? status.permanent
      ? "This account is permanently suspended from PvPStrike"
      : "This account is suspended from PvPStrike"
    : "Competitive play is restricted on this account";

  async function send() {
    if (!status.restricted) return;
    setSending(true);
    setError(null);
    try {
      await fileAppeal(status.id, message.trim());
      setStatus(await fairPlayStatus());
      setMessage("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "The appeal could not be sent.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{status.reason}</DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Applies to</dt>
          <dd>
            {ban ? "All PvPStrike modes" : "Matches against other players (practice is open)"}
          </dd>
          <dt className="text-muted-foreground">Type</dt>
          <dd>{status.permanent ? "Permanent" : "Temporary"}</dd>
          {status.until && (
            <>
              <dt className="text-muted-foreground">Ends</dt>
              <dd>{when(status.until)}</dd>
            </>
          )}
          <dt className="text-muted-foreground">Since</dt>
          <dd>{when(status.since)}</dd>
        </dl>
        {status.appeal ? (
          <p className="rounded-md bg-secondary px-3 py-2 text-sm">
            {status.appeal.status === "open"
              ? `Your appeal from ${when(status.appeal.created_at)} is being reviewed.`
              : status.appeal.status === "upheld"
                ? "Your appeal was reviewed and the restriction stands."
                : "Your appeal was accepted."}
          </p>
        ) : status.can_appeal ? (
          <div className="flex flex-col gap-2">
            <label htmlFor="fair-play-appeal" className="text-sm font-medium">
              Think this is a mistake? Tell us what happened.
            </label>
            <textarea
              id="fair-play-appeal"
              className="min-h-24 rounded-md border border-border bg-background p-2 text-sm"
              maxLength={2000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Your setup (mouse, sensitivity, connection), the matches you mean, anything we should know."
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Close
          </Button>
          {!status.appeal && status.can_appeal && (
            <Button disabled={sending || message.trim().length < 10} onClick={() => void send()}>
              {sending ? "Sending…" : "Send appeal"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
