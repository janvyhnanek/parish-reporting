# Relationships

## Purpose

Describe configurable relationships between logical entities and how they are resolved.

## Design

Relationships are defined in JSON with source entity, source fields, target entity, target fields, cardinality, optional transform functions, null handling, and display labels. Supported cardinalities are 1:1, 1:N, N:1, N:N, and composite keys. The relationship engine builds lookup indexes and exposes traversal to the aggregation engine and detail API.

## Rationale

Cross-source aggregations require resolving links without hardcoded joins. Configurable relationships allow tasks to aggregate by person, parish, deanery, district, project, or volunteer role.

## Alternatives Considered

Hardcoded joins were rejected. Full SQL federation was considered but deferred because source connectors may not support SQL semantics and many sources are spreadsheet-like.

## Open Questions

- How are N:N join tables represented when they come from spreadsheets?
- Which transformation functions are safe to allow in JSON configuration?
