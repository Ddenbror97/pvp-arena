import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { fetchBuyInInfo, money } from "@/lib/poker/api";
import { cn } from "@/lib/utils";

/** Buy-in amount within the table range and the player's balance. */
export function BuyInDialog({
  open,
  onOpenChange,
  typeId,
  title,
  min,
  max,
  bb,
  busy,
  onConfirm,
  error,
  confirmLabel = "Take a seat",
  note,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  typeId: number;
  title: string;
  min: number;
  max: number;
  bb: number;
  busy: boolean;
  onConfirm: (amount: number) => void;
  error: string | null;
  confirmLabel?: string;
  note?: string;
}) {
  const info = useQuery({
    queryKey: ["poker-buyin", typeId],
    queryFn: () => fetchBuyInInfo(typeId),
    enabled: open,
    staleTime: 0,
  });
  const loaded = info.isSuccess && info.data != null;
  const balance = info.data?.available ?? 0;
  // Until the balance is known the slider uses the table maximum, so the
  // window does not grow when the figure arrives and recentre itself.
  const top = loaded ? Math.min(max, balance) : max;
  const [amount, setAmount] = useState(max);
  useEffect(() => {
    if (open) setAmount(Math.max(min, Math.min(max, top || max)));
  }, [open, min, max, top]);
  const short = loaded && balance < min;
  const ceiling = Math.max(min, top);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="poker-buyin max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display">{title}</DialogTitle>
          <DialogDescription>
            {note ??
              `Buy in between ${money(min)} and ${money(max)} (${min / bb}–${max / bb} big blinds).`}{" "}
            Deposited cash is used first, then promo credit, the same as every other game.
          </DialogDescription>
        </DialogHeader>
        <div className="grid">
          <div
            className={cn("col-start-1 row-start-1 space-y-3", short && "invisible")}
            inert={short ? true : undefined}
            aria-hidden={short || undefined}
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm text-muted-foreground">Buy-in</span>
              <span className="min-w-[5.5rem] text-right font-display text-2xl tabular-nums">
                {money(amount)}
              </span>
            </div>
            <input
              type="range"
              min={min}
              max={ceiling}
              step={bb}
              value={Math.min(amount, ceiling)}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="poker-slider w-full"
              aria-label="Buy-in amount"
            />
            <div className="flex justify-between gap-3 text-xs text-muted-foreground">
              <span className="tabular-nums">Available {loaded ? money(balance) : "—"}</span>
              <button
                type="button"
                className="text-primary-soft hover:underline"
                onClick={() => setAmount(ceiling)}
              >
                Max
              </button>
            </div>
          </div>
          {short ? (
            <p className="col-start-1 row-start-1 self-center rounded-lg border border-border bg-muted/30 p-3 text-sm">
              You have {money(balance)} available. This table needs at least {money(min)}.
            </p>
          ) : null}
        </div>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <Button
          disabled={busy || short || !loaded}
          onClick={() => onConfirm(amount)}
          className="w-full font-display"
        >
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {confirmLabel}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
