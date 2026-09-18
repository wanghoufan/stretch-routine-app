#!/usr/bin/env node
/**
 * Generates the bundled `tick.wav` countdown metronome (TASK-011).
 *
 * Pure JS, reproducible, no ffmpeg / network. The three light-music loops that
 * used to be sampled nature recordings were replaced in TASK-016; they now live
 * in `scripts/audio/generate-light-music.mjs` and are fully synthesised too.
 *
 * Usage: node scripts/audio/generate-ambient-audio.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, '..', '..', 'assets', 'audio');
const SAMPLE_RATE = 22050;

/** Write a 16-bit PCM mono WAV file. */
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

/**
 * 1 s seamless metronome loop: a short "tick" on the beat and a lower "tock"
 * halfway. Both transients decay well before the 1 s wrap, so the loop is
 * mathematically continuous.
 */
function synthesizeTick(sampleRate) {
  const seconds = 1;
  const total = seconds * sampleRate;
  const samples = new Float32Array(total);

  // Deterministic LCG so re-running the script reproduces the same file.
  let seed = 0x2f6e2b1;
  const nextNoise = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return (seed / 0x7fffffff) * 2 - 1;
  };

  const click = (atSec, frequency, gain) => {
    const start = Math.round(atSec * sampleRate);
    const length = Math.round(0.06 * sampleRate);
    for (let i = 0; i < length && start + i < total; i += 1) {
      const t = i / sampleRate;
      const attack = Math.min(1, t / 0.002);
      const envelope = attack * Math.exp(-t / 0.012);
      const tone = Math.sin(2 * Math.PI * frequency * t);
      samples[start + i] += gain * envelope * (0.85 * tone + 0.15 * nextNoise());
    }
  };

  click(0.0, 1760, 0.55);
  click(0.5, 1320, 0.42);
  return samples;
}

mkdirSync(OUT_DIR, { recursive: true });
writeWav(join(OUT_DIR, 'tick.wav'), synthesizeTick(SAMPLE_RATE), SAMPLE_RATE);
process.stdout.write('wrote tick.wav (synthesised)\n');
