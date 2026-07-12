# System Overview

## Purpose

Describe the system at a high level and define major runtime components.

## Design

The system is split into Frontend, Backend API, Application Services, Domain/Core, Infrastructure Connectors, and Configuration/Catalog storage. Frontend consumes REST endpoints and renders metadata-driven dashboards. Backend application services orchestrate connector reads, metadata inference, relationship resolution, aggregation, filtering, and exports. Domain/Core defines connector interfaces, metadata entities, relationship models, filter models, aggregation requests, and visualization-independent result shapes. Infrastructure implements Google Sheets first and later additional connectors.

## Rationale

This separation follows Clean Architecture: dependencies point inward toward domain abstractions. Connectors, web frameworks, chart libraries, and storage choices remain replaceable.

## Alternatives Considered

A monolithic frontend-only implementation was rejected because score-sized data and exports might work but backend-side connector auth, caching, relationships, and exports would become fragile. A database-first ETL system was deferred because live connector reads and metadata discovery are first-class requirements.

## Open Questions

- Should metadata/catalog be persisted in PostgreSQL from day one or start as JSON files?
- Should connector reads be synchronous on request or cached by background jobs?
