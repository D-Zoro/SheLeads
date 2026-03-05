"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from "react-simple-maps";
import { useOptimizationCtx } from "@/context/OptimizationContext";
import type { District } from "@/types";

const GEO_URL =
  "https://gist.githubusercontent.com/jbrobst/56c13bbbf9d97d187fea01ca62ea5112/raw/e388c4cae20aa53cb5090210a42ebb9b765c0a36/india_states.geojson";

/* ── State-level aggregated metrics ──────────────────────────── */
interface StateAgg {
  state: string;
  avgLiteracyGap: number;
  avgAgencyScore: number;
  totalQaoaAlloc: number;
  totalGreedyAlloc: number;
  districtCount: number;
  qaoaBoostedCount: number;
  avgImpactBaseline: number;
  avgImpactQuantum: number;
  avgImpactChangePct: number;
}

/* ── Color scale based on avg literacy_gap ─────────────────── */
function gapColor(gap: number | undefined): string {
  if (gap === undefined || gap === null) return "#1e293b";
  if (gap > 35) return "#dc2626";
  if (gap > 25) return "#f97316";
  if (gap > 18) return "#f59e0b";
  if (gap > 10) return "#84cc16";
  return "#22c55e";
}

/* ── Normalize state name for fuzzy matching ─────────────────── */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Alias map: normalized(GeoJSON name) → normalized(Dataset name)
 * Handles spelling & naming differences between the two sources.
 */
const GEO_TO_DATA_ALIAS: Record<string, string> = {
  [normalize("Maharashtra")]: normalize("Maharastra"),     // GeoJSON "Maharashtra" → Dataset "Maharastra"
  [normalize("Delhi")]: normalize("NCT of Delhi"),          // GeoJSON "Delhi" → Dataset "NCT of Delhi"
  [normalize("Andaman & Nicobar")]: normalize("Andaman & Nicobar Islands"), // GeoJSON trims "Islands"
};

/** Resolve a GeoJSON state name to the dataset normalized key */
function resolveGeoName(geoName: string): string {
  const norm = normalize(geoName);
  return GEO_TO_DATA_ALIAS[norm] ?? norm;
}

const LEGEND = [
  { color: "#dc2626", label: "> 35%" },
  { color: "#f97316", label: "25–35%" },
  { color: "#f59e0b", label: "18–25%" },
  { color: "#84cc16", label: "10–18%" },
  { color: "#22c55e", label: "< 10%" },
];

