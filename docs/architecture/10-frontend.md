# Frontend Architecture

## Purpose

Define metadata-driven frontend composition and reusable components.

## Design

The frontend renders dashboards from metadata and API results. Core components: App, DashboardSelector, Toolbar, FilterPanel, DimensionSelector, ChartContainer, ChartRenderer, DetailDialog, DetailTable, ExportPanel, and Settings. Components consume generic dashboard, metadata, filter, and aggregation models. Visualization plugins receive normalized data and emit drill-down events with record ID sets.

## Rationale

This prevents the first task dashboard from becoming a one-off React screen and enables future dashboards through configuration.

## Alternatives Considered

Hardcoded task table/chart components were rejected. Server-rendered pages were considered but interactive filtering, drill-down, and charting favor a client application.

## Open Questions

- Should Settings allow editing config in MVP or read-only display?
- Which charting library should be used? Proposed ADR selects Apache ECharts.
