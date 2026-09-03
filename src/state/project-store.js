const DEFAULT_MASTER_VOLUME = 1;
const DEFAULT_TRACK_VALUES = {
  volume: 1,
  pan: 0,
  muted: false,
  solo: false,
  offset: 0,
  duration: 0,
  status: 'ready',
};
const TRANSPORT_STATUSES = new Set(['empty', 'ready', 'playing', 'paused', 'loading', 'error']);

function createId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `track-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value)));
}

function getProjectDuration(tracks) {
  return tracks.reduce((duration, track) => {
    return Math.max(duration, track.offset + track.duration);
  }, 0);
}

export function isTrackAudible(track, tracks) {
  const hasSolo = tracks.some((candidate) => candidate.solo);
  return !track.muted && (!hasSolo || track.solo);
}

export function createProjectStore(initialState = {}) {
  let state = {
    name: initialState.name ?? 'Untitled Mix',
    status: initialState.status ?? 'empty',
    currentTime: initialState.currentTime ?? 0,
    duration: initialState.duration ?? 0,
    masterVolume: initialState.masterVolume ?? DEFAULT_MASTER_VOLUME,
    tracks: initialState.tracks ? [...initialState.tracks] : [],
  };

  function commit(nextState) {
    const tracks = nextState.tracks ?? state.tracks;
    state = {
      ...state,
      ...nextState,
      tracks,
      duration: getProjectDuration(tracks),
      status: tracks.length ? (nextState.status ?? state.status) : 'empty',
    };
  }

  return {
    getState() {
      return {
        ...state,
        tracks: state.tracks.map((track) => ({ ...track })),
      };
    },

    addTrack(track) {
      const nextTrack = {
        ...DEFAULT_TRACK_VALUES,
        ...track,
        id: track.id ?? createId(),
        volume: clamp(track.volume ?? DEFAULT_TRACK_VALUES.volume, 0, 1.5),
        pan: clamp(track.pan ?? DEFAULT_TRACK_VALUES.pan, -1, 1),
        offset: Math.max(0, Number(track.offset ?? DEFAULT_TRACK_VALUES.offset)),
        duration: Math.max(0, Number(track.duration ?? DEFAULT_TRACK_VALUES.duration)),
      };

      commit({
        status: 'ready',
        tracks: [...state.tracks, nextTrack],
      });

      return nextTrack.id;
    },

    removeTrack(trackId) {
      commit({
        tracks: state.tracks.filter((track) => track.id !== trackId),
      });
    },

    updateTrack(trackId, patch) {
      commit({
        tracks: state.tracks.map((track) => {
          if (track.id !== trackId) {
            return track;
          }

          return {
            ...track,
            ...patch,
            volume:
              patch.volume === undefined ? track.volume : clamp(patch.volume, 0, 1.5),
            pan: patch.pan === undefined ? track.pan : clamp(patch.pan, -1, 1),
            offset:
              patch.offset === undefined ? track.offset : Math.max(0, Number(patch.offset)),
            duration:
              patch.duration === undefined
                ? track.duration
                : Math.max(0, Number(patch.duration)),
          };
        }),
      });
    },

    setCurrentTime(time) {
      commit({
        currentTime: clamp(time, 0, state.duration),
      });
    },

    setStatus(status) {
      if (!TRANSPORT_STATUSES.has(status)) {
        return;
      }

      commit({ status });
    },

    setMasterVolume(volume) {
      commit({
        masterVolume: clamp(volume, 0, 1.5),
      });
    },
  };
}

export { getProjectDuration };
