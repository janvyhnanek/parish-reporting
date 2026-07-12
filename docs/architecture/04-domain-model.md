# Domain Model

## Purpose

Define core domain concepts independent of frameworks and external systems.

## Design

Core concepts: `DataSource`, `Connector`, `Entity`, `Field`, `Record`, `FieldType`, `SemanticType`, `Relationship`, `Dashboard`, `Dimension`, `FilterDefinition`, `FilterValue`, `AggregationRequest`, `AggregationResult`, `VisualizationSpec`, and `ExportRequest`. Records are opaque maps keyed by field IDs. Fields carry inferred and configured metadata. Dashboards reference entities and dimensions by IDs, not code-specific structures.

## Rationale

A small, stable domain model is required for metadata-driven behavior. Business logic should operate on fields and semantic tags rather than column names like `Status` or `Assignee`.

## Alternatives Considered

Using DTOs generated directly from each sheet was rejected because columns can change dynamically. Using raw JSON everywhere was rejected because the system needs validation, inference, relationships, and predictable APIs.

## Open Questions

- What convention should field IDs use when source columns are renamed?
- How should deleted columns be represented in historical dashboard configs?
