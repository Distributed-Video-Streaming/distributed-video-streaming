# ADR-0002: Use Standard Web Protocols Where They Fit

- **Status:** Proposed — pending development team confirmation
- **Decision owners:** Architecture team with Client and Backend teams

## Context
A browser-based client needs a reliable way to request video and communicate with backend components.

## Proposed decision
Prefer HTTP/HTTPS for browser-facing request/response communication if the proxy and source expose HTTP endpoints. Consider another protocol only when a confirmed requirement justifies it. Use HTTPS where appropriate for the deployment environment.

## Alternatives considered
1. HTTP/HTTPS for request/response communication.
2. WebSocket for bidirectional real-time messaging.
3. A custom TCP protocol for a specialized transport requirement.

## Consequences
- Standard web tooling and browser support if HTTP is used.
- The final choice depends on the actual source, playback approach, deployment, and endpoint design.
- WebSocket or a custom protocol should not be added without a specific need.

## Open questions
- Does the source expose HTTP/HTTPS?
- Is seeking required, and does the selected path support byte-range requests?
- Are real-time bidirectional messages required?
