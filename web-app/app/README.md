# Spooky Story Maker: app

The app itself: Expo + [`react-native-tvos`](https://github.com/react-native-tvos/react-native-tvos),
built for the web (hosted on Vercel, and loaded by the [Vega WebView](../../vega/README.md))
and natively for Fire TV, Android TV and Apple TV. It also contains the
Vercel Function that talks to ElevenLabs.

## How it works

```
 browser / Vega WebView / TV app                 Vercel                              ElevenLabs
 ┌─────────────────────────────┐   GET /api/tts/{storyId}/{page}   ┌────────────────────┐
 │ Title → Hero → Place →      │ ────────────────────────────────▶ │ /api function:     │  first time only
 │ Sidekick → Story → The End  │   GET /api/sfx/{storyId}/{page}   │ looks up the page, │ ───────────────▶ Text to Speech,
 │                             │ ────────────────────────────────▶ │ holds the API key  │ ◀─────────────── Sound Effects
 │ bundled: art, hellos, menu  │ ◀──── mp3, or redirect to Blob ── │                    │
 │ sounds, music, stories.json │                                   │ Vercel Blob: saved │
 └─────────────────────────────┘                                   │ clips              │
   static web build (Vercel)                                       └────────────────────┘
```

- **The app never holds the ElevenLabs key.** Anyone can read a web app's code,
  so the key lives only in the function's environment.
- **The API only accepts a story ID and a page number**, never free text, so
  nobody can use it to voice arbitrary words.
- **Every clip is generated once.** The first request for a page makes it and
  saves it to Vercel Blob; later requests are redirected to the saved copy and
  cached by browsers and Vercel's CDN. There are 270 possible clips, so that's
  the most the key can ever be asked to make. The first play of a page takes
  a moment (narration streams as it's made, so sound starts within about a
  second); after that it's instant.
- When the kid picks a sidekick, the app shows an "opening the spellbook"
  animation, requests all five stings at once, and starts page 1. While each
  page plays it prefetches the next one.
- Small things are made once and bundled so menus feel instant: the heroes'
  hellos, sidekick sounds, place ambiences, menu sounds and music.

| Asset | ElevenLabs product | When |
| --- | --- | --- |
| Story narration | Text to Speech, `eleven_v4` with audio tags like `[whispers]` | First play of each page (streamed), then cached |
| Page-turn stings | Sound Effects | First play of each page, then cached |
| Hero hellos | Text to Speech (premade voices; Voice Design on paid plans) | Pre-made, `npm run sounds` |
| Sidekick sounds, ambiences, menu sounds | Sound Effects | Pre-made |
| Title and story music | Music (paid plans), or drop in your own mp3s | Pre-made |

## Layout

```
App.tsx                  six screens in a straight line; Back goes one step towards Title
src/screens/             Title, Pick (hero / place / sidekick), StoryPlayer, End
src/audio.ts             bundled clips and the music bed (expo-audio)
src/remote.ts            remote keys; on web, keyboard and TV-WebView key names
src/webFocus.ts          arrow-key focus on web, where there's no TV focus engine
src/config.ts            where the audio API lives (same origin on web)
api/[kind]/[storyId]/[page].ts   GET /api/tts and /api/sfx (Vercel Function)
vercel.json              build: expo export --platform web → dist/
```

## Run it locally

```sh
npm install
npx vercel login
npx vercel link              # once: links this folder to the Vercel project
npx vercel env pull .env.local
npm run dev                  # web app + /api on http://127.0.0.1:3000
```

`npm run dev` is `vercel dev`: it runs the Expo web dev server and the `/api`
function together. Sensitive variables (like `ELEVENLABS_API_KEY`) aren't
pulled, so add `ELEVENLABS_API_KEY=` to `.env.local` yourself. Without
`BLOB_READ_WRITE_TOKEN`, every play generates live, which is fine for testing
but spends credits.

## Deploy to Vercel

In the Vercel project:

1. Settings → Environment Variables: add `ELEVENLABS_API_KEY` as a sensitive
   variable, using a key with only Text to Speech and Sound Effects access.
   Optional: `NARRATOR_VOICE_ID`, `TTS_MODEL`, `SFX_SECONDS`.
2. Storage → create a **public Blob** store and connect it. That adds
   `BLOB_READ_WRITE_TOKEN`. It only ever holds story audio.
3. Optional: Firewall → a rate-limit rule on `/api/`. The cache already caps
   ElevenLabs spend; this just protects your Vercel usage.

Then `npm run deploy` (or connect the Git repo). `.vercelignore` keeps local
env files out of the upload.

Check it: `https://<project>.vercel.app/api/tts/witch-house-cat/2` should play
the page; the second request comes back in a fraction of a second.

## Pre-made sounds

From `web-app/` (or the repo root), with an ElevenLabs key in `web-app/.env`:

```sh
npm run sounds
```

This writes the hellos, sounds and music to `assets/sounds/` and the map the
app imports (`src/sounds.generated.ts`). Finished clips are skipped, so it's
safe to rerun; `--force` remakes everything. A failing clip (for example Music
on the free plan) is reported at the end and the rest carry on. For your own
music, save `music-title.mp3` and `music-story.mp3` in `assets/sounds/` and
run it again to pick them up.

Heroes with no `voiceId` in `web-app/content/voices.json` get one from Voice Design
(paid plans). On the free plan, put premade voice IDs there instead.

## Native TV builds

```sh
echo 'EXPO_PUBLIC_API_URL=https://<project>.vercel.app' >> .env   # native has no origin
npm run prebuild:tv        # EXPO_TV=1 expo prebuild --clean
npm run android            # Fire TV / Android TV (adb connect <fire-tv-ip>)
npm run ios                # Apple TV simulator
```

## Remote controls

| Screen | Remote |
| --- | --- |
| Title | Select = start |
| Pick a hero / place / sidekick | Left/Right = move (plays that choice's sound), Select = pick, Back = previous screen |
| Story | Play/Pause or Select = pause, Right = skip page, Back = exit |
| The End | Replay or Make Another |

In a browser: arrows move, Enter is Select, Space is Play/Pause, Escape is Back.

## Known quirks

- `AbortError: The play() request was interrupted by a call to pause()` in the
  web console comes from `expo-audio`'s web player not catching `play()`. It's
  harmless.
- The "picks to first narration audio" timing reads a few milliseconds on web,
  because `expo-audio` reports `playing` as soon as `play()` is called. Don't
  trust that number until it uses a real playback signal.
- `EXPO_PUBLIC_*` values are baked in at build time; if a change doesn't show
  up, rebuild with `npx expo export --platform web --clear`.
