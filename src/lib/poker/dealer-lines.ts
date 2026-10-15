/**
 * Every line the dealer speaks. Each one has a recorded clip at `/audio/dealer/<id>.mp3`
 * (regenerate with `npx tsx scripts/generate-dealer-voice.ts`); a line without a clip
 * falls back to the browser's speech engine.
 */
export const DEALER_LINES = {
  welcome: "Welcome to PVP SpinArena. Ready to play?",
  intro: "Welcome to PVP SpinArena. I'm your dealer. Good luck at the table.",
  voiceOn: "Your dealer is ready. Good luck at the table.",
  voiceLevel: "Voice level.",
  dealing: "Here come your cards.",
  goodLuck: "Good luck, everyone.",
  flop: "Here comes the flop.",
  turn: "The turn.",
  river: "And the river.",
  yourAction: "Your action.",
  actionOnYou: "The action is on you.",
  niceHand: "Nice hand. The pot goes to you.",
  potToYou: "The pot goes to you.",
  wellPlayed: "Well played.",
} as const;

export type DealerLineId = keyof typeof DEALER_LINES;

/** How a line is pronounced, where the written form trips speech engines. */
export const spokenForm = (text: string) => text.replace(/PVP SpinArena/g, "PVP Spin Arena");

export const DEALER_CLIP_DIR = "/audio/dealer";

const BY_TEXT = new Map<string, DealerLineId>(
  Object.entries(DEALER_LINES).map(([id, text]) => [text, id as DealerLineId]),
);

export const dealerLineId = (text: string): DealerLineId | null => BY_TEXT.get(text) ?? null;
