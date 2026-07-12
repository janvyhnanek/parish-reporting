import { parse } from "csv-parse/sync";
import type { DataRecord, FieldMetadata, MetadataCatalog, RecordValue, SemanticType } from "../shared/types";
import { appConfig } from "./config";

interface LoadedSheet {
  catalog: MetadataCatalog;
  records: DataRecord[];
}

let cache: { loadedAt: number; value: LoadedSheet } | null = null;

function slugify(value: string): string {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return slug || "field";
}

function uniqueIds(headers: string[]): string[] {
  const seen = new Map<string, number>();
  return headers.map((header, index) => {
    const base = slugify(header || `Sloupec ${index + 1}`);
    const count = seen.get(base) || 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}_${count + 1}`;
  });
}

function findHeaderRow(rows: string[][]): number {
  const candidates = ["#", "projekt", "úkol", "ukol", "stav plnění", "stav plneni"];
  const index = rows.findIndex((row) => {
    const normalized = row.map((cell) => cell.trim().toLowerCase());
    return candidates.filter((candidate) => normalized.includes(candidate)).length >= 3;
  });
  return index >= 0 ? index : 0;
}

function trimEmptyEdges(row: string[]): string[] {
  let first = 0;
  let last = row.length - 1;
  while (first <= last && !row[first]?.trim()) first += 1;
  while (last >= first && !row[last]?.trim()) last -= 1;
  return row.slice(first, last + 1);
}

function normalizeRows(rows: string[][]): { headers: string[]; dataRows: string[][] } {
  const headerIndex = findHeaderRow(rows);
  const rawHeaders = trimEmptyEdges(rows[headerIndex] || []);
  const firstHeaderColumn = rows[headerIndex]?.findIndex((cell) => cell.trim() === rawHeaders[0]) ?? 0;
  const headers = rawHeaders.map((header, index) => header.trim() || `Sloupec ${index + 1}`);
  const dataRows = rows
    .slice(headerIndex + 1)
    .map((row) => row.slice(firstHeaderColumn, firstHeaderColumn + headers.length))
    .filter((row) => row.some((cell) => cell?.trim()));
  return { headers, dataRows };
}

function inferType(values: string[]): FieldMetadata["type"] {
  const nonEmpty = values.filter(Boolean);
  if (!nonEmpty.length) return "empty";
  const numeric = nonEmpty.filter((value) => !Number.isNaN(Number(value.replace(",", "."))));
  if (numeric.length / nonEmpty.length > 0.85) return "number";
  const dates = nonEmpty.filter((value) => parseDate(value) !== null);
  if (dates.length / nonEmpty.length > 0.75) return "date";
  return "string";
}

function inferSemantic(id: string, label: string): SemanticType {
  const text = `${id} ${label}`.toLowerCase();
  if (id === "_" || text.includes(" cislo") || label.trim() === "#") return "identifier";
  if (text.includes("projekt") || text.includes("ukol")) return "title";
  if (text.includes("gestor") || text.includes("odpovedna") || text.includes("osoba")) return "owner";
  if (text.includes("datum") || text.includes("termin")) return "date";
  if (text.includes("stav")) return "status";
  if (text.includes("rizik")) return "risk";
  if (text.includes("poznam")) return "notes";
  return "text";
}

function parseDate(value: string): string | null {
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const [, month, day, year] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function normalizeValue(value: string, type: FieldMetadata["type"]): RecordValue {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (type === "number") return Number(trimmed.replace(",", "."));
  if (type === "date") return parseDate(trimmed) || trimmed;
  return trimmed;
}

function buildCatalog(headers: string[], ids: string[], rows: string[][], loadedAt: string): MetadataCatalog {
  const fields = headers.map((header, index) => {
    const values = rows.map((row) => row[index]?.trim() || "").filter(Boolean);
    const distinct = [...new Set(values)];
    const type = inferType(values);
    const semanticType = inferSemantic(ids[index], header);
    const lowCardinality = distinct.length > 0 && distinct.length <= Math.max(20, rows.length * 0.45);
    return {
      id: ids[index],
      sourceName: header,
      label: header,
      type,
      semanticType,
      visible: semanticType !== "notes" || distinct.length < rows.length,
      filterable: type !== "empty" && (lowCardinality || semanticType === "owner" || semanticType === "status"),
      dimension: type !== "empty" && lowCardinality,
      completeness: rows.length ? values.length / rows.length : 0,
      distinctCount: distinct.length,
      sampleValues: distinct.slice(0, 50),
    } satisfies FieldMetadata;
  });

  const primaryKey = ids[headers.findIndex((header) => header.trim() === "#")] || ids[0];
  return {
    source: {
      id: "tasks-sheet",
      name: "Úkolovník AP",
      connector: "google-sheets",
      spreadsheetId: appConfig.googleSheet.spreadsheetId,
      gid: appConfig.googleSheet.gid,
      worksheetName: appConfig.googleSheet.worksheetName,
      lastLoadedAt: loadedAt,
      rowCount: rows.length,
    },
    entity: {
      id: "tasks",
      name: "Úkoly",
      primaryKey,
      fields,
    },
  };
}

async function fetchCsv(): Promise<string> {
  const url = `https://docs.google.com/spreadsheets/d/${appConfig.googleSheet.spreadsheetId}/export?format=csv&gid=${appConfig.googleSheet.gid}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Google Sheets export failed: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

export async function loadSheet(force = false): Promise<LoadedSheet> {
  if (!force && cache && Date.now() - cache.loadedAt < appConfig.cacheMs) return cache.value;

  const csv = await fetchCsv();
  const rows = parse(csv, { bom: true, relax_column_count: true }) as string[][];
  const { headers, dataRows } = normalizeRows(rows);
  const ids = uniqueIds(headers);
  const loadedAt = new Date().toISOString();
  const catalog = buildCatalog(headers, ids, dataRows, loadedAt);
  const fieldTypes = Object.fromEntries(catalog.entity.fields.map((field) => [field.id, field.type]));
  const primaryKey = catalog.entity.primaryKey;
  const records = dataRows.map((row, index) => {
    const values = Object.fromEntries(ids.map((id, cellIndex) => [id, normalizeValue(row[cellIndex] || "", fieldTypes[id])]));
    const raw = Object.fromEntries(ids.map((id, cellIndex) => [id, row[cellIndex]?.trim() || ""]));
    return {
      id: String(values[primaryKey] || raw[primaryKey] || index + 1),
      values,
      raw,
    };
  });

  const value = { catalog, records };
  cache = { loadedAt: Date.now(), value };
  return value;
}
