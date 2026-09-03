import { describe, expect, it } from 'vitest';
import {
  getExportFilename,
  getRenderFrameCount,
  getRenderableTracks,
} from '../src/audio/export-wav.js';

describe('WAV export helpers', () => {
  it('selects only decoded, ready, audible tracks', () => {
    const tracks = [
      { id: 'a', status: 'ready', muted: false, solo: false },
      { id: 'b', status: 'loading', muted: false, solo: false },
      { id: 'c', status: 'ready', muted: true, solo: false },
      { id: 'd', status: 'ready', muted: false, solo: false },
    ];
    const runtime = new Map([
      ['a', { audioBuffer: { duration: 1 } }],
      ['b', { audioBuffer: { duration: 1 } }],
    ]);

    expect(getRenderableTracks(tracks, runtime).map((track) => track.id)).toEqual(['a']);
  });

  it('applies solo rules to export track selection', () => {
    const tracks = [
      { id: 'a', status: 'ready', muted: false, solo: false },
      { id: 'b', status: 'ready', muted: false, solo: true },
      { id: 'c', status: 'ready', muted: true, solo: true },
    ];
    const runtime = new Map([
      ['a', { audioBuffer: { duration: 1 } }],
      ['b', { audioBuffer: { duration: 1 } }],
      ['c', { audioBuffer: { duration: 1 } }],
    ]);

    expect(getRenderableTracks(tracks, runtime).map((track) => track.id)).toEqual(['b']);
  });

  it('calculates at least one render frame', () => {
    expect(getRenderFrameCount(0, 48000)).toBe(1);
    expect(getRenderFrameCount(1.5, 48000)).toBe(72000);
  });

  it('uses the expected timestamped export filename', () => {
    expect(getExportFilename(new Date(2026, 8, 4, 2, 7))).toBe(
      'opmix-export-2026-09-04-0207.wav',
    );
  });
});
