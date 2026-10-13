export type AdminPhase = "setup" | "pin" | "otp" | "ready";

/** Server-side gate. A PIN without a trusted device is not enough. */
export function adminPhase(input: {
  hasPin: boolean;
  deviceTrusted: boolean;
  steppedUp: boolean;
  pinGranted: boolean;
}): AdminPhase {
  if (input.steppedUp) return "ready";
  if (!input.hasPin) return "setup";
  if (input.pinGranted && !input.deviceTrusted) return "otp";
  return "pin";
}

export function pinsMatch(created: string, confirmed: string): boolean {
  return /^\d{6}$/.test(created) && created === confirmed;
}
