# Distributed Video Streaming: Browser Client

Sprint 1 browser client: a simple, responsive video streaming interface built with plain HTML, CSS and JavaScript (no frameworks, no build step).

> **Sprint 1:** browser interface and video player.
> **Sprint 2:** signaling client and WebRTC client, ready for the Video Proxy.
> Until the proxy exists, the page plays a local sample video.

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
│   ├── signaling.js    WebSocket client that talks to the Video Proxy
│   ├── webrtc.js       WebRTC client that receives the video stream
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

## Sprint 2: WebRTC client

```
Browser  <--- JSON over WebSocket (signaling) --->  Video Proxy
Browser  <========= video over WebRTC ===========  Video Proxy
```

| Mode | How | What happens |
|------|-----|--------------|
| **Local** (default) | open `watch.html` | Plays the sample video from `assets/` |
| **Proxy** | open `watch.html?proxy=1` | Connects to `SIGNALING_URL` (in `js/player.js`), negotiates WebRTC and shows the received stream |

Connection status and errors work the same in both modes. In proxy mode: Connecting until WebRTC connects, Disconnected if the server is unreachable, an error is reported, or the connection drops.

### Signaling messages

All messages are JSON text over the WebSocket, with a `type` field. The proxy team must implement the other side:

| Direction | Message | Meaning |
|-----------|---------|---------|
| Browser to proxy | `{ "type": "offer", "sdp": "..." }` | Browser wants to receive video (receive-only) |
| Proxy to browser | `{ "type": "answer", "sdp": "..." }` | Proxy accepts the offer |
| Both | `{ "type": "candidate", "candidate": {...} }` | Network route information (ICE) |
| Proxy to browser | `{ "type": "error", "message": "..." }` | Something went wrong; message is shown to the user |

## Preparing for the backend (later sprints)

Everything that will change is in `js/player.js`:

- `USE_PROXY`: set to `true` (or use `?proxy=1`) once the proxy is running.
- `SIGNALING_URL`: change to the proxy's real WebSocket address.
- `startWebRTC()`: already sets `video.srcObject` and calls `setStatus()` / `showError()` from the WebRTC events.

Film data is placeholder content in `js/app.js` (`FILMS`) and can be replaced by an API response later.
