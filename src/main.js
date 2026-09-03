import './styles.css';
import WaveSurfer from 'wavesurfer.js';
import { decodeAudioFile } from './audio/audio-engine.js';
import { createProjectStore } from './state/project-store.js';
import { validateAudioFile } from './utils/file-validation.js';
import { formatTime } from './utils/format-time.js';
import { createNotifications } from './components/notifications.js';
import { renderTransport } from './components/transport.js';
import { renderTrackList } from './components/track-view.js';

const store = createProjectStore();
const notifications = createNotifications();
const trackRuntime = new Map();

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
      render();
    },
  });

  renderTrackList(trackList, {
    state,
    formatTime,
    onRemoveTrack: (trackId) => {
      disposeTrackRuntime(trackId);
      store.removeTrack(trackId);
      notifications.info('Track removed.');
      render();
    },
    onTrackChange: (trackId, patch) => {
      store.updateTrack(trackId, patch);

      if ('muted' in patch || 'solo' in patch || 'offset' in patch) {
        render();
      }
    },
  });

  mountWaveforms(state);
  notifications.render(statusRegion);
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

  runtime.waveform?.destroy();
  URL.revokeObjectURL(runtime.objectUrl);
  trackRuntime.delete(trackId);
}

window.addEventListener('beforeunload', () => {
  disposeWaveforms();
  trackRuntime.forEach((_, trackId) => disposeTrackRuntime(trackId));
});

render();
