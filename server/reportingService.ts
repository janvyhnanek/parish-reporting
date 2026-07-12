import type {
  AggregationRequest,
  AggregationResult,
  DashboardDefinition,
  DataRecord,
  DetailsRequest,
  FilterState,
  MetadataCatalog,
} from "../shared/types";
import { loadSheet } from "./googleSheetsConnector";

export const dashboard: DashboardDefinition = {
  id: "task-overview",
  title: "Přehled úkolů",
  description: "Metadata-driven dashboard nad listem Úkolovník Arcibiskupství pražského.",
  entityId: "tasks",
  defaultDimension: "gestor_vedouci_oddeleni_nebo_odboru",
  defaultSegment: "stav_plneni",
  defaultVisibleFields: [
    "field",
    "projekt",
    "ukol",
    "gestor_vedouci_oddeleni_nebo_odboru",
    "odpovedna_osoba_referent",
    "termin_pro_splneni",
    "datum_splneni",
    "stav_plneni",
    "poznamky",
  ],
};

function valueText(value: unknown): string {
  return value == null ? "" : String(value);
}

function matchesFilters(record: DataRecord, filters?: FilterState): boolean {
  if (!filters) return true;
  if (filters.query) {
    const query = filters.query.trim().toLowerCase();
    if (query && !Object.values(record.values).some((value) => valueText(value).toLowerCase().includes(query))) {
      return false;
    }
  }

  for (const [fieldId, selectedValues] of Object.entries(filters.fields || {})) {
    if (!selectedValues.length) continue;
    const value = valueText(record.values[fieldId]) || "Nevyplněno";
    if (!selectedValues.includes(value)) return false;
  }

  return true;
}

function filteredRecords(records: DataRecord[], filters?: FilterState): DataRecord[] {
  return records.filter((record) => matchesFilters(record, filters));
}

function formatSegmentLabel(value: string): string {
  if (!value || value === "Nevyplněno") return "Nevyplněno";
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return value;
  if (numeric < 0) return `Po termínu (${Math.abs(numeric)} dní)`;
  if (numeric === 0) return "Dnes";
  return `${numeric} dní zbývá`;
}

export async function getMetadata(force = false): Promise<MetadataCatalog> {
  return (await loadSheet(force)).catalog;
}

export async function getRecords(filters?: FilterState): Promise<DataRecord[]> {
  const { records } = await loadSheet();
  return filteredRecords(records, filters);
}

export async function aggregate(request: AggregationRequest): Promise<AggregationResult> {
  const { records } = await loadSheet();
  const filtered = filteredRecords(records, request.filters);
  const groups = new Map<string, Map<string, DataRecord[]>>();

  filtered.forEach((record) => {
    const groupKey = valueText(record.values[request.dimensionFieldId]) || "Nevyplněno";
    const segmentKey = valueText(record.values[request.segmentFieldId]) || "Nevyplněno";
    if (!groups.has(groupKey)) groups.set(groupKey, new Map());
    const segments = groups.get(groupKey)!;
    if (!segments.has(segmentKey)) segments.set(segmentKey, []);
    segments.get(segmentKey)!.push(record);
  });

  const segmentLabels = [...new Set(filtered.map((record) => valueText(record.values[request.segmentFieldId]) || "Nevyplněno"))]
    .sort((a, b) => Number(a) - Number(b) || a.localeCompare(b, "cs"));

  const resultGroups = [...groups.entries()]
    .map(([key, segments]) => ({
      key,
      label: key,
      total: [...segments.values()].reduce((sum, items) => sum + items.length, 0),
      segments: segmentLabels.map((segmentKey) => {
        const items = segments.get(segmentKey) || [];
        return {
          key: segmentKey,
          label: formatSegmentLabel(segmentKey),
          count: items.length,
          recordIds: items.map((record) => record.id),
        };
      }),
    }))
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label, "cs"))
    .slice(0, 30);

  return {
    dimensionFieldId: request.dimensionFieldId,
    segmentFieldId: request.segmentFieldId,
    groups: resultGroups,
    segmentLabels,
    totalRecords: records.length,
    filteredRecords: filtered.length,
    diagnostics: resultGroups.length > 30 ? ["Výsledek je omezen na 30 největších skupin."] : [],
  };
}

export async function details(request: DetailsRequest): Promise<DataRecord[]> {
  const { records } = await loadSheet();
  const byId = request.recordIds?.length ? new Set(request.recordIds) : null;
  return filteredRecords(records, request.filters)
    .filter((record) => !byId || byId.has(record.id))
    .slice(0, request.limit || 500);
}

export async function exportCsv(request: DetailsRequest): Promise<string> {
  const catalog = await getMetadata();
  const rows = await details({ ...request, limit: 10_000 });
  const fields = catalog.entity.fields.filter((field) => field.visible);
  const escape = (value: unknown) => `"${valueText(value).replace(/"/g, '""')}"`;
  return [
    fields.map((field) => escape(field.label)).join(","),
    ...rows.map((record) => fields.map((field) => escape(record.values[field.id])).join(",")),
  ].join("\n");
}
