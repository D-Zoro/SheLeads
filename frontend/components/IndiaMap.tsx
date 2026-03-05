"use client";

import { useState, useMemo, useCallback } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from "react-simple-maps";
import { useOptimizationCtx } from "@/context/OptimizationContext";
import type { District } from "@/types";

const TOPO_URL =
  "https://raw.githubusercontent.com/deldersveld/topojson/master/countries/india/india-districts.json";

/* ── Color scale based on literacy_gap ─────────────────────────── */
function gapColor(gap: number | undefined): string {
  if (gap === undefined || gap === null) return "#1e293b";
  if (gap > 40) return "#dc2626";
  if (gap > 30) return "#f97316";
  if (gap > 20) return "#f59e0b";
  if (gap > 10) return "#84cc16";
  return "#22c55e";
}

/* ── Normalize name for fuzzy matching ─────────────────────────── */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const LEGEND = [
  { color: "#dc2626", label: "> 40%" },
  { color: "#f97316", label: "30–40%" },
  { color: "#f59e0b", label: "20–30%" },
  { color: "#84cc16", label: "10–20%" },
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
    district: District | null;
    geoName: string;
    qaoaAlloc: number;
    greedyAlloc: number;
  } | null>(null);

  /* ── Build lookup from normalized name → district ──────────── */
  const districtMap = useMemo(() => {
    const map = new Map<string, District>();
    for (const d of districts) {
      map.set(normalize(d.district), d);
    }
    return map;
  }, [districts]);

  /* ── Determine which districts got increased/decreased alloc ── */
  const allocDelta = useMemo(() => {
    if (!optimizationResult) return new Map<string, number>();
    const m = new Map<string, number>();
    const { qaoa_allocation, greedy_allocation } = optimizationResult;
    const allNames = new Set([
      ...Object.keys(qaoa_allocation),
      ...Object.keys(greedy_allocation),
    ]);
    for (const name of allNames) {
      const q = qaoa_allocation[name] || 0;
      const g = greedy_allocation[name] || 0;
      if (q !== g) m.set(normalize(name), q - g);
    }
    return m;
  }, [optimizationResult]);

  const handleClick = useCallback(
    (d: District | null) => {
      if (d) setSelectedDistrict(d);
    },
    [setSelectedDistrict]
  );

  return (
    <div className="relative">
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          scale: 1000,
          center: [82, 22],
        }}
        width={700}
        height={720}
        style={{ width: "100%", height: "auto" }}
      >
        <ZoomableGroup>
          <Geographies geography={TOPO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const geoName = geo.properties.NAME_2 || geo.properties.name || "";
                const norm = normalize(geoName);
                const d = districtMap.get(norm);
                const fill = d ? gapColor(d.literacy_gap) : "#1e293b";

                const delta = allocDelta.get(norm);
                const isPulse = delta !== undefined && delta > 0;
                const isDimmed = delta !== undefined && delta < 0;

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={fill}
                    stroke="#0a0f1e"
                    strokeWidth={0.4}
                    className={`outline-none transition-all duration-300 ${
                      isPulse ? "district-pulse" : ""
                    }`}
                    style={{
                      default: {
                        opacity: isDimmed ? 0.5 : 1,
                      },
                      hover: {
                        fill: "#3b82f6",
                        opacity: 1,
                        cursor: "pointer",
                      },
                      pressed: {
                        fill: "#2563eb",
                      },
                    }}
                    onMouseEnter={(e) => {
                      const qaoaAlloc = optimizationResult
                        ? optimizationResult.qaoa_allocation[d?.district || ""] || 0
                        : 0;
                      const greedyAlloc = optimizationResult
                        ? optimizationResult.greedy_allocation[d?.district || ""] || 0
                        : 0;
                      setTooltip({
                        x: (e as unknown as MouseEvent).clientX,
                        y: (e as unknown as MouseEvent).clientY,
                        district: d || null,
                        geoName,
                        qaoaAlloc,
                        greedyAlloc,
                      });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                    onClick={() => handleClick(d || null)}
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
          className="fixed z-50 pointer-events-none glow-card px-4 py-3 min-w-[220px]"
          style={{
            left: tooltip.x + 12,
            top: tooltip.y - 10,
          }}
        >
          <p className="font-[var(--font-heading)] font-bold text-neo-text text-sm">
            {tooltip.district?.district || tooltip.geoName}
          </p>
          {tooltip.district ? (
            <div className="mt-2 space-y-1 text-xs font-[var(--font-data)]">
              <p>
                Literacy Gap:{" "}
                <span
                  className={
                    tooltip.district.literacy_gap > 30
                      ? "text-neo-red"
                      : tooltip.district.literacy_gap > 15
                        ? "text-neo-amber"
                        : "text-neo-green"
                  }
                >
                  {tooltip.district.literacy_gap.toFixed(1)}%
                </span>
              </p>
              <p>
                Quantum Alloc:{" "}
                <span className="text-neo-blue">₹{tooltip.qaoaAlloc} Cr</span>
              </p>
              <p>
                Greedy Alloc:{" "}
                <span className="text-neo-amber">₹{tooltip.greedyAlloc} Cr</span>
              </p>
              <p>
                Agency Score:{" "}
                <span className="text-neo-cyan">
                  {tooltip.district.agency_score.toFixed(4)}
                </span>
              </p>
              {tooltip.district.literacy_gap > 30 && (
                <span className="inline-block mt-1 px-2 py-0.5 bg-neo-red/20 text-neo-red rounded text-[10px] font-bold">
                  PRIORITY
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
          Literacy Gap
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
    </div>
  );
}
