// Minimal DOM stub: ez-tree starts texture loads at import; tree geometry needs no images.
globalThis.document = {
  createElementNS: () => ({ style: {}, addEventListener() {}, removeEventListener() {}, set src(_) {} }),
  createElement: () => ({ style: {}, getContext: () => null }),
};
globalThis.self = globalThis;
