# ADR 0004: Data Source Connectors

## Status

Proposed

## Purpose

Record an architectural decision for the Parish Reporting platform.

## Context

The first source is Google Sheets but future sources include Excel, CSV, SQL, APIs, Airtable, SharePoint, and Microsoft Lists.

## Decision

Define a connector interface for discovery and row reading. Implement Google Sheets first; add connectors behind the same port.

## Rationale

This decision supports metadata-driven reporting, connector independence, and Clean Architecture boundaries.

## Consequences

Business logic depends only on connector abstractions and normalized records.

## Alternatives Considered

Direct source-specific integration in use cases was rejected. Full ETL to fixed schemas was deferred.

## Open Questions

Should connector SDKs support writeback in future, or read-only only?
