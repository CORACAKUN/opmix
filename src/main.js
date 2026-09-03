import './styles.css';
import WaveSurfer from 'wavesurfer.js';
import { decodeAudioFile, getAudioContext, resumeAudioContext } from './audio/audio-engine.js';
import { getPeakLevel, isClipping } from './audio/meters.js';
import { createProjectStore } from './state/project-store.js';
import { validateAudioFile } from './utils/file-validation.js';
import { formatTime } from './utils/format-time.js';
import { createNotifications } from './components/notifications.js';
import { renderTransport } from './components/transport.js';
import { renderTrackList } from './components/track-view.js';

const store = createProjectStore();
const notifications = createNotifications();
const trackRuntime = new Map();
const playback = {
  animationFrameId: null,
  masterGain: null,
  analyser: null,
  meterData: null,
  startedAtContextTime: 0,
  startedAtProjectTime: 0,
  clipping: false,
};

const app = document.querySelector('#app');

async function importFiles(fileList) {
  const files = Array.from(fileList);

  if (!files.length) {
    return;
  }

  const rejected = [];
  const accepted = [];

  for (const file of files) {
    const validation = validateAudioFile(file);

    if (validation.valid) {
      accepted.push(file);
    } else {
      rejected.push(`${file.name}: ${validation.reason}`);
    }
  }

  const importJobs = accepted.map(async (file) => {
    const trackId = store.addTrack({
      name: file.name,
      duration: 0,
      status: 'loading',
    });

    render();

    try {
      const audioBuffer = await decodeAudioFile(file);
      const objectUrl = URL.createObjectURL(file);

      trackRuntime.set(trackId, {
        file,
        audioBuffer,
        objectUrl,
        waveform: null,
      });

      store.updateTrack(trackId, {
        duration: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate,
        channelCount: audioBuffer.numberOfChannels,
        status: 'ready',
        error: null,
      });
    } catch (error) {
      store.updateTrack(trackId, {
        status: 'error',
        error: error.message,
      });
      notifications.error(error.message);
    }
  });

  if (accepted.length) {
    notifications.success(
      `${accepted.length} file${accepted.length === 1 ? '' : 's'} queued for decoding.`,
    );
  }

  if (rejected.length) {
    notifications.error(rejected.join(' '));
  }

  render();
  await Promise.allSettled(importJobs);
  render();
}

function render() {
  const state = store.getState();
  disposeWaveforms();

  app.innerHTML = `
    <main class="studio-shell" aria-labelledby="app-title">
      <header class="studio-header">
        <div>
          <p class="eyebrow">Local audio mixer</p>
          <h1 id="app-title">opmix</h1>
        </div>
        <div class="header-actions">
          <label class="button primary" for="audio-import">Import audio</label>
          <input
            id="audio-import"
            class="visually-hidden"
            type="file"
            accept="audio/*,.mp3,.wav,.ogg,.m4a"
            multiple
          />
          <button class="button" type="button" disabled>Export WAV</button>
        </div>
      </header>

      <section class="transport-panel" aria-label="Transport controls"></section>

      <section class="workspace">
        <section class="drop-zone" tabindex="0" aria-label="Audio file drop zone">
          <div>
            <h2>${state.tracks.length ? 'Tracks' : 'Drop audio files here'}</h2>
            <p>
              ${
                state.tracks.length
                  ? `${state.tracks.length} track${state.tracks.length === 1 ? '' : 's'} in the project.`
                  : 'Import browser-decodable MP3, WAV, OGG, M4A, or other audio files.'
              }
            </p>
          </div>
        </section>

        <section class="track-list" aria-label="Imported tracks"></section>
      </section>

      <aside class="status-region" aria-live="polite"></aside>
    </main>
  `;

  const fileInput = app.querySelector('#audio-import');
  const dropZone = app.querySelector('.drop-zone');
  const transportPanel = app.querySelector('.transport-panel');
  const trackList = app.querySelector('.track-list');
  const statusRegion = app.querySelector('.status-region');

  fileInput.addEventListener('change', (event) => {
    importFiles(event.target.files);
    event.target.value = '';
  });

  dropZone.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropZone.classList.add('is-dragging');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('is-dragging');
  });

  dropZone.addEventListener('drop', (event) => {
    event.preventDefault();
    dropZone.classList.remove('is-dragging');
    importFiles(event.dataTransfer.files);
  });

  renderTransport(transportPanel, {
    state,
    formatTime,
    onMasterVolumeChange: (volume) => {
      store.setMasterVolume(volume);
      updateMasterVolume(volume);
    },
    onPlay: () => {
      play();
    },
    onPause: () => {
      pause();
    },
    onStop: () => {
      stop();
    },
    onSeek: (time) => {
      seek(time);
    },
  });

  renderTrackList(trackList, {
    state,
    formatTime,
    onRemoveTrack: (trackId) => {
      const wasPlaying = store.getState().status === 'playing';
      if (wasPlaying) {
        pause();
      }
      disposeTrackRuntime(trackId);
      store.removeTrack(trackId);
      notifications.info('Track removed.');
      render();
    },
    onTrackChange: (trackId, patch) => {
      store.updateTrack(trackId, patch);
      updateTrackRuntime(trackId);

      if ('muted' in patch || 'solo' in patch || 'offset' in patch) {
        if (store.getState().status === 'playing') {
          restartPlaybackAtCurrentTime();
        }
        render();
      }
    },
  });

  mountWaveforms(state);
  notifications.render(statusRegion);
}

