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
        <p className="text-neo-blue mb-1">QAOA Priority (3x boosted)</p>
      )}
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: ₹{p.value.toFixed(1)} Cr
        </p>
      ))}
      {row?.gap != null && (
        <p className="text-neo-text-dim mt-1">Literacy Gap: {row.gap.toFixed(1)}%</p>
      )}
      {row?.empGap != null && (
        <p className="text-neo-text-dim">Employment Gap: {row.empGap.toFixed(1)}%</p>
      )}
    </div>
  );
}

export default function ComparisonChart() {
  const { districts, optimizationResult } = useOptimizationCtx();

  const qaoaBoostedSet = useMemo(() => {
    return new Set(optimizationResult?.qaoa_selected ?? []);
  }, [optimizationResult]);

  /* ── Top 10 districts: QAOA-boosted first, then by quantum alloc ── */
  const chartData = useMemo(() => {
    if (!districts.length) return [];

    const sorted = [...districts]
      .map((d) => {
        const qaoa = optimizationResult?.qaoa_allocation[d.district] || 0;
        const greedy = optimizationResult?.greedy_allocation[d.district] || 0;
        const isBoosted = qaoaBoostedSet.has(d.district);
        return { ...d, qaoa, greedy, isBoosted };
      })
      .sort((a, b) => {
        if (a.isBoosted && !b.isBoosted) return -1;
        if (!a.isBoosted && b.isBoosted) return 1;
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
      gap: d.literacy_gap,
      empGap: d.employment_gap,
      agency: d.agency_score,
      isBoosted: d.isBoosted,
    }));
  }, [districts, optimizationResult, qaoaBoostedSet]);

  // Summary stats
  const qaoa_total = optimizationResult
    ? Object.values(optimizationResult.qaoa_allocation).reduce((s, v) => s + v, 0)
    : 0;
  const greedy_total = optimizationResult
    ? Object.values(optimizationResult.greedy_allocation).reduce((s, v) => s + v, 0)
    : 0;
  const improvement = optimizationResult?.improvement_pct ?? 0;
  const qaoaImpact = optimizationResult?.qaoa_total_impact ?? 0;
  const greedyImpact = optimizationResult?.greedy_total_impact ?? 0;

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
          Blue = quantum-optimized · Amber = greedy baseline · Cyan = QAOA priority
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

      {/* ── Impact Summary Cards ─────────────────────────────── */}
      <div>
        <h3 className="text-xs uppercase tracking-wider text-neo-text-dim mb-3">
          Optimization Summary
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-neo-bg/50 border border-neo-border rounded-lg px-3 py-2.5">
            <p className="text-[9px] uppercase tracking-wider text-neo-text-dim">QAOA Impact</p>
            <p className="text-lg font-[var(--font-data)] font-bold text-neo-blue mt-0.5">
              {qaoaImpact.toFixed(4)}
            </p>
            <p className="text-[9px] text-neo-text-dim">₹{qaoa_total.toFixed(0)} Cr deployed</p>
          </div>
          <div className="bg-neo-bg/50 border border-neo-border rounded-lg px-3 py-2.5">
            <p className="text-[9px] uppercase tracking-wider text-neo-text-dim">Greedy Impact</p>
            <p className="text-lg font-[var(--font-data)] font-bold text-neo-amber mt-0.5">
              {greedyImpact.toFixed(4)}
            </p>
            <p className="text-[9px] text-neo-text-dim">₹{greedy_total.toFixed(0)} Cr deployed</p>
          </div>
          <div className="col-span-2 bg-neo-bg/50 border border-neo-border rounded-lg px-3 py-2.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] uppercase tracking-wider text-neo-text-dim">Quantum Advantage</p>
                <p className={`text-xl font-[var(--font-data)] font-bold mt-0.5 ${
                  improvement >= 0 ? "text-neo-green" : "text-neo-red"
                }`}>
                  {improvement >= 0 ? "+" : ""}{improvement.toFixed(2)}%
                </p>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-neo-text-dim">QAOA selects optimal district</p>
                <p className="text-[9px] text-neo-text-dim">combinations via quantum</p>
                <p className="text-[9px] text-neo-text-dim">superposition (8 qubits)</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
