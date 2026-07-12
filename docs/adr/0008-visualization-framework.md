# ADR 0008: Visualization Framework

## Status

Proposed

## Purpose

Record an architectural decision for the Parish Reporting platform.

## Context

The first visualization is stacked bar, with many future chart types.

## Decision

Use a ChartRenderer abstraction. Visualization plugins receive normalized aggregation results and configuration. First plugin: stacked bar chart.

## Rationale

This decision supports metadata-driven reporting, connector independence, and Clean Architecture boundaries.

## Consequences

Visualization independence prevents business logic from leaking into charts.

## Alternatives Considered

Building one hardcoded chart was rejected. Embedding a full BI dashboard engine was considered but deferred.

## Open Questions

Which chart library license and bundle size constraints apply?
