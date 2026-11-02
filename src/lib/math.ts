/** `v` limited to the range [lo, hi]. */
export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
