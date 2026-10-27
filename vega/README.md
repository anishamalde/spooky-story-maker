# Spooky Story Maker: Vega OS

The Vega OS version of [Spooky Story Maker](../README.md): a full-screen
WebView that loads the hosted web app, https://spooky-story-maker.vercel.app.
All the screens, audio and remote handling live in [`app/`](../web-app/app/README.md);
this folder is just the shell.

Generated from the Vega CLI's `vegaWebview` template (Vega SDK 2.0, React
Native 0.83):

```sh
vega project generate --template vegaWebview --name SpookyStoryMaker --packageId com.spookystorymaker.vega
```

## What's changed from the template

- `src/App.tsx` loads `WEB_APP_URL` instead of the bundled demo page. The
  template already sets the two props that matter for this app:
  - `mediaPlaybackRequiresUserAction={false}`, so audio plays without a key
    press first (it defaults to `true`)
  - `allowSystemKeyEvents`, so Back and the media keys reach the page
- `manifest.toml`: the app title. The template already asks for the WebView
  renderer and the audio services.
- `assets/index.html` is a one-file test page (autoplay, overlapping audio and
  an on-screen key log). It's no longer loaded and can go once the hosted app
  is confirmed on a real device.

## Build and run

```sh
npm install
npm run build:release
vega device list                                                    # a Fire TV in developer mode, or:
vega virtual-device start                                           # the Vega Virtual Device
vega run-app build/aarch64-release/spookystorymaker_aarch64.vpkg    # armv7 for 32-bit devices
```

Or from the repo root: `npm run vega:build` and `npm run vega:run`.

The app needs nothing running on your Mac: it loads the live site. Changes to
the web app reach the device on the next launch after `npm run deploy`, with
no Vega rebuild.

## Testing against a local build

To try web changes before deploying, run `npm run dev` at the repo root and let the
device's `localhost` reach your Mac through a reverse port forward. Nothing is
exposed on your network:

```sh
vega device start-port-forwarding --port 3000 --forward false
```

Then set `WEB_APP_URL` in `src/App.tsx` to `http://localhost:3000` and rebuild.
Forwards are lost when the device restarts.

## Why a WebView

| | WebView (this) | Native React Native for Vega |
| --- | --- | --- |
| Effort | Afternoon: template + one URL | A day or two: swap `expo-audio`, `expo-font` and the remote handling |
| Codebase | One, shared with web and other TVs | Mostly shared, with Vega-only audio and input code |
| Updates | Deploy the web app; no new Vega build | New build for every change |
| Focus | Our own arrow-key focus (`web-app/app/src/webFocus.ts`) | Vega's native focus engine |
| Performance | WebView on TV hardware; fine for this app | Better on low-end devices |
| Offline | Needs a connection | Could bundle everything |

For a Halloween app with a handful of screens, the WebView wins. For something
heavier, or a showcase of native Vega APIs, port it.

## Gotchas we hit

- **Use a Release build unless you're running this app's own Metro.** Debug
  builds load their JavaScript from Metro on `localhost:8081`. If another
  project's Metro is on that port, the app loads the wrong bundle and crashes
  with `Unknown named module` and `Global was not installed`.
- **You can't bundle a multi-file web app.** A single `file://` page loads,
  but it can't load other local files (CORS), so an `expo export` folder in
  `assets/` fails. That's why the app is hosted. Workarounds are one big
  inlined HTML file, or a local HTTP server inside the app.
- **Back is consumed by the WebView.** It reaches the page (the app goes back a
  screen) but never closes the app; use Home to leave.
- **Key names.** `web-app/app/src/remote.ts` treats `Escape`, `Backspace`, `GoBack` and
  `BrowserBack` as Back, and `MediaPlayPause` as Play/Pause. If a remote button
  does nothing, load `assets/index.html` again and read the key log.
- **The Virtual Device can stall.** If `vega device` commands hang, or the app
  is killed with `KeplerScriptThreadMonitor: One of the threads was not
  responsive` (its own log warns this "could have potentially resulted in a
  false ANR"), restart it with `vega virtual-device stop` and `start`.

## Useful commands

```sh
vega device running-apps                 # is it running?
vega device get-log-info                 # crash reports waiting on the device
vega device copy-logs -a SYSTEM_TOMBSTONE/acr --dir /tmp/vega-logs
vega device copy-logs -a main/var_log --dir /tmp/vega-logs
```
