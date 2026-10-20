/**
 * User-facing cashout words. A timeout is not a broadcast, and "sent" is only
 * for a payout the ledger has settled.
 */
export function btcRequestNotice(status: string): string {
  switch (status) {
    case "BROADCAST":
      return "Bitcoin cashout broadcast.";
    case "PROCESSING":
    case "QUEUED":
      return "Your cashout is being processed. The amount stays reserved.";
    case "AWAITING_APPROVAL":
      return "Bitcoin cashout is waiting for approval. The amount stays reserved.";
    default:
      return "Withdrawal request accepted. The amount stays reserved.";
  }
}

export function evmRequestNotice(status: string): string {
  switch (status) {
    case "LIQUIDITY_PENDING":
      return "Your cashout is being processed. The amount stays reserved.";
    case "PENDING":
      return "Withdrawal request accepted. It is waiting for review.";
    default:
      return "Withdrawal request accepted. The amount stays reserved.";
  }
}

const STATUS: Record<string, string> = {
  DETECTED: "Detected",
  CONFIRMED: "Confirming",
  CREDITED: "Confirmed",
  NEW: "Waiting for payment",
  PROCESSING: "Confirming",
  SETTLED: "Adding to balance",
  HOLD: "Reserved",
  AWAITING_APPROVAL: "Waiting for approval",
  QUEUED: "Processing",
  COMPLETED: "Confirmed",
  CANCELLED: "Cancelled",
  FAILED: "Failed",
  UNMATCHED: "Under review",
  REJECTED: "Rejected",
  PENDING: "Request accepted",
  APPROVED: "Reserved",
  SUBMITTING: "Processing",
  SUBMITTED: "Broadcast",
  RELEASED: "Refunded",
  LIQUIDITY_PENDING: "Processing",
  EXPIRED: "Expired",
  WAITING: "Waiting for payment",
};

/** Activity label. Broadcast requires a stored transaction id. Sent is settlement. */
export function fundingStatusLabel(status: string, type: string, txHash?: string | null): string {
  if (status === "CONFIRMED" && type === "Withdrawal") return "Confirmed";
  if (status === "SUBMITTED" && !txHash) return "Processing";
  return STATUS[status] ?? status;
}
