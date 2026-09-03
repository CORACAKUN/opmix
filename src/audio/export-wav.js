import audioBufferToWav from 'audiobuffer-to-wav';
import { isTrackAudible } from '../state/project-store.js';

export function getRenderableTracks(tracks, runtimeByTrackId) {
  return tracks
    .filter((track) => track.status === 'ready')
    .filter((track) => isTrackAudible(track, tracks))
    .map((track) => ({
      ...track,
      audioBuffer: runtimeByTrackId.get(track.id)?.audioBuffer ?? null,
    }))
    .filter((track) => track.audioBuffer);
}

export function getRenderFrameCount(duration, sampleRate) {
  return Math.max(1, Math.ceil(duration * sampleRate));
}

export function getExportFilename(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `opmix-export-${year}-${month}-${day}-${hours}${minutes}.wav`;
}

export async function renderProjectToWav({ state, runtimeByTrackId, sampleRate }) {
  const renderableTracks = getRenderableTracks(state.tracks, runtimeByTrackId);

  if (!renderableTracks.length || state.duration <= 0) {
    throw new Error('Import at least one audible decoded track before exporting.');
  }

  const outputSampleRate = sampleRate || renderableTracks[0].audioBuffer.sampleRate;
  const frameCount = getRenderFrameCount(state.duration, outputSampleRate);
  const offlineContext = new OfflineAudioContext(2, frameCount, outputSampleRate);
  const masterGain = offlineContext.createGain();

  masterGain.gain.value = state.masterVolume;
  masterGain.connect(offlineContext.destination);

  renderableTracks.forEach((track) => {
    const source = offlineContext.createBufferSource();
    const gain = offlineContext.createGain();

    source.buffer = track.audioBuffer;
    gain.gain.value = track.volume;
    source.connect(gain);

    if (offlineContext.createStereoPanner) {
      const panner = offlineContext.createStereoPanner();
      panner.pan.value = track.pan;
      gain.connect(panner);
      panner.connect(masterGain);
    } else {
      gain.connect(masterGain);
    }

    source.start(track.offset, 0);
  });

  const renderedBuffer = await offlineContext.startRendering();
  return audioBufferToWav(renderedBuffer);
}

export function downloadWav(arrayBuffer, filename) {
  const blob = new Blob([arrayBuffer], { type: 'audio/wav' });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();

  setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 0);
}
