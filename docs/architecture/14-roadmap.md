# Implementation Roadmap

## Purpose

Split delivery into reviewable iterations after architecture approval.

## Design

Iteration 0: architecture approval. Iteration 1: repository skeleton, CI, config schema, domain models. Iteration 2: Google Sheets connector and metadata discovery. Iteration 3: metadata API and catalog overrides. Iteration 4: aggregation engine and generated filters. Iteration 5: frontend dashboard shell and stacked bar chart. Iteration 6: drill-down dialog and exports. Iteration 7: relationship engine and cross-source aggregation. Iteration 8: hardening, performance, security, and additional connectors.

## Rationale

Small iterations reduce risk and allow approval at each architectural seam before broad implementation.

## Alternatives Considered

A big-bang implementation was rejected. Building only the frontend first was rejected because connector and metadata models define the system's flexibility.

## Open Questions

- Which iteration should include Google OAuth setup?
- Should CSV connector be implemented before or after Google Sheets to test connector abstraction?
