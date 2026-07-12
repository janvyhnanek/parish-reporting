# Security

## Purpose

Identify security requirements for connector credentials, data access, exports, and configuration.

## Design

Connector credentials must be stored server-side only. Frontend never receives Google tokens. API endpoints should require authentication once user management is in scope. Configuration editing should be admin-only. Exports must enforce the same filters and access rules as detail views. Source data may contain personal information, so logs should avoid raw record dumps. Transform functions in relationship configs must be from a safe allow-list, not arbitrary code.

## Rationale

Reporting data can include people, parishes, volunteers, and tasks; access control and credential handling must be part of architecture from the start.

## Alternatives Considered

Client-side Google Sheets access was rejected. Arbitrary JavaScript transforms in JSON were rejected as unsafe.

## Open Questions

- What identity provider should be used?
- Are parish-level row permissions required?
- What retention policy applies to cached source data?
