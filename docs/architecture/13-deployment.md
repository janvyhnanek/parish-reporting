# Deployment

## Purpose

Describe deployment topology and operational assumptions.

## Design

The proposed deployment is a containerized backend API plus static frontend served by a web server or container platform. Configuration files and secrets are mounted or injected via environment-specific deployment configuration. Optional cache/catalog storage can start with local JSON or SQLite for MVP and evolve to PostgreSQL. CI should validate docs, tests, linting, and build artifacts before deployment.

## Rationale

Container boundaries keep frontend/backend/dependencies reproducible and support future scaling.

## Alternatives Considered

Manual deployment on a single VM was considered for prototypes but should not be the only production strategy. Serverless-only deployment was deferred because connector caching and exports may need longer-running jobs.

## Open Questions

- Target production host?
- Is Docker acceptable?
- Should scheduled metadata refresh jobs be included in MVP?
