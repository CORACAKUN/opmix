# Audio Remix Studio — MVP Development Plan

Working name in this plan: **opmix**. Check domain, social handle, and trademark availability before using a name commercially.

## Product goal

Build a responsive browser-based multitrack audio mixer where a user can import audio files, view their waveforms, play tracks in sync, adjust each track, and export the finished mix as a WAV file.

The MVP should run locally and process audio inside the browser. It should not require registration, a database, cloud storage, or a server.

## Recommended stack

- Vite
- Vanilla HTML, CSS, and JavaScript using ES modules
- Web Audio API for audio routing and processing
- Tone.js for transport, timing, playback, volume, and panning
- WaveSurfer.js for waveform rendering and seeking
- `audiobuffer-to-wav` or an equivalent small WAV encoder for export
- Vitest for unit tests
- Playwright for one basic end-to-end test if time permits

Avoid React and a backend in the MVP. The audio engine is the difficult part, so keep the interface architecture simple first.

## MVP requirements

### Track management

- Import MP3, WAV, OGG, M4A, or other browser-decodable audio files.
- Support at least four tracks.
- Allow drag-and-drop and file-picker imports.
- Show filename, duration, and waveform for each track.
- Remove a track and release its audio resources.
- Reject invalid or undecodable files with a helpful message.

### Transport

- Play and pause all tracks together.
- Stop and return the playhead to zero.
- Seek using the master timeline or waveform.
- Display current time and total project duration.
- Keep all tracks synchronized using one shared audio clock.
- Disable playback until the browser audio context is resumed by a user gesture.

### Mixer controls

Each track must have:

- Volume control
- Stereo pan control
- Mute button
- Solo button
- Start-offset control
- Visible active, muted, and solo states

The master section must have:

- Master volume
- Output peak meter
- Clipping warning

### Export

- Render the complete project offline.
- Export a stereo WAV file.
- Apply track volume, pan, mute, solo, and start offset to the export.
- Show rendering progress or a clear busy state.
- Use a filename such as `opmix-export-YYYY-MM-DD-HHMM.wav`.

## Non-goals for the first version

- User accounts
- Saving projects to a server
- Real-time collaboration
- MP3 export
- Vocal separation or stem generation
- MIDI editing
- Time stretching without pitch changes
- Destructive waveform editing
- Mobile recording
- Commercial sample library

## Suggested interface

1. Header with project name and import/export buttons.
2. Main transport bar with play, pause, stop, timer, and master volume.
3. Scrollable track list containing waveform and mixer controls.
4. Empty state with drag-and-drop instructions.
5. Small status/toast area for errors and completion messages.

Use a dark studio-style interface, strong contrast, keyboard-accessible controls, responsive layout, and visible focus states. Do not imitate the branding or exact interface of an existing commercial audio product.

## Suggested folder structure

```text
opmix/
├── index.html
├── package.json
├── README.md
├── src/
│   ├── main.js
│   ├── styles.css
│   ├── audio/
│   │   ├── audio-engine.js
│   │   ├── export-wav.js
│   │   └── meters.js
│   ├── components/
│   │   ├── transport.js
│   │   ├── track-view.js
│   │   └── notifications.js
│   ├── state/
│   │   └── project-store.js
│   └── utils/
│       ├── file-validation.js
│       └── format-time.js
└── tests/
    ├── project-store.test.js
    └── file-validation.test.js
```

## Data model

```js
const project = {
  name: "Untitled Mix",
  currentTime: 0,
  duration: 0,
  masterVolume: 1,
  tracks: [
    {
      id: crypto.randomUUID(),
      name: "drums.wav",
      file: null,
      audioBuffer: null,
      volume: 1,
      pan: 0,
      muted: false,
      solo: false,
      offset: 0
    }
  ]
};
```

Do not serialize `File`, `AudioBuffer`, Tone nodes, or WaveSurfer instances into local storage. Keep serializable settings separate from runtime audio objects.

## Audio architecture rules

- Use one `AudioContext` and one master output chain.
- Use the audio clock as the source of truth; do not synchronize tracks with repeated JavaScript timers.
- Create a gain node and stereo panner for each track.
- Define solo behavior clearly: if at least one track is soloed, only soloed and non-muted tracks are audible.
- Recreate one-shot buffer source nodes when playback restarts if using raw Web Audio sources.
- Disconnect nodes and destroy waveform instances when tracks are removed.
- Use `requestAnimationFrame` only to update the visual playhead and meters.
- Clamp gain values and report clipping instead of silently distorting output.
- Decode locally imported files with the shared audio context.

## Implementation phases

### Phase 1 — Foundation

- Initialize Vite.
- Install dependencies.
- Build the responsive empty-state interface.
- Create project state and utility modules.

Acceptance: the app starts with `npm run dev`, has no console errors, and works at desktop and mobile widths.

### Phase 2 — Import and waveform

- Add drag-and-drop and file-picker import.
- Validate and decode files.
- Create one waveform per track.
- Add track removal and clean resource disposal.

Acceptance: at least four valid audio files can be imported, displayed, and removed safely.

### Phase 3 — Synchronized playback

- Implement shared transport.
- Add play, pause, stop, and seek.
- Update the timer and playhead.
- Handle offsets and tracks shorter than the project duration.

Acceptance: repeated play/pause/seek operations keep tracks aligned without obvious drift.

### Phase 4 — Mixer

- Add volume, pan, mute, and solo.
- Add master volume and metering.
- Add clipping indication.

Acceptance: controls affect playback immediately and solo/mute combinations behave predictably.

### Phase 5 — WAV export

- Rebuild the routing graph using `OfflineAudioContext`.
- Render the project to a stereo buffer.
- Encode and download WAV.
- Add export loading, success, and error states.

Acceptance: the downloaded WAV matches the audible mix and plays in an external player.

### Phase 6 — Quality pass

- Add unit tests for pure state and validation logic.
- Add accessible labels and keyboard operation.
- Test corrupted files, unsupported formats, long files, track removal during pause, rapid transport clicks, and empty export.
- Update the README with setup, architecture, limitations, and browser support.

## Definition of done

- `npm install`, `npm run dev`, `npm run build`, and `npm test` succeed.
- No uncaught errors during the main workflow.
- Four tracks play in sync.
- Mixer controls work during playback and export.
- Exported WAV is valid.
- UI is usable at 360 px and normal desktop widths.
- Object URLs, WaveSurfer instances, and audio nodes are cleaned up.
- README explains how to run and use the project.

## Later upgrades

After the MVP is stable, consider trim regions, looping, effects, microphone recording, undo/redo, project persistence, PHP/Laravel APIs, MySQL metadata, S3 audio storage, FFmpeg conversion, authentication, and shareable projects.

## Copyright and privacy

- Tell users to upload only audio they own or have permission to remix.
- In the local MVP, state that audio stays in the browser and is not uploaded.
- Do not bundle copyrighted music or samples. Use self-created or openly licensed demo audio.

