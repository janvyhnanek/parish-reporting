# ADR 0001: Technology Stack

## Status

Proposed

## Purpose

Record an architectural decision for the Parish Reporting platform.

## Context

The platform needs a maintainable full-stack foundation for metadata APIs, connector integrations, and a dynamic dashboard UI.

## Decision

Use TypeScript across backend and frontend. Proposed backend: NestJS or a similarly modular Node.js framework. Proposed frontend: React with Vite. Validation: Zod or equivalent schema validation. Charts: Apache ECharts. Testing: unit tests for domain/application services and component tests for UI.

## Rationale

This decision supports metadata-driven reporting, connector independence, and Clean Architecture boundaries.

## Consequences

Shared language reduces model duplication. NestJS-style modules fit Clean Architecture ports/adapters. React/Vite is productive for metadata-driven UI. ECharts supports stacked bars and future visualization types.

## Alternatives Considered

Python/FastAPI backend was considered and remains viable for data-heavy work. Next.js full-stack was considered but can blur API/frontend boundaries. A Java/Spring backend was considered but may slow initial delivery.

## Open Questions

Confirm team preferences and hosting constraints before implementation.
