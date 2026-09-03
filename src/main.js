import './styles.css';
import { createProjectStore } from './state/project-store.js';
import { validateAudioFile } from './utils/file-validation.js';
import { formatTime } from './utils/format-time.js';
import { createNotifications } from './components/notifications.js';
import { renderTransport } from './components/transport.js';
import { renderTrackList } from './components/track-view.js';

const store = createProjectStore();
const notifications = createNotifications();

const app = document.querySelector('#app');

function importFiles(fileList) {
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

  accepted.forEach((file) => {
    store.addTrack({
      name: file.name,
      file,
      duration: 0,
      status: 'pending',
    });
  });

  if (accepted.length) {
    notifications.success(
      `${accepted.length} file${accepted.length === 1 ? '' : 's'} queued for audio import.`,
    );
  }

  if (rejected.length) {
    notifications.error(rejected.join(' '));
  }

  render();
}

function render() {
  const state = store.getState();

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
                  ? `${state.tracks.length} track${state.tracks.length === 1 ? '' : 's'} loaded.`
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
      store.removeTrack(trackId);
      notifications.info('Track removed.');
      render();
    },
    onTrackChange: (trackId, patch) => {
      store.updateTrack(trackId, patch);
      render();
    },
  });

  notifications.render(statusRegion);
}

render();
