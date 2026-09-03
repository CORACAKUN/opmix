export function renderTransport(container, { state, formatTime, onMasterVolumeChange }) {
  container.innerHTML = `
    <div>
      <div class="transport-actions">
        <button type="button" disabled aria-label="Play">Play</button>
        <button type="button" disabled aria-label="Pause">Pause</button>
        <button type="button" disabled aria-label="Stop">Stop</button>
      </div>
      <p class="time-readout">${formatTime(state.currentTime)} / ${formatTime(state.duration)}</p>
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
}
