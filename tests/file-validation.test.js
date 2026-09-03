import { describe, expect, it } from 'vitest';
import { validateAudioFile } from '../src/utils/file-validation.js';

function makeFile({ name = 'clip.wav', type = 'audio/wav', size = 12 } = {}) {
  return { name, type, size };
}

describe('validateAudioFile', () => {
  it('accepts files with audio MIME types', () => {
    expect(validateAudioFile(makeFile({ name: 'clip.bin', type: 'audio/mpeg' }))).toEqual({
      valid: true,
      reason: null,
    });
  });

  it('accepts known audio extensions when a browser omits MIME type', () => {
    expect(validateAudioFile(makeFile({ name: 'clip.m4a', type: '' }))).toEqual({
      valid: true,
      reason: null,
    });
  });

  it('rejects empty files', () => {
    expect(validateAudioFile(makeFile({ size: 0 })).valid).toBe(false);
  });

  it('rejects non-audio files', () => {
    expect(validateAudioFile(makeFile({ name: 'notes.txt', type: 'text/plain' })).valid).toBe(
      false,
    );
  });
});
