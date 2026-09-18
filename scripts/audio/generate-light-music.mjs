#!/usr/bin/env node
/**
 * Generates the bundled light-music background loops (TASK-016).
 *
 * Replaces the old sampled nature loops (`rain` / `waves` / `forest`) with three
 * original, fully synthesised pieces — no third-party recordings, therefore no
 * licence or attribution obligations:
 *
 *   - `morning.wav`   「轻音乐·晨曦」: C 大调五声音阶上行 pad + 柔弦，60s 循环
 *   - `night.wav`     「轻音乐·静夜」: 低音区慢琶音 + 长混响感，60s 循环
 *   - `ethereal.wav`  「轻音乐·空山」: 高音区稀疏钟声 + 大音程间隔，60s 循环
 *
 * Everything is pure JS (no ffmpeg, no network): a deterministic additive synth
 * writes 22050 Hz mono 16-bit PCM WAV, folds the extra tail into the head with an
 * equal-power crossfade so the loop wraps without a click, and normalises the
 * final peak to −3 dBFS to avoid clipping / speaker pops.
 *
 * Usage: node scripts/audio/generate-light-music.mjs
 * `tick.wav` stays in `scripts/audio/generate-ambient-audio.mjs`.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, '..', '..', 'assets', 'audio');

const SAMPLE_RATE = 22050;
const LOOP_SEC = 60;
const XFADE_SEC = 2;
const TOTAL_SEC = LOOP_SEC + XFADE_SEC;
/** Peak target for the seam-normalised loop: −3 dBFS. */
const PEAK_DB = -3;

const TWO_PI = Math.PI * 2;

/** Equal-tempered pitch from scientific pitch notation (A4 = 440 Hz). */
function pitch(name) {
  const match = /^([A-G])(#?)(\d)$/.exec(name);
  if (!match) {
    throw new Error(`bad pitch: ${name}`);
  }
  const [, letter, sharp, octave] = match;
  const semitones = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[letter] + (sharp ? 1 : 0);
  const midi = (Number(octave) + 1) * 12 + semitones;
  return 440 * 2 ** ((midi - 69) / 12);
}

/** Deterministic LCG, only for the tiny amount of breath noise in the pads. */
function makeNoise(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return (state / 0x7fffffff) * 2 - 1;
  };
}

/**
 * Additive voice with a soft attack/decay envelope.
 *
 * `partials` is a list of `[harmonic, amplitude]` pairs. A second, very slightly
 * detuned copy of every partial is summed for a slow chorus/"strings" shimmer.
 */
function addVoice(samples, sampleRate, startSec, durSec, frequency, gain, options = {}) {
  const attack = options.attack ?? 1;
  const release = options.release ?? 2;
  const partials = options.partials ?? [
    [1, 1],
    [2, 0.35],
    [3, 0.16],
    [4, 0.08],
  ];
  const detune = options.detune ?? 0.0016;
  const vibrato = options.vibrato ?? 0;
  const breath = options.breath ?? 0;
  const noise = options.noise;
  const decay = options.decay ?? 0;

  const start = Math.round(startSec * sampleRate);
  const length = Math.round(durSec * sampleRate);
  for (let i = 0; i < length; i += 1) {
    const index = start + i;
    if (index < 0 || index >= samples.length) {
      continue;
    }
    const t = i / sampleRate;
    const attackEnv = Math.min(1, t / attack);
    const tailEnv = decay > 0 ? Math.exp(-t / decay) : Math.min(1, (durSec - t) / release);
    const env = attackEnv * tailEnv;
    if (env <= 0) {
      continue;
    }
    const wobble = vibrato > 0 ? 1 + vibrato * Math.sin(TWO_PI * 4.5 * t) : 1;
    let value = 0;
    for (const [harmonic, amplitude] of partials) {
      const base = TWO_PI * frequency * harmonic * wobble * t;
      value += amplitude * (Math.sin(base) + 0.5 * Math.sin(base * (1 + detune)));
    }
    if (breath > 0 && noise) {
      value += breath * noise();
    }
    samples[index] += gain * env * value;
  }
}

