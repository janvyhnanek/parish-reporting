import express from "express";
import { z } from "zod";
import { appConfig } from "./config";
import { aggregate, dashboard, details, exportCsv, getMetadata, getRecords } from "./reportingService";

const app = express();
app.use(express.json({ limit: "1mb" }));

const filtersSchema = z.object({
  query: z.string().optional(),
  fields: z.record(z.string(), z.array(z.string())).optional(),
}).optional();

const aggregationSchema = z.object({
  entityId: z.string(),
  dimensionFieldId: z.string(),
  segmentFieldId: z.string(),
  filters: filtersSchema,
});

const detailsSchema = z.object({
  entityId: z.string(),
  recordIds: z.array(z.string()).optional(),
  filters: filtersSchema,
  limit: z.number().int().positive().max(10_000).optional(),
});

app.get("/api/metadata", async (_request, response, next) => {
  try {
    response.json(await getMetadata());
  } catch (error) {
    next(error);
  }
});

app.post("/api/metadata/refresh", async (_request, response, next) => {
  try {
    response.json(await getMetadata(true));
  } catch (error) {
    next(error);
  }
});

app.get("/api/connectors", (_request, response) => {
  response.json([{ id: "google-sheets", name: "Google Sheets", capabilities: ["discover", "readRows", "testConnection"] }]);
});

app.post("/api/connectors/test", async (_request, response, next) => {
  try {
    const metadata = await getMetadata(true);
    response.json({ ok: true, source: metadata.source });
  } catch (error) {
    next(error);
  }
});

app.get("/api/dashboards", (_request, response) => {
  response.json([dashboard]);
});

app.get("/api/dashboards/:id", (request, response) => {
  if (request.params.id !== dashboard.id) {
    response.status(404).json({ error: "Dashboard not found" });
    return;
  }
  response.json(dashboard);
});

app.get("/api/entities/:id/records", async (request, response, next) => {
  try {
    if (request.params.id !== dashboard.entityId) {
      response.status(404).json({ error: "Entity not found" });
      return;
    }
    response.json({ records: await getRecords() });
  } catch (error) {
    next(error);
  }
});

app.post("/api/aggregations", async (request, response, next) => {
  try {
    response.json(await aggregate(aggregationSchema.parse(request.body)));
  } catch (error) {
    next(error);
  }
});

app.post("/api/details", async (request, response, next) => {
  try {
    response.json({ records: await details(detailsSchema.parse(request.body)) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/exports/csv", async (request, response, next) => {
  try {
    const csv = await exportCsv(detailsSchema.parse(request.body));
    response.header("Content-Type", "text/csv; charset=utf-8");
    response.header("Content-Disposition", "attachment; filename=parish-report.csv");
    response.send(csv);
  } catch (error) {
    next(error);
  }
});

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  response.status(500).json({ error: message });
});

app.listen(appConfig.port, () => {
  console.log(`Vizitátor API listening on http://127.0.0.1:${appConfig.port}`);
});
