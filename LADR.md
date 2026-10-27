# Lightweight architecture decision records (LADRs)

Short records of why things are the way they are. Add a new one rather than rewriting an old one. If a decision is reversed, mark the old one superseded and link to the new one.

### LADR-1: Ship the web app inside a WebView on Vega, not a native port

- **Status:** Accepted
- **Why:** the Expo web build already works with a remote, so one codebase covers the web, Vega and the other TVs. A native port would mean swapping `expo-audio`, `expo-font` and the remote handling, for a Halloween app with a handful of screens.
- **Trade-offs:** the WebView has no TV focus engine (we added `webFocus.ts`), it needs a connection, and it's slower on low-end hardware. Revisit if this becomes a native showcase.

### LADR-2: Host the web app; don't bundle it into the Vega package

- **Status:** Accepted
- **Why:** a multi-file web build can't load its own files from `file://` in the Vega WebView (cross-origin rules), so bundling fails. Hosting on Vercel avoids that and lets us update without a Vega rebuild.
- **Trade-off:** the TV needs internet access.

### LADR-3: Use Vercel for the web app and the audio API

- **Status:** Accepted, supersedes the Cloudflare Worker proxy
- **Why:** one account and one deploy. The app and `/api` share an origin, so there's no CORS and no proxy URL to configure. Vercel Blob gives a simple cache.
- **Trade-off:** the Cloudflare Worker's built-in per-IP rate limit didn't carry over. A Vercel Firewall rule would replace it (optional for now, since the cache caps spend).

### LADR-4: Generate clips when the story is picked, then cache them in Blob
- **Status:** Accepted, amended (was: pre-record all 270 clips before launch)
- **Why:** clips are made only for the story the child picks, so we never pay for the 270 we don't use. Caching in Blob means each clip is made once, and repeat plays are instant. Keeping generation at pick time means a name or other choice can be added later without pre-recording every combination.
- **Trade-off:** the first play of a page is slower than a cached one. LADR-16 covers how we shrink that wait.
- **Cache key:** every choice that changes the audio (story, page, voice, model, and later a name) is part of the Blob path, so a changed story never serves old audio.

### LADR-5: The audio API accepts only a story ID and page number

- **Status:** Accepted
- **Why:** the key can only voice text we wrote. Nobody can use it to make the narrator say anything else.
- **Trade-off:** personalised stories (the child's name) break this rule, so they need the guardrails in "Before any live story generation" first.
- **Protection:** anyone can call `/api`, so generation is limited to these IDs, the cache caps spend at one generation per clip, and a Vercel Firewall rate limit and an ElevenLabs spend cap are required.

### LADR-6: No app token

- **Status:** Accepted, supersedes the shared `APP_TOKEN`
- **Why:** the token shipped inside the app, so anyone could read it. It gave no real protection. The cache, the closed inputs and the ElevenLabs spend cap do the real work.
- **Trade-off:** `/api` is open to anyone. That's acceptable for a public app with no accounts.

### LADR-7: Two ElevenLabs keys, each with the least access it needs

- **Status:** Accepted
- **Why:** the live key sits on the internet, so it gets only Text to Speech and Sound Effects, with a credit cap. The one-off sounds key also needs Music and Voices, and it lives on a laptop, not in Vercel.
- **Trade-off:** two keys to manage.

### LADR-8: Use premade voices on the free plan

- **Status:** Accepted, revisit if upgrading
- **Why:** the free plan can't design voices or make music through the API.
- **Trade-off:** the heroes sound like library voices, not the designed characters in `content/voices.json`.

### LADR-9: Pre-make the menu sounds and music; narrate live (cached)

- **Status:** Accepted
- **Why:** menus should respond instantly, so short sounds ship in the app. Narration and stings depend on the story, so they're generated and cached on first play.
- **Trade-off:** the sounds are fixed until someone reruns `npm run sounds`.

### LADR-10: Same-origin `/api` on web; a full URL for native builds

- **Status:** Accepted
- **Why:** on web and in the WebView the relative path just works. Native TV builds have no origin, so they set `EXPO_PUBLIC_API_URL`.

### LADR-15: Live generation of personalised text waits for a cost study and the guardrails
- **Status:** Accepted
- **Why:** two kinds of "live" generation need different rules:
  - **Fixed text, generated on pick and cached** (what we ship, LADR-4). The text is ours, so it's safe.
  - **Personalised or AI-written text** (a child's name spoken in the audio, or a model writing the story). Every clip is new text a child hears, so it needs the guardrails first. It also costs credit on every new combination, so it needs a cost study first.
- **Consequence:** no spoken names and no AI-written stories yet. Names can go in captions meanwhile.
- **Revisit:** when the cost study and the guardrails are both done.

### LADR-16: Stream narration to the player while saving a copy
- **Status:** Accepted
- **Why:** the API used to wait for ElevenLabs to finish the whole clip and save it before sending anything, so an uncached page took 3 to 4 seconds before any sound. Streaming sends the first audio as it's made (about 0.7 seconds locally). The copy for Blob is written alongside, from the same stream.
- **Trade-off:** if ElevenLabs fails partway through, the TV gets a cut-off clip, and that page isn't saved. The next play tries again.
- **Stings** are short, so they're still made whole.
