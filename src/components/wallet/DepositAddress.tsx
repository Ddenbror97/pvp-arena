import { type ReactNode } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";

/** Full address, copy, context, and the QR beside it. */
export function DepositAddress({
  network,
  address,
  qr,
  note,
  copiedLabel,
  pending = false,
  emptyAddress,
  children,
}: {
  network: string;
  address: string | null;
  qr: string;
  note: string;
  copiedLabel: string;
  pending?: boolean;
  emptyAddress?: string;
  children?: ReactNode;
}) {
  const waiting = !address && pending;
  return (
    <div className="rounded-lg border border-border p-2.5" aria-busy={waiting ? true : undefined}>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {network}
      </p>
      {children}
      <div className="mt-2 flex items-center gap-2.5">
        <div className="flex h-[5.25rem] w-[5.25rem] shrink-0 items-center justify-center rounded-md bg-white p-1">
          {qr ? (
            <div
              className="[&_svg]:h-[4.75rem] [&_svg]:w-[4.75rem]"
              dangerouslySetInnerHTML={{ __html: qr }}
              aria-label="Deposit QR code"
            />
          ) : waiting ? (
            <div
              className="h-[4.75rem] w-[4.75rem] animate-pulse rounded-sm bg-zinc-200"
              aria-hidden
            />
          ) : (
            <div className="h-[4.75rem] w-[4.75rem] rounded-sm bg-zinc-100" aria-hidden />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium">Deposit address</p>
          <div className="mt-1 flex items-start gap-1.5">
            <p className="min-h-[2.25rem] min-w-0 flex-1 break-all font-mono text-[11px] leading-snug">
              {address ? (
                address
              ) : waiting ? (
                <span className="mt-0.5 block h-7 animate-pulse rounded bg-muted" aria-hidden />
              ) : (
                <span className="text-muted-foreground">{emptyAddress ?? ""}</span>
              )}
            </p>
            <button
              type="button"
              aria-label={copiedLabel}
              disabled={!address}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-foreground disabled:opacity-40"
              onClick={() => {
                if (!address) return;
                navigator.clipboard.writeText(address).then(() => toast.success(copiedLabel));
              }}
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
      {address && !note ? null : (
        <p className="mt-2 min-h-[4.5rem] whitespace-pre-line text-xs leading-snug text-muted-foreground sm:min-h-[3.25rem]">
          {address ? (
            note
          ) : waiting ? (
            <span className="block h-10 animate-pulse rounded bg-muted sm:h-8" aria-hidden />
          ) : (
            note
          )}
        </p>
      )}
    </div>
  );
}
