# REST API Specification

## Purpose

Define API surface needed by the metadata-driven frontend.

## Design

Initial REST endpoints: `GET /api/metadata`, `GET /api/connectors`, `POST /api/connectors/test`, `GET /api/dashboards`, `GET /api/dashboards/{id}`, `GET /api/entities/{id}/records`, `POST /api/aggregations`, `POST /api/details`, `POST /api/exports/csv`, `POST /api/exports/xlsx`, and `POST /api/metadata/refresh`. Requests use IDs from the metadata catalog. Filters are sent as typed values keyed by field ID.

## Rationale

REST is sufficient for dashboard-driven interactions and easier to document and secure in early iterations.

## Alternatives Considered

GraphQL was considered for flexible metadata traversal but deferred. Direct connector APIs from frontend were rejected for security and consistency.

## Open Questions

- Should export endpoints be synchronous or asynchronous jobs?
- Should metadata refresh be admin-only?
