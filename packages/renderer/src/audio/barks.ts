import type { AudioSpec } from "@potential/shared";

/**
 * Animal Crossing-style phoneme bark synthesis — Web Audio API only,
 * zero runtime AI audio. Each character gets a stable voice (pitch base +
 * timbre) derived from a seed; dialogue text drives a syllable blip train.
 *
 * Audio is a WorldObject property: object interaction cues route through
 * playObjectCue(object.audio).
 */

let audioContext: AudioContext | null = null;

function ctx(): AudioContext | null {
  if (typeof AudioContext === "undefined") return null;
  audioContext ??= new AudioContext();
  if (audioContext.state === "suspended") void audioContext.resume();
  return audioContext;
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Speak a line as phoneme barks. voiceSeed (e.g. character name) fixes the voice. */
export function playBark(text: string, voiceSeed: string, volume = 0.18): void {
  const audio = ctx();
  if (audio === null) return;

  const seed = hashString(voiceSeed);
  const basePitch = 160 + (seed % 240); // 160–400 Hz voice base
  const timbre: OscillatorType = (["square", "triangle", "sawtooth"] as const)[seed % 3] ?? "square";

  const syllables = text
    .toLowerCase()
    .replace(/[^a-z ]/g, "")
    .split(/[^aeiouy]*[aeiouy]+/)
    .slice(0, 14);

  const now = audio.currentTime + 0.02;
  let t = now;
  for (let i = 0; i < Math.max(2, syllables.length); i++) {
    const charCode = text.charCodeAt((i * 7) % Math.max(1, text.length)) || 97;
    const pitch = basePitch * (1 + ((charCode % 12) - 6) / 40);
    const duration = 0.045 + ((charCode % 5) / 100);

    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = timbre;
    osc.frequency.setValueAtTime(pitch, t);
    osc.frequency.exponentialRampToValueAtTime(pitch * 0.85, t + duration);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(volume, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain).connect(audio.destination);
    osc.start(t);
    osc.stop(t + duration + 0.01);
    t += duration + 0.028;
  }
}

/** Short synth cue for an object interaction, from its WorldObject audio spec. */
export function playObjectCue(spec: AudioSpec | undefined, fallbackLabel = ""): void {
  const audio = ctx();
  if (audio === null) return;
  const name = spec?.interactSound ?? fallbackLabel;
  const volume = (spec?.volume ?? 0.5) * 0.25;
  const seed = hashString(name);
  const kind = seed % 3;
  const t = audio.currentTime + 0.01;

  const osc = audio.createOscillator();
  const gain = audio.createGain();
  if (kind === 0) {
    // thud
    osc.type = "triangle";
    osc.frequency.setValueAtTime(90, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);
  } else if (kind === 1) {
    // beep
    osc.type = "square";
    osc.frequency.setValueAtTime(620, t);
  } else {
    // chirp
    osc.type = "sine";
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(700, t + 0.09);
  }
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(volume, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
  osc.connect(gain).connect(audio.destination);
  osc.start(t);
  osc.stop(t + 0.16);
}
