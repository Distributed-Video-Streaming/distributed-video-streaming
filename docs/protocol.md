# Protocol / API Contract

**Status:** Draft v0.1 — Architecture Team, Sprint 2 (for team review)
**Rule:** Nobody changes a route, header, field, or status code without Architecture approval and an update to this file.

## 1. Basics

- Base URL (development): `http://127.0.0.1:8080`
- Transport: HTTP/1.1, GET only (plus `OPTIONS` for CORS; `HEAD` on the stream route is optional, see `architecture.md` U3)
- JSON responses use `Content-Type: application/json; charset=utf-8`
- Authentication: none (out of scope)

## 2. Server configuration

| Setting | CLI flag | Environment variable | Default |
|---|---|---|---|
| Host | `--host` | `DVS_HOST` | `127.0.0.1` |
| Port | `--port` | `DVS_PORT` | `8080` |
| Media directory | `--media-dir` | `DVS_MEDIA_DIR` | `./media` |
| CORS allowed origin | `--cors-origin` | `DVS_CORS_ORIGIN` | `*` (development only) |
| Log level | `--log-level` | `DVS_LOG_LEVEL` | `info` |

Priority: CLI flag, then environment variable, then default.

Exit codes: `0` clean shutdown, `1` runtime error, `2` configuration error (e.g. media directory missing or not a directory).

## 3. Endpoints

| Purpose | Request | Success |
|---|---|---|
| Health | `GET /api/health` | `200` JSON |
| List videos | `GET /api/videos` | `200` JSON |
| Stream | `GET /api/videos/{id}/stream` | `200` or `206` media bytes |
| CORS preflight | `OPTIONS /api/*` | `204` |

### 3.1 `GET /api/health`

Healthy (server running and media directory readable; an empty directory is healthy):

```
200 OK
{"status": "ok"}
```

Unhealthy:

```
503 Service Unavailable
{"status": "unavailable", "reason": "media_directory_unreadable"}
```

### 3.2 `GET /api/videos`

```
200 OK
{
  "videos": [
    {
      "id": "sample-clip",
      "title": "sample clip",
      "content_type": "video/mp4",
      "size_bytes": 1048576,
      "duration_seconds": null
    }
  ]
}
```

| Field | Type | Notes |
|---|---|---|
| `id` | string | Stable ID, see §4 |
| `title` | string | File name without extension; `_` and `-` replaced by spaces |
| `content_type` | string | `video/mp4` or `video/webm` |
| `size_bytes` | integer | File size |
| `duration_seconds` | number or `null` | `null` when unknown (decision U2) |

Rules:
- Sorted by `id` ascending (predictable order).
- Empty media directory returns `200` with `{"videos": []}`.
- Unreadable, zero-byte, hidden (dot), and non-allowed files are left out.
- Never include file names with extensions, paths, or other internal details.

### 3.3 `GET /api/videos/{id}/stream`

**No `Range` header** → full file:

```
200 OK
Content-Type: video/mp4
Content-Length: <total>
Accept-Ranges: bytes
Cache-Control: no-cache
```

**Valid `Range` header** → partial file:

```
206 Partial Content
Content-Type: video/mp4
Content-Length: <bytes in this range>
Content-Range: bytes <start>-<end>/<total>
Accept-Ranges: bytes
```

Range rules (`total` = file size in bytes):

| Request | Result |
|---|---|
| `bytes=0-99` | `206`, `Content-Range: bytes 0-99/total` |
| `bytes=100-` | `206`, from byte 100 to the end |
| `bytes=-500` | `206`, the last 500 bytes (whole file if 500 ≥ total) |
| end ≥ total (e.g. `bytes=0-999999999`) | `206`, end clamped to `total-1` |
| start ≥ total, or `bytes=-0`, or zero-byte file | `416`, header `Content-Range: bytes */total` |
| Wrong unit, non-numeric, or start > end (e.g. `bytes=10-5`) | `400 INVALID_RANGE` |
| Multiple ranges (e.g. `bytes=0-5,10-15`) | `416 RANGE_NOT_SATISFIABLE` (not supported) |

The same URL is used for playback and seeking.

## 4. Video IDs and media mapping

- The server scans the media directory (non-recursive). Allowed extensions: `.mp4`, `.webm` (case-insensitive).
- ID = file name without extension, lowercased; every run of characters other than `a-z0-9` becomes a single `-`; leading/trailing `-` removed; truncated to 64 characters; if empty, use `video`.
- Duplicates (after the rule above) get `-2`, `-3`, … in alphabetical order of the original file names.
- Valid ID pattern: `^[a-z0-9][a-z0-9-]{0,63}$`. Anything else → `400 INVALID_VIDEO_ID`.
- IDs are looked up in the catalog only; the ID is never used to build a path.

Example: `Sample_Clip.MP4` → `sample-clip`.

## 5. Error format

All errors except `416` bodies for the stream route use:

```
{"error": {"code": "VIDEO_NOT_FOUND", "message": "Video not found."}}
```

| Situation | Status | `code` |
|---|---|---|
| Invalid ID format | 400 | `INVALID_VIDEO_ID` |
| Malformed `Range` | 400 | `INVALID_RANGE` |
| Unrecognized route | 404 | `NOT_FOUND` |
| Unknown video ID | 404 | `VIDEO_NOT_FOUND` |
| Method not allowed | 405 (with `Allow` header) | `METHOD_NOT_ALLOWED` |
| Range not satisfiable | 416 (with `Content-Range: bytes */total` on the stream route) | `RANGE_NOT_SATISFIABLE` |
| Unexpected server or file error | 500 | `INTERNAL_ERROR` |
| Health failure | 503 | (health body, see §3.1) |

Messages are short and safe: never include paths, stack traces, or library names.

## 6. CORS (development)

- On `/api/*` responses: `Access-Control-Allow-Origin: <configured origin>` (default `*`).
- `Access-Control-Expose-Headers: Content-Range, Content-Length, Accept-Ranges`.
- `OPTIONS` preflight → `204` with `Access-Control-Allow-Methods: GET, HEAD, OPTIONS` and `Access-Control-Allow-Headers: Range`.
- A plain `<video src=...>` does not need CORS; `fetch()` calls for the catalog do.

## 7. Discovering the server URL

- Browser: `browser/js/config.js` exports the API base URL (default `http://127.0.0.1:8080`).
- Python: `--base-url` argument.
- Stream URL = `{base}/api/videos/{id}/stream`, using only an ID that came from the catalog.

## 8. Security rules (summary — full rules in `security.md`)

- IDs, not paths, identify videos.
- Reject path traversal and unknown IDs.
- No internal details in errors or logs.

## 9. Browser player states (JS team)

Initial/loading → catalog loaded → no videos → video loading → playing → ended → network/server error → unsupported media → retry.

## 10. Change log

| Version | Date | Change |
|---|---|---|
| 0.1 | 2026-11-23 | Initial draft |
