/** Immutable after construction. Consecutive model boxes reuse many coordinates.
 * Encode one bounded page at a time so world construction never needs a second
 * full-size coordinate buffer. The palette stores the original float32 bit patterns. */
const SHIFT = 12;
const PAGE = 1 << SHIFT;
type Page = { values: Float32Array; codes?: Uint8Array | Uint16Array };

export class CollisionCoordinates {
  private readonly pages: Page[] = [];
  private pending: Float32Array;
  private count = 0;

  constructor(readonly length: number) {
    this.pending = new Float32Array(Math.min(length, PAGE));
  }

  append(value: number) {
    const offset = this.count & (PAGE - 1);
    this.pending[offset] = value;
    this.count++;
    if (offset + 1 === this.pending.length) {
      this.pages.push(encode(this.pending));
      this.pending = new Float32Array(Math.min(PAGE, this.length - this.count));
    }
  }

  get(index: number): number {
    const page = this.pages[index >>> SHIFT]!;
    const offset = index & (PAGE - 1);
    return page.values[page.codes ? page.codes[offset]! : offset]!;
  }

  get byteLength(): number {
    return this.pages.reduce(
      (sum, page) => sum + page.values.byteLength + (page.codes?.byteLength ?? 0),
      0,
    );
  }
}

function encode(values: Float32Array): Page {
  const bits = new Uint32Array(values.buffer);
  const palette = new Map<number, number>();
  for (const value of bits) {
    if (!palette.has(value)) palette.set(value, palette.size);
  }
  const narrow = palette.size <= 256;
  if (palette.size * 4 + values.length * (narrow ? 1 : 2) >= values.byteLength) return { values };
  const codes = narrow ? new Uint8Array(bits.length) : new Uint16Array(bits.length);
  for (let i = 0; i < bits.length; i++) codes[i] = palette.get(bits[i]!)!;
  return { values: new Float32Array(Uint32Array.from(palette.keys()).buffer), codes };
}
