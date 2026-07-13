# Vizitátor

Metadata-driven reporting platform for configurable dashboards over heterogeneous data sources.

## Current phase

MVP implementation in progress. The first dashboard is implemented against the Google Sheet worksheet `Úkolovník`.

## Run locally

```bash
npm install
npm run dev
```

The frontend runs on `http://localhost:5173` and proxies `/api` to the backend on `http://127.0.0.1:8788`.

## Implemented MVP

- Google Sheets CSV connector for the provided spreadsheet/gid
- automatic header discovery and field metadata inference
- REST endpoints for metadata, dashboards, records, aggregations, details, CSV export, and metadata refresh
- React/Vite dashboard with filters, dimension and segment selectors, stacked bar chart, drill-down details, metadata catalog, status colors from the `Editace` worksheet, and CSV export

## Documentation

- [`docs/architecture`](docs/architecture) — system architecture documents
- [`docs/adr`](docs/adr) — architectural decision records

## First source

Google Sheet worksheet `Úkolovník` from the provided spreadsheet. The current connector uses the public CSV export URL for `gid=1437857818`.
