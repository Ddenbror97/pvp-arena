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