async function play() {
  const state = store.getState();

  if (!state.tracks.some((track) => track.status === 'ready')) {
    notifications.error('Import a decoded audio track before playback.');
    render();
    return;
  }

  const context = await resumeAudioContext();
  stopSources();

  playback.masterGain = context.createGain();
  playback.analyser = context.createAnalyser();
  playback.analyser.fftSize = 2048;
  playback.meterData = new Uint8Array(playback.analyser.fftSize);
  playback.masterGain.gain.value = state.masterVolume;
  playback.masterGain.connect(playback.analyser);
  playback.analyser.connect(context.destination);
  playback.startedAtContextTime = context.currentTime;
  playback.startedAtProjectTime =
    state.currentTime >= state.duration ? 0 : state.currentTime;

  const audibleTrackIds = getAudibleTrackIds(state.tracks);

  state.tracks.forEach((track) => {
    const runtime = trackRuntime.get(track.id);

    if (!runtime?.audioBuffer || !audibleTrackIds.has(track.id)) {
      return;
    }

    scheduleTrack(context, track, runtime, playback.startedAtProjectTime);
  });

  store.setCurrentTime(playback.startedAtProjectTime);
  store.setStatus('playing');
  startVisualClock();
  render();
}

function pause() {
  const position = getPlaybackPosition();
  stopSources();
  store.setCurrentTime(position);
  store.setStatus('paused');
  stopVisualClock();
  render();
}

function stop() {
  stopSources();
  store.setCurrentTime(0);
  store.setStatus('ready');
  stopVisualClock();
  updateVisualTime(0);
  render();
}

function seek(time) {
  const wasPlaying = store.getState().status === 'playing';

  if (wasPlaying) {
    stopSources();
  }

  store.setCurrentTime(time);
  const currentTime = store.getState().currentTime;
  updateVisualTime(currentTime);
  syncWaveformCursors(currentTime);

  if (wasPlaying) {
    restartPlaybackAtCurrentTime();
  }
}

function restartPlaybackAtCurrentTime() {
  stopSources();
  store.setStatus('paused');
  play();
}

function scheduleTrack(context, track, runtime, projectTime) {
  const trackStart = track.offset;
  const trackEnd = track.offset + runtime.audioBuffer.duration;

  if (projectTime >= trackEnd) {
    return;
  }

  const source = context.createBufferSource();
  const gain = context.createGain();
  const panner = context.createStereoPanner();

  source.buffer = runtime.audioBuffer;
  gain.gain.value = track.volume;
  panner.pan.value = track.pan;

  source.connect(gain);
  gain.connect(panner);
  panner.connect(playback.masterGain);

  runtime.source = source;
  runtime.gain = gain;
  runtime.panner = panner;

  if (projectTime < trackStart) {
    source.start(context.currentTime + trackStart - projectTime, 0);
  } else {
    source.start(context.currentTime, projectTime - trackStart);
  }
}

function getAudibleTrackIds(tracks) {
  const hasSolo = tracks.some((track) => track.solo);

  return new Set(
    tracks
      .filter((track) => !track.muted && (!hasSolo || track.solo))
      .map((track) => track.id),
  );
}

function getPlaybackPosition() {
  const state = store.getState();

  if (state.status !== 'playing') {
    return state.currentTime;
  }

  const context = getAudioContext();
  return Math.min(
    state.duration,
    playback.startedAtProjectTime + context.currentTime - playback.startedAtContextTime,
  );
}

function startVisualClock() {
  stopVisualClock();

  function tick() {
    const position = getPlaybackPosition();

    store.setCurrentTime(position);
    updateVisualTime(position);
    syncWaveformCursors(position);
    updateMeter();

    if (position >= store.getState().duration) {
      stop();
      return;
    }

    playback.animationFrameId = requestAnimationFrame(tick);
  }

  playback.animationFrameId = requestAnimationFrame(tick);
}