/** Inharmonic bell: a sparse high strike with independent partial decays. */
function addBell(samples, sampleRate, startSec, frequency, gain) {
  const partials = [
    [1, 1, 3.2],
    [2.76, 0.5, 1.8],
    [5.4, 0.28, 1.0],
    [8.93, 0.14, 0.55],
  ];
  const attack = 0.004;
  const start = Math.round(startSec * sampleRate);
  const length = Math.round(6 * sampleRate);
  for (let i = 0; i < length; i += 1) {
    const index = start + i;
    if (index < 0 || index >= samples.length) {
      continue;
    }
    const t = i / sampleRate;
    const attackEnv = Math.min(1, t / attack);
    let value = 0;
    for (const [ratio, amplitude, decay] of partials) {
      value += amplitude * Math.exp(-t / decay) * Math.sin(TWO_PI * frequency * ratio * t);
    }
    samples[index] += gain * attackEnv * value;
  }
}

/** A simple feedback-comb reverb tail (no convolution, cheap and loop-safe). */
function addReverb(input, sampleRate, { mix = 0.4, feedback = 0.72, damp = 0.25, scale = 1 } = {}) {
  const delays = [0.0297, 0.0371, 0.0411, 0.0437].map((seconds) => Math.max(1, Math.round(seconds * scale * sampleRate)));
  const combs = delays.map((delay) => {
    const line = new Float32Array(delay);
    const out = new Float32Array(input.length);
    let head = 0;
    let lowpass = 0;
    for (let n = 0; n < input.length; n += 1) {
      const delayed = line[head];
      lowpass = delayed * (1 - damp) + lowpass * damp;
      line[head] = input[n] + lowpass * feedback;
      out[n] = delayed;
      head = (head + 1) % delay;
    }
    return out;
  });

  const out = new Float32Array(input.length);
  for (let n = 0; n < input.length; n += 1) {
    let wet = 0;
    for (const comb of combs) {
      wet += comb[n];
    }
    out[n] = input[n] * (1 - mix) + (wet / combs.length) * mix;
  }
  return out;
}

/**
 * Fold the last `xfadeSec` seconds into the first `xfadeSec` seconds with an
 * equal-power crossfade. The result is exactly `loopSec` long and wraps without a
 * discontinuity (the sample after the end continues the sample at the start).
 */
function foldSeamless(samples, sampleRate, loopSec, xfadeSec) {
  const loopLength = Math.round(loopSec * sampleRate);
  const fadeLength = Math.round(xfadeSec * sampleRate);
  const out = new Float32Array(loopLength);
  out.set(samples.subarray(0, loopLength));
  for (let i = 0; i < fadeLength; i += 1) {
    const phase = (i / fadeLength) * (Math.PI / 2);
    const fadeIn = Math.sin(phase);
    const fadeOut = Math.cos(phase);
    out[i] = samples[i] * fadeIn + samples[loopLength + i] * fadeOut;
  }
  return out;
}

/** Scale the whole loop so its absolute peak sits at `targetDb` dBFS. */
function normalizePeak(samples, targetDb = PEAK_DB) {
  let peak = 0;
  for (const sample of samples) {
    peak = Math.max(peak, Math.abs(sample));
  }
  if (peak === 0) {
    return samples;
  }
  const gain = 10 ** (targetDb / 20) / peak;
  for (let i = 0; i < samples.length; i += 1) {
    samples[i] *= gain;
  }
  return samples;
}

/** 16-bit PCM mono WAV writer (mirrors generate-ambient-audio.mjs). */
function writeWav(path, samples, sampleRate) {
  const dataBytes = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataBytes);
  buffer.write('RIFF', 0, 'ascii');
  buffer.writeUInt32LE(36 + dataBytes, 4);
  buffer.write('WAVE', 8, 'ascii');
  buffer.write('fmt ', 12, 'ascii');
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36, 'ascii');
  buffer.writeUInt32LE(dataBytes, 40);
  for (let i = 0; i < samples.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  }
  writeFileSync(path, buffer);
}

/** Schedule a note both at `atSec` and one loop later, so the seam tail matches. */
function withWrap(events) {
  const wrapped = [];
  for (const event of events) {
    wrapped.push(event);
    if (event.at < XFADE_SEC) {
      wrapped.push({ ...event, at: event.at + LOOP_SEC });
    }
  }
  return wrapped;
}

function render(lengthSec, voices, reverbOptions) {
  const samples = new Float32Array(Math.round(lengthSec * SAMPLE_RATE));
  for (const voice of voices) {
    voice(samples);
  }
  return reverbOptions ? addReverb(samples, SAMPLE_RATE, reverbOptions) : samples;
}

