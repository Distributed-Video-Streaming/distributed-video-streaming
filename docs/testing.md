# Testing

**Status:** Skeleton v0.1 — Architecture Team, Sprint 2. Each team fills in its own section. **No test is marked as passed unless it was actually run.**

## 1. Test levels and ownership

| Level | Folder | Tool | Owner |
|---|---|---|---|
| C++ unit | `source/tests/`, `proxy/tests/` | GoogleTest (CMake/CTest) | C++ team |
| JavaScript unit | `tests/unit/` (or where the existing Jest setup lives, see `architecture.md` U4) | Jest + JSDOM | JS team |
| Python tool unit | `tests/unit/` | `unittest` | Python team |
| Backend integration | `tests/integration/` | Python `unittest` against a running server | Python team |
| System / browser smoke | `tests/system/` | Manual procedure with recorded results | JS team + C++ team |
| Performance | `tests/performance/` | `scripts/stream_probe.py` | Python team |

## 2. Test media (fixtures)

Fixtures live in `tests/fixtures/`. Do not use personal videos, and do not download copyrighted media. Generate a small clip with FFmpeg:

```
ffmpeg -f lavfi -i testsrc=duration=5:size=320x240:rate=25 \
       -c:v libx264 -pix_fmt yuv420p -movflags +faststart \
       tests/fixtures/sample-clip.mp4
```

Integration tests start the server with `--media-dir tests/fixtures` (or a temporary copy) so results are repeatable. A test with an empty media directory uses a temporary empty folder.

## 3. Commands (each team fills in exact commands)

| Suite | Command | Filled in by |
|---|---|---|
| Build | `cmake -S . -B build && cmake --build build` | C++ |
| C++ unit | _TBD_ | C++ |
| JS unit | _TBD_ | JS |
| Python unit | _TBD_ | Python |
| Integration | _TBD_ | Python |
| Performance | _TBD_ | Python |

## 4. Draft test matrix

Status values: `Not run`, `Pass`, `Fail`, `Blocked`.

| ID | Case | Expected | Level | Req | Status |
|---|---|---|---|---|---|
| T-01 | `GET /api/health` with valid media dir | 200 `{"status":"ok"}` | Integration | FR-02 | Not run |
| T-02 | Health with unreadable media dir | 503 | Integration | FR-02 | Not run |
| T-03 | Catalog with fixture video | 200, correct fields, sorted by `id` | Integration | FR-03 | Not run |
| T-04 | Catalog with empty media dir | 200 `{"videos":[]}` | Integration | FR-03 | Not run |
| T-05 | Catalog hides hidden/unsupported/zero-byte files | Not listed | Unit + Integration | FR-03 | Not run |
| T-06 | ID slug rules and duplicate suffixes | Match `protocol.md` §4 | C++ unit | FR-03 | Not run |
| T-07 | Full stream of valid ID | 200, correct `Content-Type`, `Content-Length`, `Accept-Ranges` | Integration | FR-04 | Not run |
| T-08 | Range `bytes=0-99` | 206, `Content-Range: bytes 0-99/total`, 100 bytes | Integration | FR-05 | Not run |
| T-09 | Range `bytes=100-` and `bytes=-500` | 206, correct bytes | C++ unit + Integration | FR-05 | Not run |
| T-10 | Range start ≥ total | 416 with `Content-Range: bytes */total` | Integration | FR-05 | Not run |
| T-11 | Malformed range (`bytes=abc`, `bytes=10-5`) | 400 `INVALID_RANGE` | C++ unit + Integration | FR-06 | Not run |
| T-12 | Multiple ranges | 416 | Integration | FR-06 | Not run |
| T-13 | Unknown valid ID | 404 `VIDEO_NOT_FOUND` | Integration | FR-06 | Not run |
| T-14 | Path-traversal IDs (see `security.md` §6) | 400/404, no file content | Unit + Integration | NFR-01 | Not run |
| T-15 | Error bodies contain no filesystem paths | No paths | Integration | NFR-01 | Not run |
| T-16 | 10 simultaneous stream requests | All succeed | Integration | NFR-03 | Not run |
| T-17 | Client disconnects mid-stream | Server keeps running, resources released | Integration | NFR-04 | Not run |
| T-18 | Browser catalog render, empty, error + retry | Correct UI states | JS unit | FR-07, FR-09 | Not run |
| T-19 | Selected video builds `/api/videos/{id}/stream` URL | Correct URL | JS unit | FR-08 | Not run |
| T-20 | Stale request does not overwrite newer selection | Newest selection wins | JS unit | FR-09 | Not run |
| T-21 | Real browser: play, seek, bad ID, retry | Works, friendly error | System | FR-08, FR-09 | Not run |
| T-22 | `stream_probe.py` health/catalog/range checks | Correct report and exit code | Python unit + Integration | FR-10, FR-11 | Not run |

Note: JSDOM cannot prove real media decoding or seeking; T-21 covers that in a real browser.

## 5. Results

| Date | Suite | Environment | Result | Notes |
|---|---|---|---|---|
| _none yet_ | | | | |

## 6. Known limitations

_To be filled in by the teams._

## 7. Bug report template

- **Title**
- **Test ID / steps to reproduce**
- **Expected result**
- **Actual result**
- **Logs / status code / response body**
- **Environment** (OS, compiler, browser and version, commit hash, media file used)
- **Severity**
