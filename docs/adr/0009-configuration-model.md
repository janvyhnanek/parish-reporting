# ADR 0009: Configuration Model

## Status

Proposed

## Purpose

Record an architectural decision for the Parish Reporting platform.

## Context

Dashboards, filters, dimensions, colors, relationships, and visibility must be configurable.

## Decision

Use versioned JSON configuration validated by schema. Store configuration in repo for initial releases; later allow admin UI editing backed by persistent storage.

## Rationale

This decision supports metadata-driven reporting, connector independence, and Clean Architecture boundaries.

## Consequences

JSON is readable, reviewable, and portable. Schema validation catches configuration errors early.

## Alternatives Considered

YAML was considered but JSON aligns with API payloads. Database-only config was deferred.

## Open Questions

Should config include environment-specific connector credentials references?
