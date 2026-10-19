# ADR-0001: Separate Client Responsibilities from Backend Responsibilities

- **Status:** Proposed — pending team review
- **Date:** 2026-10-17
- **Decision owners:** Architecture team with Client and Backend teams

## Context
The system contains a JavaScript client and a C++ backend. Clear boundaries help reduce duplicated logic and make the system easier to test and maintain.

## Proposed decision
Keep user-interface and playback presentation responsibilities in the JavaScript client/browser. Keep privileged validation, server-side coordination, and any project-specific backend processing in the C++ backend or the agreed proxy layer.

## Alternatives considered
1. Put most logic in the browser.
2. Put all logic in the backend.
3. Separate responsibilities by component, as proposed.

## Consequences
- Clearer ownership and easier independent testing.
- Requires agreement on endpoint contracts and which component owns each rule.
- Exact responsibilities must be updated to match the actual project.

## Open questions
- Which processing tasks are explicitly assigned to the C++ backend?
- Is the proxy a separate component or part of the backend?
