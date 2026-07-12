# Metadata Model

## Purpose

Define the catalog that drives dashboards, filters, dimensions, relationships, and visualizations.

## Design

The catalog stores data sources, entities, fields, field type inference, semantic inference, display metadata, primary key candidates, filter capabilities, dimension capabilities, visualization hints, and relationships. It combines discovered metadata with explicit JSON overrides. Discovery is repeatable; configuration can pin decisions such as semantic type, display order, color mapping, and visibility.

## Rationale

The metadata catalog is the platform's core. It enables newly added columns to appear without code changes while still allowing human curation where inference is uncertain.

## Alternatives Considered

Pure automatic inference was rejected because semantic meaning sometimes requires domain knowledge. Pure manual configuration was rejected because it would not satisfy dynamic column discovery.

## Open Questions

- What confidence threshold should trigger automatic use vs. requiring manual confirmation?
- Should metadata changes be versioned and audited?
