import type {
  AggregationRequest,
  AggregationResult,
  DashboardDefinition,
  DataRecord,
  DetailsRequest,
  MetadataCatalog,
} from "../../shared/types";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(payload.error || response.statusText);
  }
  return response.json() as Promise<T>;
}

export async function fetchMetadata(): Promise<MetadataCatalog> {
  return request<MetadataCatalog>("/api/metadata");
}

export async function refreshMetadata(): Promise<MetadataCatalog> {
  return request<MetadataCatalog>("/api/metadata/refresh", { method: "POST", body: "{}" });
}

export async function fetchDashboards(): Promise<DashboardDefinition[]> {
  return request<DashboardDefinition[]>("/api/dashboards");
}

export async function fetchAggregation(payload: AggregationRequest): Promise<AggregationResult> {
  return request<AggregationResult>("/api/aggregations", { method: "POST", body: JSON.stringify(payload) });
}

export async function fetchDetails(payload: DetailsRequest): Promise<DataRecord[]> {
  const response = await request<{ records: DataRecord[] }>("/api/details", { method: "POST", body: JSON.stringify(payload) });
  return response.records;
}

export async function downloadCsv(payload: DetailsRequest): Promise<void> {
  const response = await fetch("/api/exports/csv", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Export se nepodařil.");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "parish-report.csv";
  link.click();
  URL.revokeObjectURL(url);
}