export default function IndiaMap() {
  const {
    districts,
    optimizationResult,
    setSelectedDistrict,
  } = useOptimizationCtx();

  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    agg: StateAgg | null;
    geoName: string;
  } | null>(null);

  const [geoError, setGeoError] = useState(false);

  /* ── Check if geojson loads ─────────────────────────────────── */
  useEffect(() => {
    fetch(GEO_URL, { method: "HEAD" })
      .then((r) => { if (!r.ok) setGeoError(true); })
      .catch(() => setGeoError(true));
  }, []);

  /* ── Build state-level aggregations ────────────────────────── */
  const stateMap = useMemo(() => {
    const map = new Map<string, StateAgg>();
    if (!districts.length) return map;

    const qaoa_selected_set = new Set(optimizationResult?.qaoa_selected || []);

    // Group districts by state
    const byState = new Map<string, District[]>();
    for (const d of districts) {
      const arr = byState.get(d.state) || [];
      arr.push(d);
      byState.set(d.state, arr);
    }

    for (const [state, dists] of byState) {
      const avgGap = dists.reduce((s, d) => s + d.literacy_gap, 0) / dists.length;
      const avgAgency = dists.reduce((s, d) => s + d.agency_score, 0) / dists.length;
      const totalQ = dists.reduce(
        (s, d) => s + (optimizationResult?.qaoa_allocation[d.district] || 0), 0
      );
      const totalG = dists.reduce(
        (s, d) => s + (optimizationResult?.greedy_allocation[d.district] || 0), 0
      );
      const boosted = dists.filter((d) => qaoa_selected_set.has(d.district)).length;

      // Predicted impact aggregation
      const avgImpactBaseline = dists.reduce(
        (s, d) => s + (optimizationResult?.predicted_impact_baseline?.[d.district] || 0), 0
      ) / dists.length;
      const avgImpactQuantum = dists.reduce(
        (s, d) => s + (optimizationResult?.predicted_impact_quantum?.[d.district] || 0), 0
      ) / dists.length;
      const avgImpactChangePct = avgImpactBaseline > 0.0001
        ? ((avgImpactQuantum - avgImpactBaseline) / avgImpactBaseline) * 100
        : 0;

      const agg: StateAgg = {
        state,
        avgLiteracyGap: avgGap,
        avgAgencyScore: avgAgency,
        totalQaoaAlloc: totalQ,
        totalGreedyAlloc: totalG,
        districtCount: dists.length,
        qaoaBoostedCount: boosted,
        avgImpactBaseline,
        avgImpactQuantum,
        avgImpactChangePct,
      };

      map.set(normalize(state), agg);
    }

    return map;
  }, [districts, optimizationResult]);

  /* ── Click → select the highest-gap district in that state ── */
  const handleStateClick = useCallback(
    (stateName: string) => {
      const norm = resolveGeoName(stateName);
      const agg = stateMap.get(norm);
      if (!agg) return;

      const stateDists = districts.filter(
        (d) => normalize(d.state) === norm
      );
      if (stateDists.length === 0) return;

      // Pick the highest literacy_gap district in that state
      const top = stateDists.reduce((best, d) =>
        d.literacy_gap > best.literacy_gap ? d : best
      );
      setSelectedDistrict(top);
    },
    [districts, stateMap, setSelectedDistrict]
  );

  if (geoError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-neo-text-dim">
        <p className="text-sm mb-2">Map data unavailable</p>
        <p className="text-xs">Check your internet connection</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          scale: 1100,
          center: [82, 22],
        }}
        width={700}
        height={750}
        style={{ width: "100%", height: "auto" }}
      >
        <ZoomableGroup>
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const geoName: string = geo.properties.ST_NM || geo.properties.NAME_1 || "";
                const norm = resolveGeoName(geoName);
                const agg = stateMap.get(norm);
                const fill = agg ? gapColor(agg.avgLiteracyGap) : "#1e293b";

                const hasBoosted = agg && agg.qaoaBoostedCount > 0;

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={fill}
                    stroke="#0a0f1e"
                    strokeWidth={0.6}
                    className={`outline-none transition-all duration-300 ${
                      hasBoosted ? "district-pulse" : ""
                    }`}
                    style={{
                      default: { opacity: 1 },
                      hover: {
                        fill: "#3b82f6",
                        opacity: 1,
                        cursor: "pointer",
                        stroke: "#22d3ee",
                        strokeWidth: 1.5,
                      },
                      pressed: { fill: "#2563eb" },
                    }}
                    onMouseEnter={(e) => {
                      setTooltip({
                        x: (e as unknown as MouseEvent).clientX,
                        y: (e as unknown as MouseEvent).clientY,
                        agg: agg || null,
                        geoName,
                      });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                    onClick={() => handleStateClick(geoName)}
                  />
                );
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>

      {/* ── Tooltip ──────────────────────────────────────────────── */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none glow-card px-4 py-3 min-w-[240px]"
          style={{
            left: Math.min(tooltip.x + 12, typeof window !== "undefined" ? window.innerWidth - 280 : 600),
            top: tooltip.y - 10,
          }}
        >
          <p className="font-[var(--font-heading)] font-bold text-neo-text text-sm">
            {tooltip.agg?.state || tooltip.geoName}
          </p>
          {tooltip.agg ? (
            <div className="mt-2 space-y-1 text-xs font-[var(--font-data)]">
              <p>
                Districts: <span className="text-neo-text">{tooltip.agg.districtCount}</span>
              </p>
              <p>
                Avg Literacy Gap:{" "}
                <span
                  className={
                    tooltip.agg.avgLiteracyGap > 25
                      ? "text-neo-red"
                      : tooltip.agg.avgLiteracyGap > 15
                        ? "text-neo-amber"
                        : "text-neo-green"
                  }
                >
                  {tooltip.agg.avgLiteracyGap.toFixed(1)}%
                </span>
              </p>
              <p>
                Quantum Budget:{" "}
                <span className="text-neo-blue">₹{tooltip.agg.totalQaoaAlloc.toFixed(1)} Cr</span>
              </p>
              <p>
                Greedy Budget:{" "}
                <span className="text-neo-amber">₹{tooltip.agg.totalGreedyAlloc.toFixed(1)} Cr</span>
              </p>
              <p>
                Avg Agency:{" "}
                <span className="text-neo-cyan">
                  {tooltip.agg.avgAgencyScore.toFixed(4)}
                </span>
              </p>
              <p>
                Predicted Impact:{" "}
                <span className={
                  tooltip.agg.avgImpactChangePct > 0 ? "text-neo-green" : "text-neo-red"
                }>
                  {tooltip.agg.avgImpactQuantum.toFixed(2)}
                  {" "}({tooltip.agg.avgImpactChangePct > 0 ? "+" : ""}{tooltip.agg.avgImpactChangePct.toFixed(1)}%)
                </span>
              </p>
              {tooltip.agg.qaoaBoostedCount > 0 && (
                <span className="inline-block mt-1 px-2 py-0.5 bg-neo-blue/20 text-neo-blue rounded text-[10px] font-bold">
                  {tooltip.agg.qaoaBoostedCount} QUANTUM BOOSTED
                </span>
              )}
              {tooltip.agg.avgLiteracyGap > 25 && (
                <span className="inline-block mt-1 ml-1 px-2 py-0.5 bg-neo-red/20 text-neo-red rounded text-[10px] font-bold">
                  PRIORITY REGION
                </span>
              )}
            </div>
          ) : (
            <p className="text-xs text-neo-text-dim mt-1">No data available</p>
          )}
        </div>
      )}

      {/* ── Legend ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-4 mt-3">
        <span className="text-[10px] text-neo-text-dim uppercase tracking-wider mr-2">
          Avg Literacy Gap
        </span>
        {LEGEND.map((l) => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ background: l.color }}
            />
            <span className="text-[10px] text-neo-text-dim">{l.label}</span>
          </div>
        ))}
      </div>
      <p className="text-[9px] text-neo-text-dim text-center mt-1">
        Click a state to inspect its highest-need district
      </p>
    </div>
  );
}