function stopVisualClock() {
  if (playback.animationFrameId !== null) {
    cancelAnimationFrame(playback.animationFrameId);
    playback.animationFrameId = null;
  }
}

function updateMeter() {
  const meterFill = app.querySelector('[data-meter-fill]');
  const clippingWarning = app.querySelector('[data-clipping-warning]');

  if (!meterFill || !clippingWarning) {
    return;
  }

  if (!playback.analyser || !playback.meterData) {
    meterFill.style.width = '0%';
    meterFill.classList.remove('is-clipping');
    clippingWarning.hidden = true;
    return;
  }

  playback.analyser.getByteTimeDomainData(playback.meterData);
  const peak = getPeakLevel(playback.meterData);
  const clipping = isClipping(peak);

  meterFill.style.width = `${Math.round(peak * 100)}%`;
  meterFill.classList.toggle('is-clipping', clipping);
  clippingWarning.hidden = !clipping;
  playback.clipping = clipping;
}

function updateVisualTime(position) {
  const state = store.getState();
  const currentTime = app.querySelector('[data-current-time]');
  const timeline = app.querySelector('[data-project-timeline]');

  if (currentTime) {
    currentTime.textContent = formatTime(position);
  }

  if (timeline) {
    timeline.value = String(Math.min(position, state.duration));
  }
}

function syncWaveformCursors(projectTime) {
  store.getState().tracks.forEach((track) => {
    const runtime = trackRuntime.get(track.id);

    if (!runtime?.waveform || track.status !== 'ready') {
      return;
    }

    const trackTime = Math.min(
      Math.max(projectTime - track.offset, 0),
      track.duration,
    );

    runtime.waveform.setTime(trackTime);
  });
}

function stopSources() {
  trackRuntime.forEach((runtime) => {
    try {
      runtime.source?.stop();
    } catch {
      // BufferSourceNode can only be stopped once.
    }

    runtime.source?.disconnect();
    runtime.gain?.disconnect();
    runtime.panner?.disconnect();
    runtime.source = null;
    runtime.gain = null;
    runtime.panner = null;
  });

  playback.masterGain?.disconnect();
  playback.analyser?.disconnect();
  playback.masterGain = null;
  playback.analyser = null;
  playback.meterData = null;
  playback.clipping = false;
  updateMeter();
}

function updateMasterVolume(volume) {
  if (playback.masterGain) {
    playback.masterGain.gain.value = volume;
  }
}

function updateTrackRuntime(trackId) {
  const runtime = trackRuntime.get(trackId);
  const track = store.getState().tracks.find((candidate) => candidate.id === trackId);

  if (!runtime || !track) {
    return;
  }

  if (runtime.gain) {
    runtime.gain.gain.value = track.volume;
  }

  if (runtime.panner) {
    runtime.panner.pan.value = track.pan;
  }
}

function mountWaveforms(state) {
  state.tracks.forEach((track) => {
    const runtime = trackRuntime.get(track.id);

    if (!runtime?.objectUrl || track.status !== 'ready') {
      return;
    }

    const container = app.querySelector(`[data-waveform-id="${track.id}"]`);

    if (!container) {
      return;
    }

    runtime.waveform = WaveSurfer.create({
      container,
      url: runtime.objectUrl,
      height: 72,
      waveColor: '#35d7d0',
      progressColor: '#f5b14c',
      cursorColor: '#eef7f6',
      barWidth: 2,
      barGap: 2,
      barRadius: 2,
      normalize: true,
      interact: false,
    });

    runtime.waveform.on('error', (error) => {
      store.updateTrack(track.id, {
        status: 'error',
        error: 'Waveform rendering failed for this file.',
      });
      notifications.error(error?.message ?? 'Waveform rendering failed for this file.');
      render();
    });
  });
}

function disposeWaveforms() {
  trackRuntime.forEach((runtime) => {
    runtime.waveform?.destroy();
    runtime.waveform = null;
  });
}

function disposeTrackRuntime(trackId) {
  const runtime = trackRuntime.get(trackId);

  if (!runtime) {
    return;
  }

  try {
    runtime.source?.stop();
  } catch {
    // BufferSourceNode can only be stopped once.
  }

  runtime.source?.disconnect();
  runtime.gain?.disconnect();
  runtime.panner?.disconnect();
  runtime.waveform?.destroy();
  URL.revokeObjectURL(runtime.objectUrl);
  trackRuntime.delete(trackId);
}

window.addEventListener('beforeunload', () => {
  stopSources();
  stopVisualClock();
  disposeWaveforms();
  trackRuntime.forEach((_, trackId) => disposeTrackRuntime(trackId));
});

render();
