import ReactECharts from "echarts-for-react";
import { Download, RefreshCw, Search, Settings2, Table2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { AggregationResult, DashboardDefinition, DataRecord, FieldMetadata, FilterState, MetadataCatalog } from "../../shared/types";
import { downloadCsv, fetchAggregation, fetchDashboards, fetchDetails, fetchMetadata, refreshMetadata } from "./api";

const colorPalette = ["#2563eb", "#dc2626", "#f59e0b", "#16a34a", "#7c3aed", "#0891b2", "#be123c", "#4b5563"];

function fieldLabel(fields: FieldMetadata[], id: string): string {
  return fields.find((field) => field.id === id)?.label || id;
}

function emptyFilter(): FilterState {
  return { query: "", fields: {} };
}

function selectedFilterCount(filters: FilterState): number {
  return Object.values(filters.fields || {}).reduce((sum, values) => sum + values.length, 0) + (filters.query ? 1 : 0);
}

function useInitialData() {
  const [metadata, setMetadata] = useState<MetadataCatalog | null>(null);
  const [dashboard, setDashboard] = useState<DashboardDefinition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchMetadata(), fetchDashboards()])
      .then(([catalog, dashboards]) => {
        setMetadata(catalog);
        setDashboard(dashboards[0] || null);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return { metadata, setMetadata, dashboard, error, loading };
}

export function App() {
  const { metadata, setMetadata, dashboard, error, loading } = useInitialData();
  const [filters, setFilters] = useState<FilterState>(emptyFilter);
  const [dimension, setDimension] = useState("");
  const [segment, setSegment] = useState("");
  const [aggregation, setAggregation] = useState<AggregationResult | null>(null);
  const [selectedRecords, setSelectedRecords] = useState<DataRecord[]>([]);
  const [selectedTitle, setSelectedTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [aggregationError, setAggregationError] = useState<string | null>(null);

  const fields = metadata?.entity.fields || [];
  const visibleFields = fields.filter((field) => field.visible);
  const dimensionFields = fields.filter((field) => field.dimension);
  const filterFields = fields.filter((field) => field.filterable && field.sampleValues.length);

  useEffect(() => {
    if (!metadata || !dashboard) return;
    setDimension(dashboard.defaultDimension && fields.some((field) => field.id === dashboard.defaultDimension)
      ? dashboard.defaultDimension
      : dimensionFields[0]?.id || fields[0]?.id || "");
    setSegment(dashboard.defaultSegment && fields.some((field) => field.id === dashboard.defaultSegment)
      ? dashboard.defaultSegment
      : fields.find((field) => field.semanticType === "status")?.id || dimensionFields[1]?.id || fields[0]?.id || "");
  }, [metadata, dashboard]);

  useEffect(() => {
    if (!metadata || !dimension || !segment) return;
    setBusy(true);
    setAggregationError(null);
    fetchAggregation({ entityId: metadata.entity.id, dimensionFieldId: dimension, segmentFieldId: segment, filters })
      .then(setAggregation)
      .catch((err: Error) => setAggregationError(err.message))
      .finally(() => setBusy(false));
  }, [metadata, dimension, segment, filters]);

  const chartOption = useMemo(() => {
    if (!aggregation) return {};
    return {
      color: aggregation.segmentLabels.map((segmentKey, index) => aggregation.segmentColors[segmentKey] || colorPalette[index % colorPalette.length]),
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      legend: { type: "scroll", top: 0, textStyle: { color: "#334155" } },
      grid: { top: 54, left: 42, right: 24, bottom: 96 },
      xAxis: {
        type: "category",
        data: aggregation.groups.map((group) => group.label),
        axisLabel: { rotate: 34, width: 110, overflow: "truncate", color: "#475569" },
      },
      yAxis: { type: "value", minInterval: 1, axisLabel: { color: "#475569" } },
      series: aggregation.segmentLabels.map((segmentKey) => ({
        name: aggregation.groups.flatMap((group) => group.segments).find((item) => item.key === segmentKey)?.label || segmentKey,
        type: "bar",
        stack: "records",
        emphasis: { focus: "series" },
        itemStyle: { color: aggregation.segmentColors[segmentKey] },
        data: aggregation.groups.map((group) => {
          const segmentItem = group.segments.find((item) => item.key === segmentKey);
          return { value: segmentItem?.count || 0, recordIds: segmentItem?.recordIds || [], groupLabel: group.label };
        }),
      })),
    };
  }, [aggregation]);

  async function openDetails(recordIds?: string[], title = "Detail záznamů") {
    if (!metadata) return;
    setSelectedTitle(title);
    setSelectedRecords(await fetchDetails({ entityId: metadata.entity.id, recordIds, filters, limit: 500 }));
  }

  async function refreshSource() {
    setBusy(true);
    try {
      setMetadata(await refreshMetadata());
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="boot">Načítám metadata a Google Sheet…</div>;
  if (error || !metadata || !dashboard) return <div className="boot error">Nepodařilo se spustit aplikaci: {error || "chybí metadata"}</div>;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">V</span>
          <div>
            <strong>Vizitátor</strong>
            <small>{metadata.source.name}</small>
          </div>
        </div>

        <div className="filter-search">
          <Search size={16} />
          <input
            value={filters.query || ""}
            onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
            placeholder="Hledat v úkolech"
          />
        </div>

        <div className="panel-title">
          <Settings2 size={16} />
          <span>Filtry</span>
          <button type="button" onClick={() => setFilters(emptyFilter())}>Vymazat</button>
        </div>

        <div className="filter-list">
          {filterFields.map((field) => (
            <label key={field.id} className="filter-field">
              <span>{field.label}</span>
              <select
                multiple
                value={filters.fields?.[field.id] || []}
                onChange={(event) => {
                  const values = Array.from(event.currentTarget.selectedOptions).map((option) => option.value);
                  setFilters((current) => ({ ...current, fields: { ...(current.fields || {}), [field.id]: values } }));
                }}
              >
                {field.sampleValues.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
          ))}
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <h1>{dashboard.title}</h1>
            <p>{dashboard.description}</p>
          </div>
          <div className="topbar-actions">
            <button type="button" onClick={refreshSource} disabled={busy}><RefreshCw size={16} />Obnovit zdroj</button>
            <button type="button" onClick={() => downloadCsv({ entityId: metadata.entity.id, filters })}><Download size={16} />CSV</button>
          </div>
        </header>

        <section className="kpi-grid">
          <div><span>Řádků ve zdroji</span><strong>{metadata.source.rowCount}</strong></div>
          <div><span>Po filtru</span><strong>{aggregation?.filteredRecords ?? "…"}</strong></div>
          <div><span>Sloupců</span><strong>{fields.length}</strong></div>
          <div><span>Aktivních filtrů</span><strong>{selectedFilterCount(filters)}</strong></div>
        </section>

        <section className="toolbar">
          <label>
            <span>Dimenze</span>
            <select value={dimension} onChange={(event) => setDimension(event.target.value)}>
              {dimensionFields.map((field) => <option key={field.id} value={field.id}>{field.label}</option>)}
            </select>
          </label>
          <label>
            <span>Segment</span>
            <select value={segment} onChange={(event) => setSegment(event.target.value)}>
              {fields.filter((field) => field.filterable || field.dimension).map((field) => (
                <option key={field.id} value={field.id}>{field.label}</option>
              ))}
            </select>
          </label>
          <button type="button" onClick={() => openDetails(undefined, "Všechny filtrované záznamy")}>
            <Table2 size={16} />Zobrazit tabulku
          </button>
        </section>

        {aggregationError ? <div className="alert">{aggregationError}</div> : null}

        <section className="chart-panel">
          <div className="section-heading">
            <div>
              <h2>{fieldLabel(fields, dimension)} podle {fieldLabel(fields, segment)}</h2>
              <p>Kliknutím na sloupec otevřeš detail záznamů v dané skupině.</p>
            </div>
            {busy ? <span className="sync">Synchronizuji…</span> : null}
          </div>
          <ReactECharts
            className="chart"
            option={chartOption}
            onEvents={{
              click: (params: { data?: { recordIds?: string[]; groupLabel?: string }; seriesName?: string }) => {
                const ids = params.data?.recordIds || [];
                if (ids.length) openDetails(ids, `${params.data?.groupLabel || "Skupina"} / ${params.seriesName || "segment"}`);
              },
            }}
          />
        </section>

        <section className="metadata-panel">
          <div className="section-heading">
            <div>
              <h2>Datový katalog</h2>
              <p>Automaticky odvozená metadata z listu {metadata.source.worksheetName}.</p>
            </div>
          </div>
          <div className="status-rule-list" aria-label="Pravidla stavů úkolů">
            {metadata.statusRules.map((rule) => (
              <span
                key={rule.id}
                className="status-rule-chip"
                style={{ backgroundColor: rule.color, color: rule.textColor }}
              >
                {rule.label}
                <small>{rule.completed ? "splněno" : `${rule.from ?? "−∞"} až ${rule.to ?? "+∞"}`}</small>
              </span>
            ))}
          </div>
          <div className="field-grid">
            {fields.map((field) => (
              <div className="field-card" key={field.id}>
                <strong>{field.label}</strong>
                <span>{field.type} / {field.semanticType}</span>
                <small>{field.distinctCount} hodnot, {Math.round(field.completeness * 100)} % vyplněno</small>
              </div>
            ))}
          </div>
        </section>
      </main>

      {selectedRecords.length ? (
        <DetailDialog
          title={selectedTitle}
          fields={visibleFields}
          records={selectedRecords}
          onClose={() => setSelectedRecords([])}
        />
      ) : null}
    </div>
  );
}

function DetailDialog({ title, fields, records, onClose }: {
  title: string;
  fields: FieldMetadata[];
  records: DataRecord[];
  onClose: () => void;
}) {
  return (
    <div className="dialog-backdrop" role="dialog" aria-modal="true">
      <div className="dialog">
        <header>
          <div>
            <h2>{title}</h2>
            <p>{records.length} záznamů</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Zavřít"><X size={18} /></button>
        </header>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>{fields.map((field) => <th key={field.id}>{field.label}</th>)}</tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  {fields.map((field) => <td key={field.id}>{String(record.values[field.id] ?? "")}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
