import { describe, expect, it } from 'vitest';
import { getPeakLevel, isClipping } from '../src/audio/meters.js';

describe('meter utilities', () => {
  it('returns silence for empty or centered waveform data', () => {
    expect(getPeakLevel([])).toBe(0);
    expect(getPeakLevel(Uint8Array.from([128, 128, 128]))).toBe(0);
  });

  it('normalizes byte time-domain data to a peak level', () => {
    expect(getPeakLevel(Uint8Array.from([128, 192]))).toBe(0.5);
    expect(getPeakLevel(Uint8Array.from([0, 128, 255]))).toBeCloseTo(1);
  });

  it('detects clipping at the configured threshold', () => {
    expect(isClipping(0.97)).toBe(false);
    expect(isClipping(0.98)).toBe(true);
  });
});
