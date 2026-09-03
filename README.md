# opmix

opmix is a local browser-based multitrack audio mixer MVP. It is being built in phases from the product plan in `Audio-Remix-Studio-Plan.md`.

## Current Phase

Phase 1 foundation:

- Vite project scaffold
- Dark responsive studio shell
- File picker and drag-and-drop validation shell
- Project state utilities
- Initial Vitest coverage for state, duration, file validation, and mute/solo rules

Phase 2 import and waveform:

- Browser audio decoding with the shared Web Audio context
- Per-track object URL and decoded buffer runtime storage
- WaveSurfer rendering for decoded tracks
- Track removal cleanup for object URLs and waveform instances
- Import error state for undecodable files

Synchronized playback, metering, and WAV export are planned for later phases.

## Run Locally

```bash
npm install
npm run dev
```

## Verify

```bash
npm test
npm run build
```

## Privacy

The MVP is designed so imported audio is processed locally in the browser. Do not upload or remix audio unless you own it or have permission.
