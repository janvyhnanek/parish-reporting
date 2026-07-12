# Aggregation Engine

## Purpose

Define how records are grouped, filtered, joined, and summarized independently of visualization.

## Design

The aggregation engine accepts an entity ID, dimension definition, measure definition, state/segment definition, filter values, and optional relationship traversal path. It applies generated filters, resolves relationships, groups by dimension values, segments by configured state mapping, and returns a visualization-neutral result: groups, segments, counts, record IDs, labels, colors, totals, and diagnostics.

## Rationale

Visualization independence allows stacked bars now and future line, pie, treemap, timeline, gantt, calendar, sankey, and KPI views later without rewriting aggregation logic.

## Alternatives Considered

Performing aggregation in chart components was rejected. Pushing all aggregation to SQL was deferred because connectors include non-SQL sources and relationship traversal must be consistent.

## Open Questions

- Are calculated measures needed in the first release or only counts?
- Should aggregation results be cached by request hash?
