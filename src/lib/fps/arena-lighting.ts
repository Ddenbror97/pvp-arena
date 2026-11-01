/**
 * World lighting for the PVPSPINARENA aim arena: warm late-afternoon Mediterranean sun with a
 * sky/ground-bounce hemisphere. Shared by the renderer and the map capture tests so screenshots
 * match the game.
 */
export const ARENA_LIGHTING = {
  background: 0xa9c3dc,
  fog: { color: 0xd9cdb6, near: 70, far: 260 },
  hemisphere: { sky: 0xc4d3ef, ground: 0x7a6650, intensity: 1.3 },
  sun: { color: 0xffe9cf, intensity: 2.8, position: [21, 19, -24] as const },
  environmentIntensity: 0.35,
  exposure: 1.0,
} as const;
