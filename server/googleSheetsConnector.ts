import { parse } from "csv-parse/sync";
import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";
import type { DataRecord, FieldMetadata, MetadataCatalog, RecordValue, SemanticType, StatusRule } from "../shared/types";
import { appConfig } from "./config";
import { classifyTaskStatus, loadEditaceConfig } from "./statusRules";

interface LoadedSheet {
  catalog: MetadataCatalog;
  records: DataRecord[];
}

interface XlsxCell {
  value: string;
  formula: boolean;
}

let cache: { loadedAt: number; value: LoadedSheet } | null = null;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  textNodeName: "#text",
});

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

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
  const taskColumnIndex = headers.findIndex((header) => slugify(header) === "ukol");
  const dataRows = rows
    .slice(headerIndex + 1)
    .map((row) => row.slice(firstHeaderColumn, firstHeaderColumn + headers.length))
    .filter((row) => row.some((cell) => cell?.trim()))
    .filter((row) => taskColumnIndex < 0 || Boolean(row[taskColumnIndex]?.trim()));
  return { headers, dataRows };
}

function collectText(node: unknown): string {
  if (node == null) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(collectText).join("");
  if (typeof node === "object") {
    const record = node as Record<string, unknown>;
    return Object.entries(record)
      .filter(([key]) => !["r", "s", "xml:space"].includes(key))
      .map(([, value]) => collectText(value))
      .join("");
  }
  return "";
}

function cellColumn(cellRef: string): number {
  const letters = cellRef.match(/[A-Z]+/)?.[0] || "A";
  return [...letters].reduce((sum, char) => sum * 26 + char.charCodeAt(0) - 64, 0);
}

function cellValue(cell: Record<string, unknown>, sharedStrings: string[]): string {
  const raw = cell.v;
  if (raw === undefined || raw === null) return "";
  const value = typeof raw === "object" ? collectText(raw) : String(raw);
  if (cell.t === "s") return sharedStrings[Number(value)] || "";
  return value;
}

async function loadSharedStrings(zip: JSZip): Promise<string[]> {
  const file = zip.file("xl/sharedStrings.xml");
  if (!file) return [];
  const root = parser.parse(await file.async("text"));
  return asArray(root.sst?.si).map(collectText);
}

async function loadWorkbookSheetPath(zip: JSZip, sheetName: string): Promise<string> {
  const workbook = parser.parse(await zip.file("xl/workbook.xml")!.async("text"));
  const rels = parser.parse(await zip.file("xl/_rels/workbook.xml.rels")!.async("text"));
  const relMap = new Map(asArray(rels.Relationships?.Relationship).map((rel: Record<string, string>) => [rel.Id, rel.Target]));
  const sheet = asArray(workbook.workbook?.sheets?.sheet).find((item: Record<string, string>) => item.name === sheetName) as Record<string, string> | undefined;
  if (!sheet) throw new Error(`Worksheet ${sheetName} not found`);
  const target = relMap.get(sheet["r:id"]);
  if (!target) throw new Error(`Worksheet relationship for ${sheetName} not found`);
  return target.startsWith("xl/") ? target : `xl/${target}`;
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
  if (type === "number") {
    const numeric = Number(trimmed.replace(",", "."));
    return Number.isNaN(numeric) ? trimmed : numeric;
  }
  if (type === "date") return parseDate(trimmed) || trimmed;
  return trimmed;
}

