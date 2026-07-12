# ADR 0010: REST API

## Status

Proposed

## Purpose

Record an architectural decision for the Parish Reporting platform.

## Context

The frontend needs stable endpoints for metadata, dashboards, aggregations, details, filters, and exports.

## Decision

Expose REST endpoints using typed request/response DTOs. Keep connector details behind backend services. Use POST for complex aggregation/detail/export requests.

## Rationale

This decision supports metadata-driven reporting, connector independence, and Clean Architecture boundaries.

## Consequences

REST is simple, cacheable where appropriate, and easy to document for early implementation.

## Alternatives Considered

GraphQL was considered but deferred. Direct source APIs from the frontend were rejected.

## Open Questions

Should the API publish an OpenAPI specification from iteration 1?
