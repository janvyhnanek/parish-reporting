# Backend Architecture

## Purpose

Define backend layers, responsibilities, and boundaries.

## Design

Backend layers: API controllers validate HTTP requests; application services orchestrate metadata, connector, filtering, aggregation, detail, and export use cases; domain services implement inference, relationships, and aggregation; infrastructure implements connectors, config storage, caching, auth, and export writers. The backend exposes REST APIs and does not expose connector-specific details to the frontend except in connector configuration endpoints.

## Rationale

A layered backend protects the core from framework and connector churn. It also makes unit testing possible without Google Sheets access.

## Alternatives Considered

A thin API directly calling Google Sheets was rejected. A GraphQL-first backend was considered but REST is simpler for initial API and exports.

## Open Questions

- Preferred backend language/framework? Proposed ADR selects TypeScript/NestJS unless changed.
- Is multi-user authentication in scope for MVP?
