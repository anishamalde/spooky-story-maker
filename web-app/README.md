# Spooky Story Maker: web app

Everything for the web version of [Spooky Story Maker](../README.md): the app
itself, plus the tooling that makes its stories, art and sounds. The Vega OS
app in [`../vega/`](../vega/README.md) loads the deployed build.

```
app/       the app (Expo), its web build and the Vercel /api: see app/README.md
content/   template.md + snippets.json → stories.json; voices.json; STORIES.md (all 27, readable)
scripts/   build-stories.mjs, make-sounds.ts, render-art.mjs
art/       scene art from Claude Design (inline SVG), rendered to app/assets/art/
```

## Commands

Run from this folder (or the repo root, which forwards to these):

| Command | Does |
| --- | --- |
| `npm run setup` | Installs dependencies here and in `app/` |
| `npm run stories` | `content/template.md` + `content/snippets.json` → `stories.json` (27 × 5 pages), written to `content/` and `app/src/` |
| `npm run sounds` | Pre-made hellos, sidekick sounds, ambiences, menu sounds and music → `app/assets/sounds/` |
| `npm run art` | Renders `art/*.dc.html` to PNGs in `app/assets/art/` (run `npx playwright install chromium` once) |
| `npm run dev` | Web app + `/api` on http://127.0.0.1:3000 |
| `npm run build:web` | Static build in `app/dist/` |
| `npm run deploy` | Deploys to Vercel production |
| `npm run typecheck` | Type-checks the scripts and the app |

## Keys

`npm run sounds` reads `ELEVENLABS_API_KEY` from `web-app/.env` (git-ignored).
That key needs Text to Speech, Sound Effects and, on paid plans, Music and
Voices (write). The live app uses a separate, narrower key stored in Vercel;
see [app/README.md](app/README.md#deploy-to-vercel).

## Writing your own stories

Edit `content/template.md` (the five-page arc, with `{hero}`-style slots and
ElevenLabs audio tags like `[whispers]`) and `content/snippets.json` (names,
tricks, noises and sound prompts for each hero, place and sidekick), then run
`npm run stories`. Every combination is written out to `content/STORIES.md`
so you can read them all. The prompt used to draft the snippets is in the
[root README](../README.md#prompts-used).
