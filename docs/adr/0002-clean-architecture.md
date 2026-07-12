# ADR 0002: Clean Architecture

## Status

Proposed

## Purpose

Record an architectural decision for the Parish Reporting platform.

## Context

Connector diversity and metadata-driven logic require strong boundaries.

## Decision

Adopt Clean Architecture: domain models and use cases are framework-independent; connectors, REST controllers, persistence, and frontend are adapters.

## Rationale

This decision supports metadata-driven reporting, connector independence, and Clean Architecture boundaries.

## Consequences

This keeps business logic independent of Google Sheets, database, and charting library choices.

## Alternatives Considered

A traditional layered CRUD app was rejected because reporting logic would likely leak into controllers/components. A frontend-only architecture was rejected for security and scalability.

## Open Questions

How strict should dependency enforcement be in CI?
