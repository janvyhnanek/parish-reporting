# ADR 0003: Metadata-Driven Operation

## Status

Proposed

## Purpose

Record an architectural decision for the Parish Reporting platform.

## Context

The system must support new dashboards and columns without business logic changes.

## Decision

All dashboards, filters, dimensions, visible columns, status mapping, colors, and relationship traversal must be driven by metadata catalog plus JSON configuration.

## Rationale

This decision supports metadata-driven reporting, connector independence, and Clean Architecture boundaries.

## Consequences

This is the primary product differentiator and supports future sources/entities.

## Alternatives Considered

Hardcoded dashboard logic is faster but conflicts with the stated platform goal. Pure BI-tool configuration was considered but reduces custom inference/control.

## Open Questions

Which metadata fields are editable by admins in the UI?
