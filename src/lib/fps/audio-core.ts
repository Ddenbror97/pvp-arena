import { STEP_VARIANTS, type FootstepSurface } from "./footstep-surfaces";
import { materialFootstep } from "./footsteps";

/**
 * What the two PvPStrike audio engines share (audio.ts for the 1v1 and Defuse the Bomb,
 * br/br-audio.ts for the Battle Royale): the output chain, sample loading and the footstep
 * surface variants. Each engine keeps its own mix levels and cues.
 */
export type MasterMix = {
  gain: number;
  threshold: number;
  ratio: number;
  knee?: number;
  attack?: number;
  release?: number;
};

/** master gain → compressor → the speakers. Unset compressor values keep the browser's. */
export function masterChain(context: AudioContext, mix: MasterMix) {
  const master = context.createGain(),
    compressor = context.createDynamicsCompressor();
  master.gain.value = mix.gain;
  compressor.threshold.value = mix.threshold;
  if (mix.knee !== undefined) compressor.knee.value = mix.knee;
  compressor.ratio.value = mix.ratio;
  if (mix.attack !== undefined) compressor.attack.value = mix.attack;
  if (mix.release !== undefined) compressor.release.value = mix.release;
  master.connect(compressor);
  compressor.connect(context.destination);
  return { master, compressor };
}

/** One recorded sample, decoded. Rejects when the file is missing or not audio. */
export async function fetchSample(context: BaseAudioContext, url: string): Promise<AudioBuffer> {
  const response = await fetch(url);
  if (!response.ok) throw Error("AUDIO_UNAVAILABLE");
  return context.decodeAudioData(await response.arrayBuffer());
}

/** A recorded footstep as it sounds on each surface: [surface, buffer]. */
export function footstepVariants(
  context: BaseAudioContext,
  step: AudioBuffer,
): Array<[FootstepSurface, AudioBuffer]> {
  return STEP_VARIANTS.map((surface) => {
    const samples = materialFootstep(step.getChannelData(0), step.sampleRate, surface);
    const variant = context.createBuffer(1, samples.length, step.sampleRate);
    variant.copyToChannel(samples, 0);
    return [surface, variant];
  });
}
