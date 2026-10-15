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
  const balance = info.data?.available ?? 0;
  const top = Math.min(max, balance);
  const [amount, setAmount] = useState(max);
  useEffect(() => {
    if (open) setAmount(Math.max(min, Math.min(max, top || max)));
  }, [open, min, max, top]);
  const short = info.data != null && balance < min;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display">{title}</DialogTitle>
          <DialogDescription>
            {note ??
              `Buy in between ${money(min)} and ${money(max)} (${min / bb}–${max / bb} big blinds).`}{" "}
            Deposited cash is used first, then promo credit, the same as every other game.
          </DialogDescription>
        </DialogHeader>
        {info.isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : short ? (
          <p className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
            You have {money(balance)} available. This table needs at least {money(min)}.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">Buy-in</span>
              <span className="font-display text-2xl tabular-nums">{money(amount)}</span>
            </div>
            <input
              type="range"
              min={min}
              max={Math.max(min, top)}
              step={bb}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="poker-slider w-full"
              aria-label="Buy-in amount"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Available {money(balance)}</span>
              <button
                type="button"
                className="text-primary-soft hover:underline"
                onClick={() => setAmount(Math.max(min, top))}
              >
                Max
              </button>
            </div>
          </div>
        )}
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <Button
          disabled={busy || short || info.isLoading}
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
