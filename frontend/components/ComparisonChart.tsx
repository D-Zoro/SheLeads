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
import type { District } from "@/types";

/* ── Custom tooltip ───────────────────────────────────────────── */
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glow-card px-4 py-3 text-xs font-[var(--font-data)]">
      <p className="font-bold text-neo-text mb-2">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: ₹{p.value.toFixed(1)} Cr
        </p>
      ))}
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

  /* ── Top 10 districts by literacy_gap ──────────────────────── */
  const chartData = useMemo(() => {
    if (!districts.length) return [];

    const sorted = [...districts]
      .sort((a, b) => (b.literacy_gap ?? 0) - (a.literacy_gap ?? 0))
      .slice(0, 10);

    return sorted.map((d) => {
      const qaoa = optimizationResult?.qaoa_allocation[d.district] || 0;
      const greedy = optimizationResult?.greedy_allocation[d.district] || 0;
      return {
        name:
          d.district.length > 10
            ? d.district.slice(0, 10) + "…"
            : d.district,
        fullName: d.district,
        current: d.total_spent_cr,
        greedy,
        quantum: qaoa,
        agency: d.agency_score,
        gap: d.literacy_gap,
      };
    });
  }, [districts, optimizationResult]);

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
          Budget Allocation Comparison — Top 10 Priority Districts
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={chartData}
            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
          >
            <XAxis
              dataKey="name"
              tick={{ fill: "#94a3b8", fontSize: 10 }}
              axisLine={{ stroke: "#1e293b" }}
              tickLine={false}
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
              dataKey="current"
              name="Current IRL"
              fill="#64748b"
              radius={[3, 3, 0, 0]}
              isAnimationActive
              animationDuration={600}
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
              fill="#3b82f6"
              radius={[3, 3, 0, 0]}
              isAnimationActive
              animationDuration={600}
              style={{ filter: "drop-shadow(0 0 4px rgba(59,130,246,0.5))" }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Agency score horizontal bar ────────────────────────── */}
      <div>
        <h3 className="text-xs uppercase tracking-wider text-neo-text-dim mb-3">
          Women&apos;s Financial Agency Score
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 10, left: 60, bottom: 5 }}
          >
            <XAxis
              type="number"
              domain={[0, "dataMax"]}
              tick={{ fill: "#94a3b8", fontSize: 10 }}
              axisLine={{ stroke: "#1e293b" }}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: "#94a3b8", fontSize: 10 }}
              axisLine={{ stroke: "#1e293b" }}
              tickLine={false}
              width={55}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const val = payload[0].value as number;
                return (
                  <div className="glow-card px-3 py-2 text-xs font-[var(--font-data)]">
                    <p className="text-neo-text">
                      Agency Score: {val.toFixed(4)}
                    </p>
                  </div>
                );
              }}
              cursor={{ fill: "rgba(59,130,246,0.05)" }}
            />
            <Bar
              dataKey="agency"
              name="Agency Score"
              radius={[0, 4, 4, 0]}
              isAnimationActive
              animationDuration={600}
            >
              {chartData.map((entry, i) => (
                <Cell key={i} fill={agencyColor(entry.agency)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
