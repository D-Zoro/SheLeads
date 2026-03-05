"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useOptimizationCtx } from "@/context/OptimizationContext";
import CountUp from "@/components/CountUp";
import DistrictTable from "@/components/DistrictTable";
import PolicyBriefPanel from "@/components/PolicyBriefPanel";

/* ── Lazy-load heavy chart/map components (SSR-unsafe) ────────── */
const IndiaMap = dynamic(() => import("@/components/IndiaMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full aspect-square flex items-center justify-center">
      <div className="skeleton w-full h-full rounded-xl" />
    </div>
  ),
});

const ComparisonChart = dynamic(() => import("@/components/ComparisonChart"), {
  ssr: false,
  loading: () => (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="skeleton h-6 w-full" />
      ))}
    </div>
  ),
});

/* ── IST clock ────────────────────────────────────────────────── */
function useClock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = () => {
      setTime(
        new Date().toLocaleTimeString("en-IN", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

export default function Dashboard() {
  const {
    budget,
    setBudget,
    districts,
    optimizationResult,
    optimizationLoading,
    selectedDistrict,
  } = useOptimizationCtx();

  const clock = useClock();

  const districtCount = districts.length;
  const improvementPct = optimizationResult?.improvement_pct ?? 0;
  const totalQaoaSpend = optimizationResult
    ? Object.values(optimizationResult.qaoa_allocation).reduce(
        (s, v) => s + v,
        0
      )
    : 0;
  const qaoaSelected = optimizationResult?.qaoa_selected?.length ?? 0;

  // Average predicted impact change across all districts
  const avgImpactChangePct = (() => {
    if (!optimizationResult?.predicted_impact_baseline || !optimizationResult?.predicted_impact_quantum) return 0;
    const base = optimizationResult.predicted_impact_baseline;
    const quant = optimizationResult.predicted_impact_quantum;
    const keys = Object.keys(base);
    if (!keys.length) return 0;
    let totalBase = 0, totalQ = 0;
    for (const k of keys) { totalBase += base[k]; totalQ += quant[k]; }
    return totalBase > 0.0001 ? ((totalQ - totalBase) / totalBase) * 100 : 0;
  })();

  return (
    <>
      {/* ============================================================
          HEADER — Sticky mission-control bar
          ============================================================ */}
      <header className="sticky top-0 z-30 bg-neo-bg/90 backdrop-blur-md border-b border-neo-border">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
          {/* Left: Branding */}
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-[var(--font-heading)] tracking-tight text-neo-text">
              NEO POLICY
            </h1>
            <p className="text-[11px] uppercase tracking-[0.2em] text-neo-text-dim mt-0.5">
              Quantum Women&apos;s Uplift Optimizer · India
            </p>
          </div>

          {/* Right: Clock + status */}
          <div className="flex items-center gap-5">
            <span className="text-sm font-[var(--font-data)] text-neo-text-dim tabular-nums">
              {clock} IST
            </span>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-neo-green pulse-green" />
              <span className="text-[11px] uppercase tracking-wider text-neo-green font-medium">
                Quantum Core Active
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 pb-12">
        {/* ============================================================
            HERO / EXPLAINER — What this app does
            ============================================================ */}
        <section className="py-6">
          <div className="glow-card px-6 py-5 border-neo-blue/30">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <h2 className="text-lg font-bold font-[var(--font-heading)] text-neo-text mb-2">
                  How should India allocate ₹{budget} Cr for women&apos;s empowerment?
                </h2>
                <p className="text-sm text-neo-text-dim leading-relaxed">
                  <strong className="text-neo-text">NeoPolicy</strong> uses a{" "}
                  <strong className="text-neo-blue">QAOA quantum optimizer</strong>{" "}
                  (8-qubit simulation) to find the optimal budget allocation across{" "}
                  <strong className="text-neo-text">648 Indian districts</strong>.
                  A Random Forest model predicts the impact of funding on women&apos;s literacy,
                  employment, and financial inclusion. The quantum approach outperforms
                  naive greedy allocation by discovering synergies across districts.
                </p>
                <div className="flex flex-wrap gap-3 mt-3">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-neo-blue/10 text-neo-blue border border-neo-blue/20">
                    NFHS-5 Health Data
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-neo-amber/10 text-neo-amber border border-neo-amber/20">
                    MGNREGA Employment Data
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-neo-green/10 text-neo-green border border-neo-green/20">
                    Random Forest + QAOA
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-neo-cyan/10 text-neo-cyan border border-neo-cyan/20">
                    Gemini Policy Briefs
                  </span>
                </div>
              </div>
              <div className="flex flex-col justify-center gap-2 text-xs text-neo-text-dim font-[var(--font-data)] border-l border-neo-border/50 pl-6">
                <div className="flex items-center gap-2">
                  <span className="text-neo-blue">⟁</span>
                  <span>Drag the budget slider to re-optimize</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-neo-green">◉</span>
                  <span>Hover the map to see state-level insights</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-neo-amber">▤</span>
                  <span>Click any district row for an AI policy brief</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-neo-red">★</span>
                  <span>QAOA-boosted districts get 3× priority funding</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================
            BUDGET SLIDER
            ============================================================ */}
        <section className="pb-6">
          <div className="glow-card px-6 py-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-neo-text-dim">
                  Total Policy Budget
                </p>
                <p className="text-3xl font-[var(--font-data)] font-bold text-neo-text mt-1">
                  ₹{budget} Cr
                </p>
              </div>
              <div className="flex-1 max-w-xl">
                <input
                  type="range"
                  min={100}
                  max={2000}
                  step={50}
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  className="neo-slider w-full"
                />
                <div className="flex justify-between text-[10px] text-neo-text-dim mt-1 font-[var(--font-data)]">
                  <span>₹100 Cr</span>
                  <span>₹2000 Cr</span>
                </div>
              </div>
            </div>
            {optimizationLoading && (
              <div className="mt-3 flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-neo-blue border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-neo-text-dim">
                  Running quantum optimization...
                </span>
              </div>
            )}
          </div>
        </section>

        {/* ============================================================
            STAT CARDS
            ============================================================ */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Districts Analyzed */}
          <div className="glow-card gradient-top-border px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-lg bg-neo-blue/10 border border-neo-blue/20 flex items-center justify-center text-neo-blue font-bold text-sm">D</span>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-neo-text-dim">
                  Districts Analyzed
                </p>
                <CountUp
                  value={districtCount}
                  decimals={0}
                  className="text-2xl font-[var(--font-data)] font-bold text-neo-text"
                />
              </div>
            </div>
          </div>

          {/* Quantum Advantage */}
          <div className="glow-card gradient-top-border px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-lg bg-neo-green/10 border border-neo-green/20 flex items-center justify-center text-neo-green font-bold text-sm">Q</span>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-neo-text-dim">
                  Quantum Advantage
                </p>
                <div className="flex items-baseline gap-1">
                  <CountUp
                    value={improvementPct}
                    decimals={1}
                    prefix={improvementPct >= 0 ? "+" : ""}
                    suffix="%"
                    className={`text-2xl font-[var(--font-data)] font-bold ${
                      improvementPct >= 0 ? "text-neo-green" : "text-neo-red"
                    }`}
                  />
                  {improvementPct > 0 && (
                    <span className="text-neo-green text-sm">▲</span>
                  )}
                </div>
                <p className="text-[9px] text-neo-text-dim mt-0.5">vs greedy baseline</p>
              </div>
            </div>
          </div>

          {/* QAOA Boosted */}
          <div className="glow-card gradient-top-border px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-lg bg-neo-cyan/10 border border-neo-cyan/20 flex items-center justify-center text-neo-cyan font-bold text-sm">⚛</span>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-neo-text-dim">
                  Predicted Impact
                </p>
                <div className="flex items-baseline gap-1">
                  <CountUp
                    value={avgImpactChangePct}
                    decimals={2}
                    prefix={avgImpactChangePct >= 0 ? "+" : ""}
                    suffix="%"
                    className={`text-2xl font-[var(--font-data)] font-bold ${
                      avgImpactChangePct >= 0 ? "text-neo-cyan" : "text-neo-red"
                    }`}
                  />
                </div>
                <p className="text-[9px] text-neo-text-dim mt-0.5">vs current spending</p>
              </div>
            </div>
          </div>

          {/* Optimized Deployment */}
          <div className="glow-card gradient-top-border px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-lg bg-neo-amber/10 border border-neo-amber/20 flex items-center justify-center text-neo-amber font-bold text-sm">₹</span>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-neo-text-dim">
                  Quantum Budget
                </p>
                <CountUp
                  value={totalQaoaSpend}
                  decimals={0}
                  prefix="₹"
                  suffix=" Cr"
                  className="text-2xl font-[var(--font-data)] font-bold text-neo-text"
                />
                <p className="text-[9px] text-neo-text-dim mt-0.5">total deployed</p>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================
            MAP + CHART — 60/40 layout
            ============================================================ */}
        <section className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
          {/* India Map — 60% */}
          <div className="lg:col-span-3 glow-card p-4">
            <h2 className="text-xs uppercase tracking-wider text-neo-text-dim mb-3">
              India — State-Level Literacy Gap & Budget Allocation
            </h2>
            <IndiaMap />
          </div>

          {/* Comparison Charts — 40% */}
          <div className="lg:col-span-2 glow-card p-4">
            <ComparisonChart />
          </div>
        </section>

        {/* ============================================================
            DISTRICT TABLE — full width
            ============================================================ */}
        <section className="mb-8">
          <h2 className="text-xs uppercase tracking-wider text-neo-text-dim mb-3">
            All Districts — Click a row for AI-generated policy brief
          </h2>
          <DistrictTable />
        </section>
      </main>

      {/* ============================================================
          POLICY BRIEF SLIDE-OVER
          ============================================================ */}
      {selectedDistrict && <PolicyBriefPanel />}
    </>
  );
}
