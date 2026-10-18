# Distributed Video Streaming: Browser Client

Sprint 1 browser client: a simple, responsive video streaming interface built with plain HTML, CSS and JavaScript (no frameworks, no build step).

> **Scope of Sprint 1:** browser interface and video player setup only.
> WebRTC signaling, backend integration and real streaming come in later sprints.

## Project structure

```
browser/
├── index.html          Home page (browse films)
├── watch.html          Watch page (video player + status + errors)
├── assets/
│   └── Chopin - Nocturne op.9 No.2.mp4    Sample video
├── css/
│   ├── style.css       Shared styles (layout, nav, buttons, cards, footer)
│   └── watch.css       Watch page styles (player, status, error banner)
├── js/
│   ├── app.js          Shared helpers, film data, home page logic
│   └── player.js       Video player, connection status, error handling
├── UI/                 Design screenshots
└── README.md
```

## Setup

You need a modern browser. 

**Run it**

1. Open `index.html` in your browser.
## How it works

### Video player (HTML5)

`watch.html` contains a real `<video id="video">` element with custom controls: play/pause, back 10 seconds, seek bar, mute, volume, picture-in-picture and fullscreen. Space also toggles play/pause, and clicking the video does too.

For Sprint 1 the player loads a sample local video from `assets/` (`SAMPLE_VIDEO` at the top of `js/player.js`).

### Connection status

One element (`#status`) shows one of three states, controlled by `setStatus(state)` in `js/player.js`:

| State | When |
|-------|------|
| **Connecting** | The page loads, or the user presses "Try again" |
| **Connected** | The video has loaded its first data |
| **Disconnected** | A load error, the browser goes offline, or no connection within 15 seconds |

The colors for each state are in `css/watch.css` (`.status[data-state="..."]`).

### Error handling

Errors appear in a banner over the player (`#error`) with a **Try again** button. Handled cases:

| Case | Message shown |
|------|---------------|
| Video network error / decode error / bad source | A matching message from `MEDIA_ERRORS` |
| Browser has no HTML5 video support | "Your browser does not support HTML5 video" |
| Browser goes offline | "You are offline…" (reconnects automatically when back online) |
| No connection within 15 seconds | "Could not connect in time…" |
| Playback blocked by the browser | A short toast message |
| Fullscreen / picture-in-picture not available | A short toast message (PiP button is disabled if unsupported) |

## Preparing for the backend (later sprints)

Everything that will change is in `js/player.js`:

- `SAMPLE_VIDEO`: replace with the real source.
- `loadSource()`: swap `video.src = ...` for `video.srcObject = remoteStream` when WebRTC is added.
- `setStatus()` / `showError()`: call these from the WebRTC connection events (for example `connectionstatechange`) so the UI keeps working unchanged.

Film data is placeholder content in `js/app.js` (`FILMS`) and can be replaced by an API response later.
