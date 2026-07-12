# Vision

## Purpose

Define the long-term product direction for a generic, metadata-driven reporting platform whose first concrete use case is a task dashboard over the `Úkolovník` worksheet.

## Design

The platform will treat dashboards as configuration over a shared metadata catalog rather than as bespoke screens. Data sources are connected through a connector interface, normalized into entities/fields/records, enriched by automatic metadata discovery, and exposed to dashboards through generic APIs for metadata, filtering, aggregation, details, and export. The first dashboard will visualize task counts by configurable dimensions and task states using a stacked bar chart with drill-down into original records.

## Rationale

This direction keeps the first task dashboard useful while preventing the architecture from becoming Google-Sheets-specific or task-specific. It also allows future domains such as persons, parishes, projects, events, volunteers, and finance to be added through configuration and connector extensions.

## Alternatives Considered

A hardcoded task dashboard would be faster initially but would not support future dashboards without code changes. A BI tool embedding approach would outsource visualization but reduce control over metadata inference, relationship traversal, and domain-specific UX.

## Open Questions

- Which dashboards beyond tasks are expected first?
- What access control model is required for parish/user-level visibility?
- Should configuration be editable in the UI in the first release or stored as versioned JSON only?
