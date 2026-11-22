# QUIZ-004 — Professional Audio & Voiceover Foundation

**Branch:** `fix/sched-001-atomic-claims`, existing draft PR #2. **Status:** source changes committed; native tests/browser playback not yet verified.

## Added

- `src/lib/footballQuizAudio.ts`: pure, deterministic audio cue compiler driven from the same 30fps intro/question/countdown/reveal/halftime/outro visual timeline. No wall-clock random cue scheduling. Optional intro/final/halftime stings, per-second countdown ticks, urgent final-three-second beeps, suspense and answer reveal effects, optional question and answer narration scripts.
- `cuesBetweenFrames` dispatches only cue start points crossed by forward playback; backward seeking returns no cues. Browser hook caps large jumps to avoid triggering dozens of ticks when resuming from suspension.
- `musicGainAtFrame` calculates music fade-in/out and ducking during narration from frame position.
- `src/hooks/useFootballQuizAudioPreview.ts`: Web Audio synthesizes original, royalty-free-in-principle electronic cue tones (no third-party music copied); browser SpeechSynthesis provides optional local spoken preview; browser user-picked audio file loops as background music. AudioContext and object URLs are cleaned up on exit.
- `/templates/football-quiz` now has sound enable, separate ticks/effects/voice/music switches, per-layer volume sliders, ducking, voice speed, local music picker (MP3/WAV/OGG/M4A up to 30MB), narration script per question, and a compiled audio cue count.
- Quiz JSON download now includes audio settings, frame-indexed cues and the optional local music filename (file bytes **not embedded**).
- `backend/tests/footballQuizAudio.test.ts` covers sound opt-in, precise tick frames, narration boundary, safe seeking, deterministic cue sorting, ducking, end fades and invalid settings.

## Design/consent notes

- **No bundled copyrighted soundtrack or player narration.** Music is explicitly supplied by the editor user and remains on their local device.
- **Browser speech is NOT exported TTS audio.** Speech synthesis scheduling/duration depends on browser voices and OS. It can drift from the intended cue window or be canceled when a new utterance begins.
- **Actual embedded, mixed and frame-accurate video audio is pending QUIZ-005.** This milestone adds the cue contract and an editor listening preview, not an audio-rendering MP4 pipeline.
- Browser audio requires user gesture to unlock Web Audio and media autoplay; enable sound and click Play. If Chrome denies autoplay, browser is expected to remain visually usable.
- Imported music is only a temporary browser object URL. It does not upload or persist across reload; reselect the file after reopening. No music bytes are included in downloaded JSON.
- Do not assume a soundtrack is YouTube-safe merely because you own the file; use commercially cleared/licensed music.

## Verify locally

```powershell
cd "C:\Users\RSP.tech Solution\Desktop\video-maker-frontend"
git fetch origin
git switch fix/sched-001-atomic-claims
git pull --ff-only origin fix/sched-001-atomic-claims

npx tsc --noEmit
if ($LASTEXITCODE -ne 0) { throw "QUIZ-004 TypeScript failed" }
npm run build
if ($LASTEXITCODE -ne 0) { throw "QUIZ-004 Next build failed" }

cd backend
npm ci
npm run test:security
if ($LASTEXITCODE -ne 0) { throw "QUIZ-004 audio cue tests failed" }
npm run build
if ($LASTEXITCODE -ne 0) { throw "QUIZ-004 backend build failed" }
```

### Browser QA at `http://localhost:3000/templates/football-quiz`

1. Open as guest. Verify sound is OFF by default and video preview works silently.
2. Enable sound, click Play. Confirm ticks begin exactly at 00:25, become more urgent at 00:32, suspense plays at 00:35, and answer sting plays at 00:38.
3. Seek backwards across those boundaries while paused; no sounds should fire from seeking alone.
4. Play with browser voice enabled. Verify question narration starts at 00:18 and answer narration at 00:38; disable voice and confirm silence.
5. Edit per-question narration; repeat preview and confirm new wording is spoken.
6. Select a locally owned/cleared MP3; verify it loops, can be muted, and is quieted under spoken narration.
7. Test disabled Web Audio / blocked autoplay: visual editor should not crash.
8. Pause and change tabs. Confirm sound playback stops and the timer pauses.
9. Export timeline JSON; verify the audio cue frame schedule, volume settings and filename metadata are present, and no audio bytes or bearer tokens are included.
10. Verify malformed audio file types/oversized inputs are rejected and the previous sound settings remain intact.

## Known limitations for upcoming release

- Web Audio playback uses simple synthesized cues. A studio-produced sound pack and licensing manifest can replace these after asset review.
- TTS duration is not measured against scene length; long explanations may be cut off. QUIZ-005 must require a recorded/rendered narration asset with verified duration or automatically extend the timeline before exporting.
- Audio cue metadata is portable to the backend, but there is no Remotion audio composition, muxing, audio waveform preview, real exported file, or audio parity gate yet.
- Production audio should include clipping prevention, per-track gain envelopes, asset signing, upload validation, playback policy fallbacks, output loudness review and real-browser/Android testing.
- Existing SEC-002 npm advisories and upload security blockers remain unresolved.
