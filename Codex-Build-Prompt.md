# Codex Build Prompt — MixForge MVP

Copy the prompt below into Codex in VS Code after opening an empty project folder.

---

You are building **MixForge**, a browser-based multitrack audio mixer. Read `Audio-Remix-Studio-Plan.md` completely before making changes and use it as the product specification.

Build the MVP with Vite, vanilla HTML/CSS/JavaScript using ES modules, Tone.js, WaveSurfer.js, and a small WAV encoder. Use Vitest for unit tests. Do not add React, TypeScript, a database, authentication, cloud storage, or a backend.

Work autonomously through the phases in the plan, but keep each change understandable. First inspect the current folder and preserve any existing user files. If the folder is empty, initialize the application. Do not overwrite unrelated work.

Required functionality:

1. Import browser-decodable audio with both a file picker and drag-and-drop.
2. Show a waveform, name, and duration for every track.
3. Support at least four simultaneous tracks.
4. Use one shared audio clock so play, pause, stop, and seek remain synchronized.
5. Give every track volume, pan, mute, solo, start-offset, and remove controls.
6. Add master volume, an output peak meter, and a clipping warning.
7. Export a stereo WAV using offline rendering. The export must honor volume, pan, mute, solo, and offsets.
8. Provide responsive, accessible UI states for empty, loading, playing, paused, exporting, success, and error conditions.
9. Release object URLs, audio nodes, event listeners, and WaveSurfer instances when no longer needed.
10. Add tests for pure state behavior, file validation, duration calculations, and mute/solo rules.

Engineering constraints:

- Keep project state separate from audio runtime objects and DOM rendering.
- Use modules with small, clear responsibilities.
- Use the audio context clock for scheduling; use `requestAnimationFrame` only for visual updates.
- Do not use `setInterval` to synchronize playback.
- Do not create a separate `AudioContext` for each track.
- Handle decode and export errors without crashing the app.
- Do not claim that every M4A or compressed codec works in every browser; accept formats the active browser can decode.
- Do not add placeholder buttons. Every visible control must work or be clearly disabled.
- Do not use copyrighted demo tracks.

Visual direction:

- Create an original dark studio interface with a charcoal background, cyan/teal waveform accents, and amber clipping warnings.
- Keep controls readable and touch-friendly.
- Include visible keyboard focus states and labels for sliders and icon buttons.
- Make the layout usable at 360 px width and on desktop.

Workflow:

1. Inspect the repository and summarize what exists.
2. Write a short implementation checklist.
3. Implement the foundation and audio architecture.
4. Run tests and the production build after meaningful phases.
5. Fix failures before proceeding.
6. At completion, report the files changed, features completed, commands run, test/build results, limitations, and the next recommended improvement.

Before declaring completion, run:

```bash
npm test
npm run build
```

Also manually verify, as far as the environment permits:

- Importing multiple audio files
- Play/pause/stop/seek
- Volume/pan/mute/solo
- Offset behavior
- Track removal
- WAV export
- Mobile-width layout
- No uncaught console errors

If browser interaction is unavailable, say exactly which behaviors still require manual verification instead of claiming they were tested.

---

## Optional follow-up prompt

After Codex completes the first build, use this:

> Review the completed MixForge MVP against every acceptance criterion in `Audio-Remix-Studio-Plan.md`. Diagnose and fix functional, synchronization, memory-cleanup, accessibility, responsive-layout, and WAV-export problems. Run the full test and production build afterward. Do not add new features until all MVP criteria pass. Report what you verified manually and what still needs browser testing.
