# ADR 0007: Aggregation Engine

## Status

Proposed

## Purpose

Record an architectural decision for the Parish Reporting platform.

## Context

Dashboards require grouping, filtering, state segmentation, drill-down, and relationship traversal.

## Decision

Implement a visualization-independent aggregation engine that returns groups, segments, counts, colors, totals, and record IDs.

## Rationale

This decision supports metadata-driven reporting, connector independence, and Clean Architecture boundaries.

## Consequences

Charts and details can share the same result shape, and new visualizations can reuse aggregation outputs.

## Alternatives Considered

Chart-side aggregation was rejected. SQL-only aggregation was deferred.

## Open Questions

Should measures beyond count be supported in MVP?
