export function renderTransport(
  container,
  {
    state,
    formatTime,
    onMasterVolumeChange,
    onPlay,
    onPause,
    onStop,
    onSeek,
  },
) {
  const hasReadyTracks = state.tracks.some((track) => track.status === 'ready');
  const isPlaying = state.status === 'playing';
  const playDisabled = !hasReadyTracks || isPlaying;
  const pauseDisabled = !isPlaying;
  const stopDisabled = !hasReadyTracks;

  container.innerHTML = `
    <div>
      <div class="transport-actions">
        <button type="button" data-action="play" ${playDisabled ? 'disabled' : ''} aria-label="Play">Play</button>
        <button type="button" data-action="pause" ${pauseDisabled ? 'disabled' : ''} aria-label="Pause">Pause</button>
        <button type="button" data-action="stop" ${stopDisabled ? 'disabled' : ''} aria-label="Stop">Stop</button>
      </div>
      <p class="time-readout">
        <span data-current-time>${formatTime(state.currentTime)}</span> / ${formatTime(state.duration)}
      </p>
      <label class="timeline-control" for="project-timeline">
        Timeline
        <input
          id="project-timeline"
          data-project-timeline
          type="range"
          min="0"
          max="${Math.max(state.duration, 0)}"
          step="0.01"
          value="${state.currentTime}"
          ${hasReadyTracks ? '' : 'disabled'}
        />
      </label>
    </div>
    <div class="master-control">
      <label for="master-volume">Master volume</label>
      <input
        id="master-volume"
        type="range"
        min="0"
        max="1.5"
        step="0.01"
        value="${state.masterVolume}"
      />
      <div class="meter" aria-label="Output peak meter">
        <span class="meter-fill"></span>
      </div>
    </div>
  `;

  container.querySelector('#master-volume').addEventListener('input', (event) => {
    onMasterVolumeChange(Number(event.target.value));
  });

  container.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');

    if (!button) {
      return;
    }

    if (button.dataset.action === 'play') {
      onPlay();
      return;
    }

    if (button.dataset.action === 'pause') {
      onPause();
      return;
    }

    if (button.dataset.action === 'stop') {
      onStop();
    }
  });

  container.querySelector('[data-project-timeline]').addEventListener('input', (event) => {
    onSeek(Number(event.target.value));
  });
}
