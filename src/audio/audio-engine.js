let audioContext;

export function getAudioContext() {
  if (!audioContext) {
    const AudioContextConstructor =
      globalThis.AudioContext ?? globalThis.webkitAudioContext;

    if (!AudioContextConstructor) {
      throw new Error('This browser does not support the Web Audio API.');
    }

    audioContext = new AudioContextConstructor();
  }

  return audioContext;
}

export async function decodeAudioFile(file) {
  const context = getAudioContext();
  const arrayBuffer = await file.arrayBuffer();

  try {
    return await context.decodeAudioData(arrayBuffer.slice(0));
  } catch (error) {
    throw new Error(
      `Could not decode "${file.name}". The file may be corrupted or unsupported by this browser.`,
      { cause: error },
    );
  }
}

export async function resumeAudioContext() {
  const context = getAudioContext();

  if (context.state === 'suspended') {
    await context.resume();
  }

  return context;
}
