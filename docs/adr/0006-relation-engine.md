# ADR 0006: Relation Engine

## Status

Proposed

## Purpose

Record an architectural decision for the Parish Reporting platform.

## Context

Cross-source aggregation requires configurable joins between heterogeneous sources.

## Decision

Represent relationships in JSON with source/target fields, cardinality, composite keys, optional safe transforms, and null handling. Build runtime indexes for traversal.

## Rationale

This decision supports metadata-driven reporting, connector independence, and Clean Architecture boundaries.

## Consequences

This enables aggregations such as Tasks by parish/deanery/district via linked sources.

## Alternatives Considered

Hardcoded joins and arbitrary code transforms were rejected. SQL-only joins were deferred due to non-SQL sources.

## Open Questions

Which transform functions should be allow-listed initially?
