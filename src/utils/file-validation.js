const AUDIO_EXTENSION_PATTERN = /\.(mp3|wav|ogg|oga|m4a|aac|flac|webm)$/i;

export function validateAudioFile(file) {
  if (!file) {
    return { valid: false, reason: 'No file was provided.' };
  }

  if (file.size === 0) {
    return { valid: false, reason: 'The file is empty.' };
  }

  const hasAudioMime = typeof file.type === 'string' && file.type.startsWith('audio/');
  const hasAudioExtension = AUDIO_EXTENSION_PATTERN.test(file.name ?? '');

  if (!hasAudioMime && !hasAudioExtension) {
    return {
      valid: false,
      reason: 'Choose a browser-decodable audio file.',
    };
  }

  return { valid: true, reason: null };
}
