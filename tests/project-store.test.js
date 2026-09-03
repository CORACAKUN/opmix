import { describe, expect, it } from 'vitest';
import {
  createProjectStore,
  getProjectDuration,
  isTrackAudible,
} from '../src/state/project-store.js';

describe('project store', () => {
  it('adds tracks and calculates project duration from offsets', () => {
    const store = createProjectStore();

    store.addTrack({ id: 'a', name: 'drums.wav', duration: 8, offset: 0 });
    store.addTrack({ id: 'b', name: 'bass.wav', duration: 5, offset: 4 });

    expect(store.getState().duration).toBe(9);
  });

  it('clamps track controls to supported ranges', () => {
    const store = createProjectStore();

    store.addTrack({ id: 'a', name: 'lead.wav', duration: 2 });
    store.updateTrack('a', {
      volume: 2,
      pan: -3,
      offset: -10,
    });

    const [track] = store.getState().tracks;

    expect(track.volume).toBe(1.5);
    expect(track.pan).toBe(-1);
    expect(track.offset).toBe(0);
  });

  it('returns cloned state snapshots', () => {
    const store = createProjectStore();

    store.addTrack({ id: 'a', name: 'keys.wav', duration: 2 });
    const snapshot = store.getState();
    snapshot.tracks[0].name = 'changed.wav';

    expect(store.getState().tracks[0].name).toBe('keys.wav');
  });

  it('tracks valid transport status values', () => {
    const store = createProjectStore();

    store.addTrack({ id: 'a', name: 'keys.wav', duration: 2 });
    store.setStatus('playing');
    store.setStatus('invalid');

    expect(store.getState().status).toBe('playing');
  });
});

describe('duration calculations', () => {
  it('handles an empty track list', () => {
    expect(getProjectDuration([])).toBe(0);
  });

  it('uses the latest ending track', () => {
    expect(
      getProjectDuration([
        { duration: 3, offset: 0 },
        { duration: 4, offset: 8 },
        { duration: 20, offset: 1 },
      ]),
    ).toBe(21);
  });
});

describe('mute and solo rules', () => {
  it('keeps unmuted tracks audible when no track is soloed', () => {
    const tracks = [
      { id: 'a', muted: false, solo: false },
      { id: 'b', muted: true, solo: false },
    ];

    expect(isTrackAudible(tracks[0], tracks)).toBe(true);
    expect(isTrackAudible(tracks[1], tracks)).toBe(false);
  });

  it('only allows soloed and unmuted tracks when any solo exists', () => {
    const tracks = [
      { id: 'a', muted: false, solo: false },
      { id: 'b', muted: false, solo: true },
      { id: 'c', muted: true, solo: true },
    ];

    expect(isTrackAudible(tracks[0], tracks)).toBe(false);
    expect(isTrackAudible(tracks[1], tracks)).toBe(true);
    expect(isTrackAudible(tracks[2], tracks)).toBe(false);
  });
});
