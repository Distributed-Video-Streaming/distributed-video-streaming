# Distributed Video Streaming

A browser video player (JavaScript) that streams videos from a C++ backend over HTTP, with a Python diagnostic tool and automated tests.

> **Status:** Skeleton v0.1 (Architecture Team, Sprint 2). Sections marked _TBD_ are filled in by the owning team.

## Project structure

```
source/        Existing C++ video code (FileVideoSource, FFmpeg). Not in the streaming path.
proxy/         C++ HTTP server (health, catalog, streaming with Range support)
browser/       Web client (index.html, css/, js/)
tests/         unit/, integration/, system/, performance/, fixtures/
docs/          requirements, architecture, protocol, testing, performance, security, deployment, uml/
scripts/       Helper scripts, including stream_probe.py
```

## Read first

- `docs/architecture.md` — design and decisions
- `docs/protocol.md` — API contract (the source of truth for all teams)
- `docs/security.md` — security rules
- `docs/testing.md` — test plan and results

## Prerequisites

- CMake and a C++ compiler — _TBD (C++ team: versions)_
- FFmpeg libraries (existing `source/` code) — _TBD_
- Node.js and npm (Jest) — _TBD (JS team: version)_
- Python 3 (standard library only) — _TBD (Python team: version)_

## Build the backend

```
cmake -S . -B build
cmake --build build
```

_TBD (C++ team: server binary name and any extra steps)._

## Run the backend

Default address: `http://127.0.0.1:8080`. Settings are in `docs/protocol.md` §2.

```
<server-binary> --media-dir ./media --port 8080
```

_TBD (C++ team: exact command)._ Put `.mp4` / `.webm` files in the media directory. To create a small test clip, see `docs/testing.md` §2.

## Run the browser client

_TBD (JS team: how to serve `browser/` and where to set the API base URL in `browser/js/config.js`)._

## Run the diagnostic tool

```
python scripts/stream_probe.py --base-url http://127.0.0.1:8080
```

_TBD (Python team: all options and examples)._

## Run the tests

See `docs/testing.md` §3 for commands per suite.

## Team workflow

1. Branch from the latest `main` (e.g. `feature/video-catalog`).
2. Small commits; run the relevant tests locally.
3. Open a pull request into `main` — never push directly.
4. Wait for review and Testing verification; only the authorized maintainer merges.
5. If you need an API change, ask the Architecture Team first and update `docs/protocol.md`.
