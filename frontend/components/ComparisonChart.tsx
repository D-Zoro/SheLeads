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
function AllocTooltip({
  active,
  payload,
}: {
  active?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: Array<{ name: string; value: number; color: string; payload?: any }>;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  return (
    <div className="glow-card px-4 py-3 text-xs font-[var(--font-data)]">
      <p className="font-bold text-neo-text mb-1">{row?.fullName}</p>
      <p className="text-neo-text-dim text-[10px] mb-1.5">{row?.stateName}</p>
      {row?.isBoosted && (
        <p className="text-neo-cyan mb-1 text-[10px]">QAOA Priority District (3x boost)</p>
      )}
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: ₹{p.value.toFixed(2)} Cr
        </p>
      ))}
      <div className="border-t border-neo-border/50 mt-1.5 pt-1.5 text-neo-text-dim">
        <p>Literacy Gap: {row?.gap?.toFixed(1)}%</p>
        <p>Employment Gap: {row?.empGap?.toFixed(1)}%</p>
        <p>Agency Score: {row?.agency?.toFixed(3)}</p>
      </div>
    </div>
  );
}

export default function ComparisonChart() {
  const { districts, optimizationResult } = useOptimizationCtx();

  const qaoaBoostedSet = useMemo(() => {
    return new Set(optimizationResult?.qaoa_selected ?? []);
  }, [optimizationResult]);

  /* ── Top 10 by quantum alloc: boosted first ─────────────────── */
  const chartData = useMemo(() => {
    if (!districts.length || !optimizationResult) return [];

    return [...districts]
      .map((d) => {
        const qaoa = optimizationResult.qaoa_allocation[d.district] || 0;
        const greedy = optimizationResult.greedy_allocation[d.district] || 0;
        const isBoosted = qaoaBoostedSet.has(d.district);
        return { ...d, qaoa, greedy, isBoosted };
      })
      .sort((a, b) => {
        if (a.isBoosted && !b.isBoosted) return -1;
        if (!a.isBoosted && b.isBoosted) return 1;
        return b.qaoa - a.qaoa;
      })
      .slice(0, 10)
      .map((d) => ({
        name: d.district.length > 11 ? d.district.slice(0, 11) + "…" : d.district,
        fullName: d.district,
        stateName: d.state,
        "Quantum (₹Cr)": d.qaoa,
        "Greedy (₹Cr)": d.greedy,
        gap: d.literacy_gap,
        empGap: d.employment_gap,
        agency: d.agency_score,
        isBoosted: d.isBoosted,
      }));
  }, [districts, optimizationResult, qaoaBoostedSet]);

  if (!chartData.length) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton h-6 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-xs uppercase tracking-wider text-neo-text-dim mb-1">
        Budget Allocation — Top 10 Priority Districts
      </h3>
      <p className="text-[10px] text-neo-text-dim mb-3">
        How much each district receives under Quantum (QAOA) vs Greedy allocation.
        Cyan bars = QAOA priority districts that get 3x boost.
      </p>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <XAxis
            dataKey="name"
            tick={{ fill: "#94a3b8", fontSize: 9 }}
            axisLine={{ stroke: "#1e293b" }}
            tickLine={false}
            angle={-25}
            textAnchor="end"
            height={55}
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
          <Tooltip content={<AllocTooltip />} cursor={{ fill: "rgba(59,130,246,0.05)" }} />
          <Legend wrapperStyle={{ fontSize: 10, color: "#94a3b8" }} align="right" verticalAlign="top" />
          <Bar
            dataKey="Greedy (₹Cr)"
            fill="#f59e0b"
            radius={[3, 3, 0, 0]}
            isAnimationActive
            animationDuration={600}
          />
          <Bar
            dataKey="Quantum (₹Cr)"
            radius={[3, 3, 0, 0]}
            isAnimationActive
            animationDuration={600}
            style={{ filter: "drop-shadow(0 0 4px rgba(59,130,246,0.4))" }}
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
  );
}
