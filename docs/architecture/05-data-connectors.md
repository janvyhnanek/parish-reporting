# Data Connectors

## Purpose

Specify the connector abstraction and first Google Sheets connector design.

## Design

A connector exposes capabilities such as `discover()`, `readRows()`, `getSchemaHints()`, and optional `testConnection()`. The Google Sheets connector accepts spreadsheet ID, worksheet name or gid, auth strategy, header row, and range settings. It loads all rows, derives columns from the header row, preserves original cell values, and emits normalized records plus source metadata. Future connectors implement the same interface for CSV, Excel, PostgreSQL, MySQL, REST, GraphQL, Airtable, SharePoint, and Microsoft Lists.

## Rationale

The application must not depend on a single source. Connectors isolate transport/auth/source-specific parsing from metadata inference and reporting logic.

## Alternatives Considered

Direct Google Sheets API calls from aggregation code were rejected. Importing all data into a fixed database schema was rejected for the initial design because dynamic fields and source diversity are central goals.

## Open Questions

- Should Google Sheets auth use service account, OAuth user consent, or both?
- How should connector errors be surfaced to dashboard users?
- Should connector reads support incremental sync?
