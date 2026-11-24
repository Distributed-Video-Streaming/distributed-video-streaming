# Requirements

**Status:** Draft v0.1 — Architecture Team, Sprint 2 (for team review)

## 1. Goal

Connect the C++ backend to a browser video player through a simple, testable HTTP streaming interface, with automated tests and a Python diagnostic tool.

## 2. Scope (Sprint 2 & 3)

In scope: health check, video catalog, video streaming with seeking, error handling, tests, diagnostics, documentation.

Out of scope unless Architecture approves: WebRTC, adaptive bitrate, transcoding / multiple qualities, authentication, cloud deployment, load balancing, new frameworks or protocols.

## 3. Functional requirements

| ID | Requirement | Owner team |
|---|---|---|
| FR-01 | The server starts from documented commands/config and shuts down cleanly. | C++ |
| FR-02 | `GET /api/health` reports service status. | C++ |
| FR-03 | `GET /api/videos` lists available videos with stable IDs and agreed metadata. | C++ |
| FR-04 | `GET /api/videos/{id}/stream` returns the original encoded media file. | C++ |
| FR-05 | The stream endpoint supports HTTP `Range` requests so the browser can seek. | C++ |
| FR-06 | Unknown IDs, bad ranges, and server failures return the agreed JSON errors. | C++ |
| FR-07 | The browser loads the catalog from the API (no local placeholder video). | JS |
| FR-08 | The browser plays the selected video through the stream URL. | JS |
| FR-09 | The browser shows loading, empty, error, and retry states. | JS |
| FR-10 | `scripts/stream_probe.py` checks health, catalog, and range responses. | Python |
| FR-11 | The probe reports latency, bytes, and throughput, with optional CSV/JSON output. | Python |
| FR-12 | Docs explain setup, media configuration, running, and testing. | All |

## 4. Non-functional requirements

| ID | Requirement |
|---|---|
| NFR-01 | Clients never receive filesystem paths; IDs map only to files inside the media directory. |
| NFR-02 | Streaming reads the file in chunks; it must not load a whole video into memory. |
| NFR-03 | The server handles at least 10 simultaneous stream requests without failing. |
| NFR-04 | File handles and sockets are released on success, error, and client disconnect. |
| NFR-05 | Each request is logged (method, path, status, bytes, duration) without sensitive data. |
| NFR-06 | Builds use the existing CMake setup; JS tests use the existing Jest setup. |
| NFR-07 | Python tooling uses only the standard library unless Architecture approves a dependency. |

## 5. Acceptance criteria (system level)

1. Start the backend with documented steps → `GET /api/health` returns `200`.
2. `GET /api/videos` lists the fixture video(s); an empty media folder returns an empty list.
3. The browser shows the catalog, plays a selected video, and seeking works.
4. Unknown ID → `404` JSON error; invalid range → `400`/`416`; the UI shows a friendly message.
5. `stream_probe.py` passes health, catalog, and range checks and writes a report.
6. Unit, integration, and browser smoke tests are documented, run, and recorded in `docs/testing.md`.
