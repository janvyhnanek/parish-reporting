# ADR 0005: Metadata Model

## Status

Proposed

## Purpose

Record an architectural decision for the Parish Reporting platform.

## Context

Automatic discovery must infer field types, semantics, filters, dimensions, display names, keys, and visualization hints.

## Decision

Create a catalog model containing DataSource, Entity, Field, FieldType, SemanticType, Relationship, Dashboard, FilterDefinition, DimensionDefinition, and VisualizationSpec.

## Rationale

This decision supports metadata-driven reporting, connector independence, and Clean Architecture boundaries.

## Consequences

A catalog is necessary for dynamic UI generation and aggregation without hardcoded columns.

## Alternatives Considered

Raw records only were rejected because they lack semantics. Manual-only configuration was rejected because new columns must be recognized automatically.

## Open Questions

How should field identity survive source column renames?
