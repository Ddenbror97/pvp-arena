# FPS lobby mode artwork — 2026-11-03

Created with the built-in image-generation tool, using the user's `234.png` as the composition reference for Battle Royale and Duel. Original generated PNGs remain in the Codex generated-images folder. The project consumes 768 × 768 WebP versions, quality 87. Labels, icons, selection borders and status badges remain HTML/CSS.

## Saved project assets

- `src/assets/fps/mode-battle-royale-v1.webp` — 65,332 bytes.
- `src/assets/fps/mode-duel-v1.webp` — 53,684 bytes.
- `src/assets/fps/mode-bomb-defusal-v1.webp` — 96,804 bytes.

Combined size: 215,820 bytes (approximately 211 KiB). All three are imported by `src/components/fps/StrikeModePicker.tsx` and receive Vite content hashes. The arena hero retains its existing preloaded image. The browser check asserts three distinct decoded card assets at the expected resolution, while retaining mode-selection, Coming soon, invitation and responsive checks.

## Final generation prompts

### Battle Royale

Create a clean game lobby card background matching ONLY THE LEFT CARD ARTWORK in the user's attached 234.png reference. Realistic cinematic tactical soldier viewed from behind, helmet and tactical backpack, looking over a rugged mountain valley at sunset, two tiny parachuting soldiers in sky. Portrait-ish square composition; main soldier upper center, sky warm pale violet; moody dark navy purple lower third with natural terrain. High quality realistic game key art. NO text, letters, numbers, logos, icons, borders, interface, rounded corners, gradients that obscure the upper artwork. This is a single standalone background image for the Battle Royale card, NOT a screenshot or a set of cards. Preserve the reference's subject, framing and color mood.

### 1v1 Duel

Create a clean game lobby card background matching ONLY THE CENTER CARD ARTWORK in the user's attached 234.png reference. Two realistic tactical opponents face each other in profile at close distance: left a scarf-masked fighter with textured dark keffiyeh, right an anti-terrorist officer wearing black helmet and protective eyewear. Shoulders and heads in upper two thirds, facing inward, empty narrow space between them. Cinematic dark purple navy background and violet rim lighting. High quality realistic game key art, natural faces and fabric materials. Darker lower third for separate HTML overlay. NO text, no VS letters, no numbers, no logos, no icons, borders, UI, rounded corners. This is one standalone square background image for a 1v1 Duel card, NOT a screenshot or a set of cards. Match the reference's framing and mood.

### Defuse the Bomb

Single square cinematic background illustration for a fictional competitive video game's objective-mode menu card. A clearly imaginary nonfunctional movie prop timer held by black tactical-gloved hands in a warm sandstone courtyard with a red painted A on the wall. Red illuminated digital display reads 00:45 on the prop. Simple game-like rectangular casing with no internal components, no circuit details, no assembly instructions. Upper half prominently shows the timer, hands framing it and dusty old architecture. Rich realistic game key art, muted golden sand, deep navy purple shadows toward bottom third where HTML title will overlay. No action, explosion, injury, combat or people being harmed. No text besides timer and painted A. No logos, borders, UI icons, no caption. Beautiful detailed environment concept-art finish.
