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
  ReferenceLine,
} from "recharts";
import { useOptimizationCtx } from "@/context/OptimizationContext";

/* ── Tooltip ──────────────────────────────────────────────────── */
function GapTooltip({
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
      <p className="font-bold text-neo-text mb-0.5">{row?.fullName}</p>
      <p className="text-neo-text-dim text-[10px] mb-1.5">{row?.stateName}</p>
      {row?.isBoosted && (
        <p className="text-neo-cyan text-[10px] mb-1">QAOA Priority District</p>
      )}
      <div className="space-y-0.5">
        <p className="text-red-400">Literacy Gap: {row?.litGap?.toFixed(1)}%</p>
        <p className="text-amber-400">Employment Gap: {row?.empGap?.toFixed(1)}%</p>
        <p className="text-slate-400">Agency Score: {row?.agency?.toFixed(3)}</p>
      </div>
      <div className="border-t border-neo-border/50 mt-1.5 pt-1.5">
        <p className="text-neo-text-dim">Budget: ₹{row?.budget?.toFixed(2)} Cr</p>
        <p className="text-emerald-400 font-semibold">
          Impact Improvement: +{row?.impactPct?.toFixed(1)}%
        </p>
      </div>
    </div>
  );
}

export default function ImpactChart() {
  const { districts, optimizationResult } = useOptimizationCtx();

  /* ── Aggregate summary ──────────────────────────────────────── */
  const summary = useMemo(() => {
    if (!districts.length || !optimizationResult) return null;

    const boosted = new Set(optimizationResult.qaoa_selected);
    const allDistricts = districts;
    const selectedDistricts = allDistricts.filter((d) => boosted.has(d.district));
    const target = selectedDistricts.length ? selectedDistricts : allDistricts;

    const avgLitGap = target.reduce((s, d) => s + d.literacy_gap, 0) / target.length;
    const avgEmpGap = target.reduce((s, d) => s + d.employment_gap, 0) / target.length;
    const avgAgency = target.reduce((s, d) => s + d.agency_score, 0) / target.length;

    const baseline = optimizationResult.predicted_impact_baseline;
    const quantum = optimizationResult.predicted_impact_quantum;

    let baseSum = 0, quantSum = 0, count = 0;
    for (const d of target) {
      const b = baseline[d.district];
      const q = quantum[d.district];
      if (b != null && q != null) {
        baseSum += b;
        quantSum += q;
        count++;
      }
    }
    const avgImprovePct = baseSum > 0 ? ((quantSum - baseSum) / baseSum) * 100 : 0;

    return {
      avgLitGap: avgLitGap.toFixed(1),
      avgEmpGap: avgEmpGap.toFixed(1),
      avgAgency: avgAgency.toFixed(3),
      avgImprovePct: avgImprovePct.toFixed(1),
      count: target.length,
    };
  }, [districts, optimizationResult]);

  /* ── Per-district chart data ────────────────────────────────── */
  const chartData = useMemo(() => {
    if (!districts.length || !optimizationResult?.predicted_impact_quantum) return [];

    const baseline = optimizationResult.predicted_impact_baseline;
    const quantum = optimizationResult.predicted_impact_quantum;
    const boostedSet = new Set(optimizationResult.qaoa_selected);

    return districts
      .map((d) => {
        const b = baseline[d.district] ?? 0;
        const q = quantum[d.district] ?? 0;
        const improvePct = b > 0 ? ((q - b) / b) * 100 : 0;
        const isBoosted = boostedSet.has(d.district);
        const budgetAmt = optimizationResult.qaoa_allocation[d.district] ?? 0;
        return { ...d, improvePct, isBoosted, budgetAmt };
      })
      .sort((a, b) => {
        if (a.isBoosted && !b.isBoosted) return -1;
        if (!a.isBoosted && b.isBoosted) return 1;
        return b.improvePct - a.improvePct;
      })
      .slice(0, 10)
      .map((d) => ({
        name: d.district.length > 11 ? d.district.slice(0, 11) + "…" : d.district,
        fullName: d.district,
        stateName: d.state,
        "Literacy Gap (%)": d.literacy_gap,
        "Employment Gap (%)": d.employment_gap,
        litGap: d.literacy_gap,
        empGap: d.employment_gap,
        agency: d.agency_score,
        budget: d.budgetAmt,
        impactPct: d.improvePct,
        isBoosted: d.isBoosted,
      }));
  }, [districts, optimizationResult]);

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
    <div className="space-y-5">
      {/* ── Summary cards ─────────────────────────────────────── */}
      {summary && (
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-neo-bg/50 border border-neo-border rounded-lg px-3 py-2">
            <p className="text-[9px] uppercase tracking-wider text-neo-text-dim">Avg Literacy Gap</p>
            <p className="text-lg font-[var(--font-data)] font-bold text-red-400 mt-0.5">
              {summary.avgLitGap}%
            </p>
            <p className="text-[9px] text-neo-text-dim">{summary.count} priority districts</p>
          </div>
          <div className="bg-neo-bg/50 border border-neo-border rounded-lg px-3 py-2">
            <p className="text-[9px] uppercase tracking-wider text-neo-text-dim">Avg Employment Gap</p>
            <p className="text-lg font-[var(--font-data)] font-bold text-amber-400 mt-0.5">
              {summary.avgEmpGap}%
            </p>
          </div>
          <div className="bg-neo-bg/50 border border-neo-border rounded-lg px-3 py-2">
            <p className="text-[9px] uppercase tracking-wider text-neo-text-dim">Avg Agency Score</p>
            <p className="text-lg font-[var(--font-data)] font-bold text-slate-300 mt-0.5">
              {summary.avgAgency}
            </p>
          </div>
          <div className="bg-neo-bg/50 border border-neo-border rounded-lg px-3 py-2">
            <p className="text-[9px] uppercase tracking-wider text-neo-text-dim">Predicted Impact ↑</p>
            <p className="text-lg font-[var(--font-data)] font-bold text-emerald-400 mt-0.5">
              +{summary.avgImprovePct}%
            </p>
            <p className="text-[9px] text-neo-text-dim">composite improvement</p>
          </div>
        </div>
      )}

      {/* ── Gap + Impact chart ────────────────────────────────── */}
      <div>
        <h3 className="text-xs uppercase tracking-wider text-neo-text-dim mb-1">
          Current Gaps & Predicted Impact — Priority Districts
        </h3>
        <p className="text-[10px] text-neo-text-dim mb-3">
          Red = literacy gap, Amber = employment gap for each district.
          Hover for predicted impact improvement after quantum allocation.
        </p>
        <ResponsiveContainer width="100%" height={340}>
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
                value: "Gap %",
                angle: -90,
                position: "insideLeft",
                fill: "#64748b",
                fontSize: 10,
              }}
            />
            <Tooltip content={<GapTooltip />} cursor={{ fill: "rgba(59,130,246,0.05)" }} />
            <Legend wrapperStyle={{ fontSize: 10, color: "#94a3b8" }} align="right" verticalAlign="top" />
            <ReferenceLine y={50} stroke="#334155" strokeDasharray="4 4" />
            <Bar
              dataKey="Literacy Gap (%)"
              radius={[3, 3, 0, 0]}
              isAnimationActive
              animationDuration={600}
            >
              {chartData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.isBoosted ? "#ef4444" : "#f87171"}
                  stroke={entry.isBoosted ? "#fca5a5" : "transparent"}
                  strokeWidth={entry.isBoosted ? 1 : 0}
                />
              ))}
            </Bar>
            <Bar
              dataKey="Employment Gap (%)"
              radius={[3, 3, 0, 0]}
              isAnimationActive
              animationDuration={700}
            >
              {chartData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.isBoosted ? "#f59e0b" : "#fbbf24"}
                  stroke={entry.isBoosted ? "#fcd34d" : "transparent"}
                  strokeWidth={entry.isBoosted ? 1 : 0}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