function synthMorning() {
  // C 大调五声音阶上行：C4 D4 E4 G4 A4 C5 D5 E5 G5 A5，pad 与柔弦叠层。
  const scale = ['C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5', 'G5', 'A5'];
  const stepSec = 5.4;
  const noise = makeNoise(0x51ed270b);
  const events = [];
  scale.forEach((name, index) => {
    events.push({ at: index * stepSec, name, gain: 0.16 });
  });
  const voices = withWrap(events).flatMap(({ at, name, gain }) => [
    (samples) =>
      addVoice(samples, SAMPLE_RATE, at, 7.5, pitch(name), gain, {
        attack: 1.6,
        release: 2.4,
        vibrato: 0.0025,
        partials: [
          [1, 1],
          [2, 0.4],
          [3, 0.18],
          [4, 0.08],
          [6, 0.03],
        ],
      }),
    // 柔弦层：低八度、弱一些、起音更慢，铺出温暖的底。
    (samples) =>
      addVoice(samples, SAMPLE_RATE, at, 9, pitch(name) / 2, gain * 0.45, {
        attack: 2.6,
        release: 3.2,
        detune: 0.003,
        breath: 0.05,
        noise,
        partials: [
          [1, 1],
          [2, 0.5],
          [3, 0.28],
          [4, 0.14],
          [5, 0.08],
        ],
      }),
  ]);
  // 持续低音 C3 + G3，让上行旋律不悬空。
  voices.push((samples) =>
    addVoice(samples, SAMPLE_RATE, 0, TOTAL_SEC, pitch('C3'), 0.1, {
      attack: 4,
      release: 0.1,
      detune: 0.002,
      partials: [
        [1, 1],
        [2, 0.25],
        [3, 0.1],
      ],
    }),
  );
  voices.push((samples) =>
    addVoice(samples, SAMPLE_RATE, 0, TOTAL_SEC, pitch('G3'), 0.075, {
      attack: 5,
      release: 0.1,
      detune: 0.002,
      partials: [
        [1, 1],
        [2, 0.2],
      ],
    }),
  );
  return render(TOTAL_SEC, voices, { mix: 0.32, feedback: 0.7, scale: 1.1 });
}

function synthNight() {
  // 低音区慢琶音：C3 G2 A2 E3 D3 G2 ... 两小节一循环，长混响铺底。
  const pattern = ['C3', 'G2', 'A2', 'E3', 'D3', 'G2', 'F3', 'C3'];
  const stepSec = 3.4;
  const events = [];
  for (let index = 0; index * stepSec < LOOP_SEC; index += 1) {
    events.push({ at: index * stepSec, name: pattern[index % pattern.length], gain: 0.22 });
  }
  const voices = withWrap(events).map(
    ({ at, name, gain }) => (samples) =>
      addVoice(samples, SAMPLE_RATE, at, 6, pitch(name), gain, {
        attack: 0.5,
        decay: 2.4,
        vibrato: 0.0015,
        partials: [
          [1, 1],
          [2, 0.22],
          [3, 0.06],
        ],
      }),
  );
  return render(TOTAL_SEC, voices, { mix: 0.52, feedback: 0.82, damp: 0.32, scale: 1.6 });
}

function synthEthereal() {
  // 高音区稀疏钟声，大音程跳跃（五度/八度为主），间隔大、留白多。
  const pattern = ['C6', 'G5', 'E6', 'A5', 'D6', 'G5', 'B5', 'E6'];
  const stepSec = 7.5;
  const events = [];
  pattern.forEach((name, index) => {
    events.push({ at: index * stepSec, name, gain: 0.5 });
  });
  const voices = withWrap(events).map(
    ({ at, name, gain }) => (samples) => addBell(samples, SAMPLE_RATE, at, pitch(name), gain),
  );
  return render(TOTAL_SEC, voices, { mix: 0.55, feedback: 0.84, damp: 0.4, scale: 2.2 });
}

const TRACKS = {
  morning: synthMorning,
  night: synthNight,
  ethereal: synthEthereal,
};

function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  for (const [name, synth] of Object.entries(TRACKS)) {
    const rendered = synth();
    const looped = normalizePeak(foldSeamless(rendered, SAMPLE_RATE, LOOP_SEC, XFADE_SEC));
    const path = join(OUT_DIR, `${name}.wav`);
    writeWav(path, looped, SAMPLE_RATE);
    const kb = Math.round((looped.length * 2) / 1024);
    process.stdout.write(`wrote ${name}.wav (${LOOP_SEC}s loop, ${kb} KB)\n`);
  }
}

main();