function buildCatalog(headers: string[], ids: string[], rows: string[][], loadedAt: string, statusRules: StatusRule[], stewards: string[]): MetadataCatalog {
  const discoveredFields = headers.map((header, index) => {
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

  const fields = [
    ...discoveredFields,
    {
      id: "stav_ukolu",
      sourceName: "Stav úkolu",
      label: "Stav úkolu",
      type: "string",
      semanticType: "status",
      visible: true,
      filterable: true,
      dimension: true,
      completeness: rows.length ? rows.filter((row) => row.some((cell) => cell.trim())).length / rows.length : 0,
      distinctCount: statusRules.length,
      sampleValues: statusRules.map((rule) => rule.label),
    } satisfies FieldMetadata,
  ];

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
    statusRules,
    stewards,
  };
}

async function fetchCsv(): Promise<string> {
  const urls = [
    `https://docs.google.com/spreadsheets/d/${appConfig.googleSheet.spreadsheetId}/export?format=csv&gid=${appConfig.googleSheet.gid}`,
    `https://docs.google.com/spreadsheets/d/${appConfig.googleSheet.spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(appConfig.googleSheet.worksheetName)}`,
  ];
  let lastError = "";
  for (const url of urls) {
    const response = await fetch(url);
    if (response.ok) return response.text();
    lastError = `${response.status} ${response.statusText}`;
  }
  throw new Error(`Google Sheets export failed: ${lastError}`);
}

async function fetchFormulaRows(): Promise<XlsxCell[][]> {
  const url = `https://docs.google.com/spreadsheets/d/${appConfig.googleSheet.spreadsheetId}/export?format=xlsx`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Google Sheets XLSX export failed: ${response.status} ${response.statusText}`);
  const zip = await JSZip.loadAsync(await response.arrayBuffer());
  const [sharedStrings, sheetPath] = await Promise.all([
    loadSharedStrings(zip),
    loadWorkbookSheetPath(zip, appConfig.googleSheet.worksheetName),
  ]);
  const sheet = parser.parse(await zip.file(sheetPath)!.async("text"));
  const rows = asArray(sheet.worksheet?.sheetData?.row);
  return rows.map((row: Record<string, unknown>) => {
    const parsedRow: XlsxCell[] = [];
    asArray(row.c as Record<string, unknown> | Record<string, unknown>[]).forEach((cell) => {
      parsedRow[cellColumn(String(cell.r || "A")) - 1] = {
        value: cellValue(cell, sharedStrings).trim(),
        formula: Boolean(cell.f),
      };
    });
    return parsedRow;
  });
}

function overlayFormulaValues(csvRows: string[][], xlsxRows: XlsxCell[][]): string[][] {
  const xlsxTextRows = xlsxRows.map((row) => row.map((cell) => cell?.value || ""));
  const csvHeaderIndex = findHeaderRow(csvRows);
  const xlsxHeaderIndex = findHeaderRow(xlsxTextRows);
  const csvHeaders = trimEmptyEdges(csvRows[csvHeaderIndex] || []);
  const xlsxHeaders = trimEmptyEdges(xlsxTextRows[xlsxHeaderIndex] || []);
  const csvFirstHeaderColumn = csvRows[csvHeaderIndex]?.findIndex((cell) => (cell || "").trim() === csvHeaders[0]) ?? 0;
  const xlsxFirstHeaderColumn = xlsxTextRows[xlsxHeaderIndex]?.findIndex((cell) => (cell || "").trim() === xlsxHeaders[0]) ?? 0;
  const csvColumnsById = new Map(csvHeaders.map((header, index) => [slugify(header), csvFirstHeaderColumn + index]));
  const formulaColumns = xlsxHeaders
    .map((header, index) => ({ id: slugify(header), xlsxColumn: xlsxFirstHeaderColumn + index }))
    .filter(({ id, xlsxColumn }) => csvColumnsById.has(id) && xlsxRows.slice(xlsxHeaderIndex + 1).some((row) => row[xlsxColumn]?.formula));

  return csvRows.map((sourceRow, rowIndex) => {
    const row = [...sourceRow];
    const dataOffset = rowIndex - csvHeaderIndex - 1;
    if (dataOffset < 0) return row;
    const xlsxRow = xlsxRows[xlsxHeaderIndex + 1 + dataOffset];
    if (!xlsxRow) return row;
    formulaColumns.forEach(({ id, xlsxColumn }) => {
      const csvColumn = csvColumnsById.get(id);
      const cell = xlsxRow[xlsxColumn];
      if (csvColumn !== undefined && cell?.formula) row[csvColumn] = cell.value;
    });
    return row;
  });
}

async function fetchRows(): Promise<string[][]> {
  const csvRows = parse(await fetchCsv(), { bom: true, relax_column_count: true }) as string[][];
  try {
    return overlayFormulaValues(csvRows, await fetchFormulaRows());
  } catch (error) {
    console.warn(error instanceof Error ? error.message : error);
    return csvRows;
  }
}

export async function loadSheet(force = false): Promise<LoadedSheet> {
  if (!force && cache && Date.now() - cache.loadedAt < appConfig.cacheMs) return cache.value;

  const [rows, editaceConfig] = await Promise.all([fetchRows(), loadEditaceConfig()]);
  const { statusRules, stewards } = editaceConfig;
  const { headers, dataRows } = normalizeRows(rows);
  const ids = uniqueIds(headers);
  const loadedAt = new Date().toISOString();
  const catalog = buildCatalog(headers, ids, dataRows, loadedAt, statusRules, stewards);
  const fieldTypes = Object.fromEntries(catalog.entity.fields.map((field) => [field.id, field.type]));
  const primaryKey = catalog.entity.primaryKey;
  const records = dataRows.map((row, index) => {
    const values = Object.fromEntries(ids.map((id, cellIndex) => [id, normalizeValue(row[cellIndex] || "", fieldTypes[id])]));
    const raw = Object.fromEntries(ids.map((id, cellIndex) => [id, row[cellIndex]?.trim() || ""]));
    const statusRule = classifyTaskStatus(raw.stav_plneni, statusRules);
    values.stav_ukolu = statusRule.label;
    raw.stav_ukolu = statusRule.label;
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
