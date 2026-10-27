# To do

Status as of the public GitHub repo (`main`, plus `feat/pause-button`).
Live: https://spooky-story-maker.vercel.app

## Now: finish the first release

- [ ] Merge `feat/pause-button` into `main` (it was branched before the streaming change, so resolve the README and TODO conflicts), then `npm run deploy`
- [ ] Play a full story on the live site, and on the Vega virtual device
- [ ] Vega: confirm the real Back and Play/Pause key names on the device (the
      test page in `vega/assets/index.html` shows them), then update
      `web-app/app/src/remote.ts` if they differ
- [ ] Vega: delete `vega/assets/index.html` once the hosted app is confirmed
- [ ] Vega: check focus glow, layout at TV resolution and audio latency on a real device
- [ ] Music: find two royalty-free loops and save them as
      `web-app/app/assets/sounds/music-title.mp3` (about 45 s, playful) and
      `music-story.mp3` (about 60 s, quiet music box under narration), then
      `npm run sounds`
- [ ] Music: check the licence allows use in a published app, and add the
      credit to `README.md`
- [ ] Check the ElevenLabs plan's licence terms (free plan: attribution, no
      commercial use) before anyone publishes this
- [ ] Listen through the menus and stories, and remake any clip that sounds off (`npm run sounds -- --force`)
- [ ] Fix the "picks to first narration audio" timer on web. It reads about
      8 ms because `expo-audio` reports `playing` at the moment `play()` is
      called. Use a real signal (for example `currentTime > 0`) before any
      number goes in a README

## Decisions

- [ ] Narrator voice: currently George (`JBFqnCBsd6RMkjVDRZzb`), set in
      `NARRATOR_VOICE_ID`. Keep, or pick another from the library? Changing it
      makes new clips, so decide before the cache fills up
- [ ] Heroes' voices: premade (Laura, Jessica, Charlie) on the free plan. Keep,
      or upgrade and design custom voices?

## Optional

- [ ] Pre-generate all 270 clips once so the first play is instant (costs ElevenLabs credit)
- [ ] Vercel Firewall rate-limit rule on `/api/` (the cache already caps ElevenLabs spend)
- [ ] Vercel MCP: restart Claude Code and sign in via `/mcp`
- [ ] Vercel guidance plugin: run `! npx plugins add vercel/vercel-plugin` yourself (blocked in auto mode)
- [ ] Run `npm audit` in `web-app/app/` and look at the 5 high-severity warnings

## Now: pre-record the clips (LADR-4)

- [ ] Write `web-app/scripts/pre-record-clips.ts`: for every story and page, generate the narration and sting with the same settings as the API, and save them to Blob (or `web-app/app/assets/clips/` if we'd rather ship them)
- [ ] Re-run it only for clips whose text, voice or model changed
- [ ] Check all 270 clips play on the live site and on Vega. Count the credit used and record it below
- [ ] Record the credit used per story in the cost study below

## Cost study: live generation (LADR-15)

Before any personalised or AI-written audio, know what a play costs.

- [ ] Work out the credit per story: characters of narration plus the five stings, using current ElevenLabs pricing (look it up, don't assume)
- [ ] Work out plays per month for a realistic Halloween spike, and the monthly credit that needs
- [ ] Compare ways to cut it:
  - cache by page as now, and reuse common stings across stories
  - shorter narration, or fewer stings
  - a cheaper or faster TTS model, and check the narration still sounds right for kids
  - a spend cap and a daily limit per key
- [ ] Write the result as a new LADR

## Next: the child's name and themed lessons

The name and themes should land in the stories without changing how the audio cache works.

- [ ] **Name slot.** The child types or picks a name, which fills `{child}` in the story text.
  - Filter it first: letters only, about 12 characters, and never sent to ElevenLabs unescaped.
  - Show it as a caption first. Spoken names need one clip per name, so the cache would outgrow 270 clips. Decide before making the audio personal.
- [ ] **Themed lessons.** Tag each story with a theme (sharing, kindness, bravery, telling the truth, tidying up, listening to friends) and add one light line on the last page. Keep it short, so it doesn't read like a moral.
  - Add a `theme` field to `web-app/content/snippets.json`, and map each hero's trick to a lesson.
- [ ] **Cache keys.** Any new variable (name, theme, voice) goes into the Blob path in `web-app/app/api/[kind]/[storyId]/[page].ts`. Otherwise a changed story serves old audio.
- [ ] Test a long name, an odd name and a real word ("Sword", "Mum") on a device.

## Before any live story generation: guardrails (must-do)

A live AI would write the words a child hears, so none of this is optional.

- [ ] Check every generated story before it's spoken: a moderation check, and a second model asking "is this right for a 5-year-old?". Fall back to a fixed story if either fails.
- [ ] Keep the name and theme as the only free text. Filter and limit them, and treat them as untrusted (prompt injection).
- [ ] Build an eval set of tricky names and requests, and run it on every prompt change.
- [ ] Tone limits: nothing truly frightening, nobody gets hurt, no brands, no personal details beyond the name.
- [ ] Parents: say the stories are AI-written, let them report a bad one, and let them switch to fixed stories.
- [ ] Privacy: no accounts, no storing the name beyond the session (or a clear retention rule), no recording of voices.
- [ ] Cost: a spend cap on the ElevenLabs key and a daily limit on generated stories.
- [ ] Have someone outside the project review it before children see it.

## Later

- Word-by-word captions (TTS with timestamps)
- Characters voicing their own lines (Text to Dialogue)
- Other languages (Spanish, Hindi)
- A native (non-WebView) Vega build

## Done

- [x] Cut the uncached narration delay: the API streams narration to the player as ElevenLabs makes it, and saves a copy to Blob alongside (live: cold first audio about 1.1 s, down from 3 to 4 s; the Blob copy saves and repeats redirect to it)
- [x] Web app runs locally and on Vercel, with keyboard / D-pad focus and the
      Title → Hero → Place → Sidekick → Story → End flow
- [x] ElevenLabs: two keys (`spooky-story-proxy` for the live app, `spooky-story-sounds` for one-off sounds), free plan checked
- [x] Hero voices: premade (Laura, Jessica, Charlie)
- [x] Pre-made sounds: 14 of 16 clips (hellos, sidekick sounds, ambiences, menu sounds, spellbook, The End)
- [x] Audio API on Vercel (`web-app/app/api/`): closed inputs, Blob cache, tested live (8 s first play, 0.2 s after)
- [x] Vercel project, ElevenLabs key and public Blob store set up; deployed
- [x] Old Cloudflare proxy removed; its key moved to `web-app/app/.env.local`
- [x] Repo split into `web-app/` and `vega/`, with top-level README and scripts
- [x] Vega app generated from `vegaWebview`; Release build runs on the Virtual Device and loads the live site
- [x] Vega: `mediaPlaybackRequiresUserAction={false}` (autoplay); keys accept the usual TV WebView names
- [x] On-screen Pause/Play button (on `feat/pause-button`)
- [x] READMEs: root, `web-app/`, `web-app/app/`, `vega/`
- [x] Public GitHub repo: https://github.com/anishamalde/spooky-story-maker

## Architecture decisions

See [LADR.md](LADR.md) for why things are the way they are.
