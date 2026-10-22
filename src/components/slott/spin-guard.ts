/** Client gate for one Spin press. The server still rejects a second insert. */
export interface SpinGate {
  locked: boolean;
  /** Spin number already sent, until the match's next_spin moves past it. */
  held: number | null;
  canSpin: boolean;
  nextSpin: number;
}

/**
 * One intended spin. A second click, Enter, or auto tick in the same turn is
 * refused even after the in-flight flag drops and before React disables the button.
 */
export function admitSpin(gate: SpinGate): boolean {
  if (gate.locked) return false;
  if (gate.held === gate.nextSpin) return false;
  return gate.canSpin;
}

/** A dropped response keeps its key so the retry is the same server action. */
export function reuseSpinKey(message: string): boolean {
  return /fetch|network/i.test(message);
}
