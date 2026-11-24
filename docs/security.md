# Security Rules

**Status:** Draft v0.1 — Architecture Team, Sprint 2 (for team review)

Scope: local development service. Authentication, TLS, and cloud hardening are out of scope unless approved.

## 1. Media access

- Only files directly inside the configured media directory can be served (non-recursive).
- Only `.mp4` and `.webm` files are listed or served.
- Clients send an **ID**, never a path. The server looks the ID up in its catalog and uses the file it found.
- On startup, convert the media directory to a canonical absolute path. Before opening a file, confirm its canonical path is still inside that directory.
- Symlinks that point outside the media directory are ignored.
- Hidden files (names starting with `.`) are ignored.

## 2. Input validation

- Video ID must match `^[a-z0-9][a-z0-9-]{0,63}$`; otherwise `400 INVALID_VIDEO_ID`.
- Requests containing `..`, `/`, `\`, `%2e`, `%2f`, `%5c`, or null bytes in the ID are rejected. These must be covered by tests.
- `Range` header is parsed strictly (see `protocol.md` §3.3); never trust numbers without bounds checks (watch for integer overflow with large values).
- Limit request header size and request line length to the library defaults or lower.

## 3. Errors and logging

- Error bodies contain a code and a short message only: no file paths, stack traces, library names, or OS error text.
- Logs may contain: timestamp, method, request path, status, bytes sent, duration, client address.
- Logs must not contain: filesystem paths, full headers, or file contents.

## 4. Resource safety

- Close file handles and sockets on success, error, and client disconnect.
- Read files in chunks (fixed buffer size, e.g. 64 KiB); never load a whole file into memory.
- Do not leave work running for a disconnected client.

## 5. CORS

- Default `*` is for local development only. Production-style deployment must set a specific origin (out of scope this sprint).

## 6. Required security tests

| Case | Expected |
|---|---|
| ID `../etc/passwd` or URL-encoded variants | `400` or `404`, no file content |
| ID with `/` or `\` | `400` or `404` |
| Very long ID | `400` |
| Symlink to a file outside the media directory | Not listed, not served |
| Huge range values (e.g. `bytes=0-99999999999999999999`) | `400` or clamped; no crash |
| Error response body | No file paths |
