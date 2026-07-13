export type FieldType = "string" | "number" | "date" | "empty";

export type SemanticType =
  | "identifier"
  | "title"
  | "owner"
  | "date"
  | "status"
  | "risk"
  | "notes"
  | "text";

export interface FieldMetadata {
  id: string;
  sourceName: string;
  label: string;
  type: FieldType;
  semanticType: SemanticType;
  visible: boolean;
  filterable: boolean;
  dimension: boolean;
  completeness: number;
  distinctCount: number;
  sampleValues: string[];
}

export interface StatusRule {
  id: string;
  label: string;
  from: number | null;
  to: number | null;
  color: string;
  textColor: string;
  completed: boolean;
}

export interface DataSourceMetadata {
  id: string;
  name: string;
  connector: "google-sheets";
  spreadsheetId: string;
  gid: string;
  worksheetName: string;
  lastLoadedAt: string;
  rowCount: number;
}

export interface MetadataCatalog {
  source: DataSourceMetadata;
  entity: {
    id: string;
    name: string;
    primaryKey: string;
    fields: FieldMetadata[];
  };
  statusRules: StatusRule[];
}

export type RecordValue = string | number | null;

export interface DataRecord {
  id: string;
  values: Record<string, RecordValue>;
  raw: Record<string, string>;
}

export interface FilterState {
  query?: string;
  fields?: Record<string, string[]>;
}

export interface DashboardDefinition {
  id: string;
  title: string;
  description: string;
  entityId: string;
  defaultDimension: string;
  defaultSegment: string;
  defaultVisibleFields: string[];
}

export interface AggregationRequest {
  entityId: string;
  dimensionFieldId: string;
  segmentFieldId: string;
  filters?: FilterState;
}

export interface AggregationSegment {
  key: string;
  label: string;
  count: number;
  recordIds: string[];
  color?: string;
}

export interface AggregationGroup {
  key: string;
  label: string;
  total: number;
  segments: AggregationSegment[];
}

export interface AggregationResult {
  dimensionFieldId: string;
  segmentFieldId: string;
  groups: AggregationGroup[];
  segmentLabels: string[];
  segmentColors: Record<string, string>;
  totalRecords: number;
  filteredRecords: number;
  diagnostics: string[];
}

export interface DetailsRequest {
  entityId: string;
  recordIds?: string[];
  filters?: FilterState;
  limit?: number;
}
