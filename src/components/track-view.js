import { isTrackAudible } from '../state/project-store.js';

export function renderTrackList(
  container,
  { state, formatTime, onRemoveTrack, onTrackChange },
) {
  if (!state.tracks.length) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = state.tracks
    .map((track) => {
      const audible = isTrackAudible(track, state.tracks);

      return `
        <article class="track-row" data-track-id="${track.id}">
          <div>
            <div class="track-heading">
              <span class="track-name">${escapeHtml(track.name)}</span>
              <span>${formatTime(track.duration)}</span>
            </div>
            <div class="waveform-placeholder" role="img" aria-label="Waveform placeholder"></div>
            <p>${audible ? 'Audible' : 'Muted by mixer state'}</p>
          </div>

          <div class="track-controls">
            <label class="control">
              Volume
              <input data-field="volume" type="range" min="0" max="1.5" step="0.01" value="${track.volume}" />
            </label>
            <label class="control">
              Pan
              <input data-field="pan" type="range" min="-1" max="1" step="0.01" value="${track.pan}" />
            </label>
            <label class="control">
              Offset
              <input data-field="offset" type="number" min="0" step="0.1" value="${track.offset}" />
            </label>
            <button
              type="button"
              class="${track.muted ? 'toggle-active' : ''}"
              data-action="mute"
              aria-pressed="${track.muted}"
            >
              Mute
            </button>
            <button
              type="button"
              class="${track.solo ? 'toggle-active' : ''}"
              data-action="solo"
              aria-pressed="${track.solo}"
            >
              Solo
            </button>
            <button type="button" data-action="remove">Remove</button>
          </div>
        </article>
      `;
    })
    .join('');

  container.addEventListener('input', (event) => {
    const input = event.target.closest('[data-field]');

    if (!input) {
      return;
    }

    const row = input.closest('[data-track-id]');
    onTrackChange(row.dataset.trackId, {
      [input.dataset.field]: Number(input.value),
    });
  });

  container.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');

    if (!button) {
      return;
    }

    const row = button.closest('[data-track-id]');
    const track = state.tracks.find((candidate) => candidate.id === row.dataset.trackId);

    if (button.dataset.action === 'remove') {
      onRemoveTrack(track.id);
      return;
    }

    if (button.dataset.action === 'mute') {
      onTrackChange(track.id, { muted: !track.muted });
      return;
    }

    if (button.dataset.action === 'solo') {
      onTrackChange(track.id, { solo: !track.solo });
    }
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    }[character];
  });
}
