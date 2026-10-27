# Spooky Story Maker

A Halloween build-your-own-story app for TV. Kids pick a hero, a place and a
sidekick with the remote, and an [ElevenLabs](https://elevenlabs.io) narrator
reads the story aloud, with sound effects and music underneath.

**Live:** https://spooky-story-maker.vercel.app (keyboard works too)

- 27 hand-written stories (3 heroes × 3 places × 3 sidekicks), five pages each
- D-pad only: no mic, no typing, no accounts
- Narration and stings are made by ElevenLabs when a story is picked, then
  cached, so each clip is only ever paid for once. Narration streams to the
  TV as it's made, so the first sound arrives quickly

## How it fits together

One app, written once in React Native, reaching every TV platform:

```
                 web-app/app/  (Expo + react-native-tvos)
                 ├── web build ──▶ Vercel ◀── /api (holds the ElevenLabs key, caches audio in Blob)
                 │                   ▲
                 │                   │ loads https://spooky-story-maker.vercel.app
                 │              vega/  (Vega OS: full-screen WebView)
                 │
                 └── native builds ──▶ Fire TV / Android TV / Apple TV
```

```
spooky-story-maker/
├── README.md        you are here
├── package.json     top-level commands (below)
├── TODO.md
├── web-app/         the web app and everything that builds it
│   ├── app/         the app, its web build and the Vercel /api
│   ├── content/     story template, snippets, voices, generated stories.json
│   ├── scripts/     build the stories, make the pre-made sounds, render the art
│   └── art/         scene art from Claude Design (inline SVG)
└── vega/            Vega OS app: a WebView that loads the hosted web app
```

| Folder | Details |
| --- | --- |
| [`web-app/`](web-app/README.md) | Content, art and sound tooling: [web-app/README.md](web-app/README.md) |
| [`web-app/app/`](web-app/app/README.md) | The app, audio API, deploy: [web-app/app/README.md](web-app/app/README.md) |
| [`vega/`](vega/README.md) | The Vega WebView shell: [vega/README.md](vega/README.md) |

Why a WebView on Vega rather than a native port? The web build already works
with a remote, so wrapping it got the app onto Vega in an afternoon with one
codebase. The trade-offs are in [vega/README.md](vega/README.md#why-a-webview).

## Quick start

You need Node 20+, an [ElevenLabs](https://elevenlabs.io) API key (set a spend
cap on it), a free [Vercel](https://vercel.com) account and, for Vega, the
[Vega SDK](https://developer.amazon.com/docs/vega/0.24/build-an-app).

Everything runs from this folder:

| Command | Does |
| --- | --- |
| `npm run setup` | Installs dependencies for `web-app/`, `web-app/app/` and `vega/` |
| `npm run stories` | Rebuilds `stories.json` from `content/` |
| `npm run sounds` | Makes the pre-made hellos, menu sounds and music (key in `web-app/.env`) |
| `npm run dev` | Web app + `/api` locally on http://127.0.0.1:3000 (`vercel dev`) |
| `npm run build:web` | Static web build in `web-app/app/dist/` |
| `npm run deploy` | Deploys the web app and `/api` to Vercel production |
| `npm run vega:build` | Builds the Vega app (Release) |
| `npm run vega:run` | Installs and launches it on a connected device or the Virtual Device |
| `npm run typecheck` | Type-checks the scripts and the app |

They're shortcuts into `web-app/` and `vega/`; each folder also works on its own.

First time:

```sh
npm run setup
cd web-app/app && npx vercel login && npx vercel link && cd ../..
npm run dev
```

Deploying needs `ELEVENLABS_API_KEY` and a Blob store on the Vercel project;
see [web-app/app/README.md](web-app/app/README.md#deploy-to-vercel).

## Remote controls

| Screen | Remote |
| --- | --- |
| Title | Select = start |
| Pick a hero / place / sidekick | Left/Right = move (plays that choice's sound), Select = pick, Back = previous screen |
| Story | Select = the on-screen Pause/Play button, Play/Pause = pause, Right = skip page, Back = exit |
| The End | Replay or Make Another |

In a browser: arrows move, Enter is Select, Space is Play/Pause, Escape is Back.

## Prompts used

The story snippets were drafted with Claude, then edited by hand. To write your
own set, this prompt is a good start:

> Write snippets for a five-page Halloween story template for children aged 4 to 7.
> The arc is: arrive at a place, hear a strange noise, the sidekick gets scared,
> the hero's special trick saves the day, everyone has a Halloween party.
> For each of 3 heroes give a name, a catchphrase, a special trick and what they
> do at the party. For each of 3 places give a one-line description, the strange
> noise written as a sound word, the friendly creature who was making it, and a
> 2-second sound-effect prompt for arriving, for the noise and for the party.
> For each of 3 sidekicks give what it does when it's scared and when it's happy.
> Nothing truly frightening, nobody gets hurt, and every snippet must read well
> after any hero or sidekick name. Return JSON in the shape of web-app/content/snippets.json.

The narration uses Eleven v3/v4 audio tags (`[whispers]`, `[excited]`,
`[laughs]`, `[pause]`) directly in `web-app/content/template.md`. The voice design and
music prompts are in `web-app/content/voices.json` and `web-app/scripts/make-sounds.ts`.

## What's next

**1. The child's name and themed lessons.** The child types or picks a name,
and it fills a slot in the story: "Little Witch helps Sam share the sweets".
Each story also gets a theme (sharing, kindness, bravery, telling the truth,
tidying up), with a light lesson on the last page. The name is shown as a
caption first; spoken names need their own clips, so the audio cache has to
grow with them.

**2. Guardrails, before any live generation.** Live stories mean an AI writes
what a child hears, so these come first:

- **Check every story before it's spoken:** a moderation check and a second
  model asking "is this right for a 5-year-old?", falling back to a pre-written
  story if either fails.
- **Keep inputs closed:** the name and theme are the only free text. Filter
  them, limit their length and treat them as untrusted (prompt injection).
- **Test with nasty inputs:** an eval set of tricky names and requests, run on
  every prompt change.
- **Tone limits:** nothing truly frightening, nobody gets hurt, no brands, and
  no personal details beyond the name.
- **Parents:** say stories are AI-written, let them report a bad one and switch
  to fixed stories.
- **Privacy and cost:** no accounts, no storing the name beyond the session,
  no recording voices, a spend cap and a daily limit.
- **Review:** have someone outside the project look before it's shown to children.

**Later:** word-by-word captions (TTS with timestamps), characters voicing their
own lines (Text to Dialogue), other languages (Spanish, Hindi), and a native
(non-WebView) Vega build.
