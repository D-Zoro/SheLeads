"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useOptimizationCtx } from "@/context/OptimizationContext";

/* ── Custom tooltip ───────────────────────────────────────────── */
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: Array<{ name: string; value: number; color: string; payload?: any }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  return (
    <div className="glow-card px-4 py-3 text-xs font-[var(--font-data)]">
      <p className="font-bold text-neo-text mb-1">{row?.fullName ?? label}</p>
      {row?.isBoosted && (
        <p className="text-neo-blue mb-1">⚛ QAOA-Boosted (3× priority)</p>
      )}
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: ₹{p.value.toFixed(1)} Cr
        </p>
      ))}
      {row?.gap != null && (
        <p className="text-neo-text-dim mt-1">Literacy Gap: {row.gap.toFixed(1)}%</p>
      )}
    </div>
  );
}

/* ── Agency score color ──────────────────────────────────────── */
function agencyColor(score: number): string {
  if (score > 0.5) return "#22c55e";
  if (score > 0.2) return "#f59e0b";
  return "#ef4444";
}

export default function ComparisonChart() {
  const { districts, optimizationResult } = useOptimizationCtx();

  const qaoaBoostedSet = useMemo(() => {
    return new Set(optimizationResult?.qaoa_selected ?? []);
  }, [optimizationResult]);

  /* ── Top 10 districts: QAOA-boosted first, then by literacy_gap ── */
  const chartData = useMemo(() => {
    if (!districts.length) return [];

    // Sort: QAOA-boosted first (by quantum alloc desc), then by literacy_gap desc
    const sorted = [...districts]
      .map((d) => {
        const qaoa = optimizationResult?.qaoa_allocation[d.district] || 0;
        const greedy = optimizationResult?.greedy_allocation[d.district] || 0;
        const isBoosted = qaoaBoostedSet.has(d.district);
        const impactBase = optimizationResult?.predicted_impact_baseline?.[d.district] || 0;
        const impactQ = optimizationResult?.predicted_impact_quantum?.[d.district] || 0;
        const impactG = optimizationResult?.predicted_impact_greedy?.[d.district] || 0;
        return { ...d, qaoa, greedy, isBoosted, impactBase, impactQ, impactG };
      })
      .sort((a, b) => {
        // QAOA-boosted districts always come first
        if (a.isBoosted && !b.isBoosted) return -1;
        if (!a.isBoosted && b.isBoosted) return 1;
        // Then sort by quantum allocation descending
        return b.qaoa - a.qaoa;
      })
      .slice(0, 10);

    return sorted.map((d) => ({
      name:
        d.district.length > 10
          ? d.district.slice(0, 10) + "…"
          : d.district,
      fullName: d.district,
      greedy: d.greedy,
      quantum: d.qaoa,
      agency: d.agency_score,
      gap: d.literacy_gap,
      isBoosted: d.isBoosted,
      impactBase: d.impactBase,
      impactQ: d.impactQ,
      impactG: d.impactG,
    }));
  }, [districts, optimizationResult, qaoaBoostedSet]);

  if (!chartData.length) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-8 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Main comparison bar chart ──────────────────────────── */}
      <div>
        <h3 className="text-xs uppercase tracking-wider text-neo-text-dim mb-3">
          Quantum vs Greedy Allocation — Top 10 Districts
        </h3>
        <p className="text-[10px] text-neo-text-dim mb-2">
          ⚛ Blue bars = quantum-optimized · Amber bars = naive greedy · Stars = QAOA-boosted
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={chartData}
            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
          >
            <XAxis
              dataKey="name"
              tick={{ fill: "#94a3b8", fontSize: 9 }}
              axisLine={{ stroke: "#1e293b" }}
              tickLine={false}
              angle={-20}
              textAnchor="end"
              height={50}
            />
            <YAxis
              tick={{ fill: "#94a3b8", fontSize: 10 }}
              axisLine={{ stroke: "#1e293b" }}
              tickLine={false}
              label={{
                value: "₹ Crores",
                angle: -90,
                position: "insideLeft",
                fill: "#64748b",
                fontSize: 10,
              }}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: "rgba(59,130,246,0.05)" }}
            />
            <Legend
              wrapperStyle={{ fontSize: 10, color: "#94a3b8" }}
              align="right"
              verticalAlign="top"
            />
            <Bar
              dataKey="greedy"
              name="Greedy"
              fill="#f59e0b"
              radius={[3, 3, 0, 0]}
              isAnimationActive
              animationDuration={600}
            />
            <Bar
              dataKey="quantum"
              name="Quantum"
              radius={[3, 3, 0, 0]}
              isAnimationActive
              animationDuration={600}
              style={{ filter: "drop-shadow(0 0 4px rgba(59,130,246,0.5))" }}
            >
              {chartData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.isBoosted ? "#06b6d4" : "#3b82f6"}
                  stroke={entry.isBoosted ? "#22d3ee" : "transparent"}
                  strokeWidth={entry.isBoosted ? 1.5 : 0}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Predicted Impact comparison ─────────────────────────── */}
      <div>
        <h3 className="text-xs uppercase tracking-wider text-neo-text-dim mb-3">
          Predicted Impact — Baseline vs Quantum vs Greedy
        </h3>
        <p className="text-[10px] text-neo-text-dim mb-2">
          RF model predicts impact score under each budget scenario
        </p>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart
            data={chartData}
            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
          >
            <XAxis
              dataKey="name"
              tick={{ fill: "#94a3b8", fontSize: 9 }}
              axisLine={{ stroke: "#1e293b" }}
              tickLine={false}
              angle={-20}
              textAnchor="end"
              height={50}
            />
            <YAxis
              tick={{ fill: "#94a3b8", fontSize: 10 }}
              axisLine={{ stroke: "#1e293b" }}
              tickLine={false}
              label={{
                value: "Impact Score",
                angle: -90,
                position: "insideLeft",
                fill: "#64748b",
                fontSize: 10,
              }}
            />
            <Tooltip
              content={({ active, payload, label: lbl }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="glow-card px-4 py-3 text-xs font-[var(--font-data)]">
                    <p className="font-bold text-neo-text mb-1">{lbl}</p>
                    {payload.map((p) => (
                      <p key={p.name} style={{ color: p.color as string }}>
                        {p.name}: {(p.value as number).toFixed(3)}
                      </p>
                    ))}
                  </div>
                );
              }}
              cursor={{ fill: "rgba(59,130,246,0.05)" }}
            />
            <Legend
              wrapperStyle={{ fontSize: 10, color: "#94a3b8" }}
              align="right"
              verticalAlign="top"
            />
            <Bar
              dataKey="impactBase"
              name="Current"
              fill="#64748b"
              radius={[3, 3, 0, 0]}
              isAnimationActive
              animationDuration={600}
            />
            <Bar
              dataKey="impactG"
              name="Greedy"
              fill="#f59e0b"
              radius={[3, 3, 0, 0]}
              isAnimationActive
              animationDuration={600}
            />
            <Bar
              dataKey="impactQ"
              name="Quantum"
              fill="#3b82f6"
              radius={[3, 3, 0, 0]}
              isAnimationActive
              animationDuration={600}
              style={{ filter: "drop-shadow(0 0 4px rgba(59,130,246,0.5))" }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
