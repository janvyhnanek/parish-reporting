import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";
import type { StatusRule } from "../shared/types";
import { appConfig } from "./config";

interface EditaceConfig {
  statusRules: StatusRule[];
  stewards: string[];
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  textNodeName: "#text",
});

const fallbackRules: StatusRule[] = [
  { id: "po_terminu", label: "Po termínu", from: null, to: -1, color: "#000000", textColor: "#ff0000", completed: false },
  { id: "akutni_termin", label: "Akutní termín", from: 0, to: 2, color: "#ffc7ce", textColor: "#9c0006", completed: false },
  { id: "blizici_se_termin", label: "Blížící se termín", from: 3, to: 6, color: "#ffeb9c", textColor: "#9c6500", completed: false },
  { id: "vzdaleny_termin", label: "Vzdálený termín", from: 7, to: null, color: "#c6efce", textColor: "#006100", completed: false },
  { id: "splneno", label: "SPLNĚNO", from: null, to: null, color: "#093d93", textColor: "#ffffff", completed: true },
];

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "rule";
}

function normalizeColor(color: Record<string, string> | undefined, fallback: string): string {
  if (!color) return fallback;
  if (color.rgb) return `#${color.rgb.slice(-6).toLowerCase()}`;
  if (color.theme === "0") return "#ffffff";
  if (color.theme === "1") return "#000000";
  return fallback;
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
  return cell.t === "s" ? sharedStrings[Number(value)] || "" : value;
}

function parseSharedStrings(zip: JSZip): string[] {
  const file = zip.file("xl/sharedStrings.xml");
  if (!file) return [];
  throw new Error("shared strings must be loaded asynchronously");
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

async function loadStyleLookups(zip: JSZip) {
  const root = parser.parse(await zip.file("xl/styles.xml")!.async("text"));
  const fills = asArray(root.styleSheet?.fills?.fill);
  const fonts = asArray(root.styleSheet?.fonts?.font);
  const xfs = asArray(root.styleSheet?.cellXfs?.xf);

  return xfs.map((xf: Record<string, string>) => {
    const fill = fills[Number(xf.fillId || 0)] as Record<string, unknown> | undefined;
    const font = fonts[Number(xf.fontId || 0)] as Record<string, unknown> | undefined;
    const patternFill = fill?.patternFill as Record<string, Record<string, string>> | undefined;
    return {
      color: normalizeColor(patternFill?.fgColor, "#e2e8f0"),
      textColor: normalizeColor(font?.color as Record<string, string> | undefined, "#172033"),
    };
  });
}

export function classifyTaskStatus(value: unknown, rules: StatusRule[]): StatusRule {
  const text = value == null ? "" : String(value).trim();
  const completedRule = rules.find((rule) => rule.completed);
  if (text.toLocaleUpperCase("cs-CZ").includes("SPLNĚNO")) return completedRule || fallbackRules[4];

  const numeric = Number(text.replace(",", "."));
  if (!Number.isNaN(numeric)) {
    const match = rules.find((rule) => !rule.completed
      && (rule.from === null || numeric >= rule.from)
      && (rule.to === null || numeric <= rule.to));
    if (match) return match;
  }

  return rules.find((rule) => !rule.completed && rule.from === null) || fallbackRules[0];
}

function parseStewards(rows: Record<number, { value: string }>[]): string[] {
  const headerRowIndex = rows.findIndex((row) => Object.values(row).some((cell) => (
    cell.value.toLocaleLowerCase("cs-CZ").includes("sloupec")
    && cell.value.toLocaleLowerCase("cs-CZ").includes("gestor")
  )));
  if (headerRowIndex < 0) return [];

  const headerRow = rows[headerRowIndex];
  const stewardColumn = Number(Object.entries(headerRow).find(([, cell]) => (
    cell.value.toLocaleLowerCase("cs-CZ").includes("sloupec")
    && cell.value.toLocaleLowerCase("cs-CZ").includes("gestor")
  ))?.[0]);
  if (!Number.isFinite(stewardColumn)) return [];

  const ignored = new Set(["všichni", "vsichni"]);
  const stewards = rows.slice(headerRowIndex + 1)
    .map((row) => row[stewardColumn]?.value?.trim() || "")
    .filter((value) => value && !ignored.has(value.toLocaleLowerCase("cs-CZ")));
  return [...new Set(stewards)];
}

export async function loadEditaceConfig(): Promise<EditaceConfig> {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${appConfig.googleSheet.spreadsheetId}/export?format=xlsx`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Google Sheets XLSX export failed: ${response.status}`);
    const zip = await JSZip.loadAsync(await response.arrayBuffer());
    const [sharedStrings, styleLookups, sheetPath] = await Promise.all([
      loadSharedStrings(zip),
      loadStyleLookups(zip),
      loadWorkbookSheetPath(zip, "Editace"),
    ]);
    const sheet = parser.parse(await zip.file(sheetPath)!.async("text"));
    const rows = asArray(sheet.worksheet?.sheetData?.row);
    const parsedRows = rows.map((row: Record<string, unknown>) => {
      const cells = asArray(row.c as Record<string, unknown> | Record<string, unknown>[]).map((cell) => {
        const style = styleLookups[Number(cell.s || 0)] || { color: "#e2e8f0", textColor: "#172033" };
        return {
          column: cellColumn(String(cell.r || "A")),
          value: cellValue(cell, sharedStrings).trim(),
          color: style.color,
          textColor: style.textColor,
        };
      });
      return Object.fromEntries(cells.map((cell) => [cell.column, cell]));
    });

    const headerIndex = parsedRows.findIndex((row) => (
      Object.values(row).some((cell) => cell.value === "Limit od")
      && Object.values(row).some((cell) => cell.value === "Limit do")
      && Object.values(row).some((cell) => cell.value === "Podbarvení")
    ));
    const stewards = parseStewards(parsedRows);
    if (headerIndex < 0) return { statusRules: fallbackRules, stewards };

    const header = parsedRows[headerIndex];
    const limitFromCol = Number(Object.entries(header).find(([, cell]) => cell.value === "Limit od")?.[0]);
    const limitToCol = Number(Object.entries(header).find(([, cell]) => cell.value === "Limit do")?.[0]);
    const labelCol = Number(Object.entries(header).find(([, cell]) => cell.value === "Podbarvení")?.[0]);

    const rules = parsedRows.slice(headerIndex + 1)
      .map((row) => {
        const labelCell = row[labelCol];
        if (!labelCell?.value) return null;
        const label = labelCell.value;
        return {
          id: slugify(label),
          label,
          from: row[limitFromCol]?.value ? Number(row[limitFromCol].value) : null,
          to: row[limitToCol]?.value ? Number(row[limitToCol].value) : null,
          color: labelCell.color,
          textColor: labelCell.textColor,
          completed: label.toLocaleUpperCase("cs-CZ").includes("SPLNĚNO"),
        } satisfies StatusRule;
      })
      .filter((rule): rule is StatusRule => Boolean(rule));

    return { statusRules: rules.length ? rules : fallbackRules, stewards };
  } catch (error) {
    console.warn(error instanceof Error ? error.message : error);
    return { statusRules: fallbackRules, stewards: [] };
  }
}

export async function loadStatusRules(): Promise<StatusRule[]> {
  return (await loadEditaceConfig()).statusRules;
}
