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
            BUDGET SLIDER
            ============================================================ */}
        <section className="py-6">
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
                  Optimizing...
                </span>
              </div>
            )}
          </div>
        </section>

        {/* ============================================================
            STAT CARDS
            ============================================================ */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Districts Analyzed */}
          <div className="glow-card gradient-top-border px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📍</span>
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
              <span className="text-2xl">📈</span>
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
              </div>
            </div>
          </div>

          {/* Optimized Deployment */}
          <div className="glow-card gradient-top-border px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">💰</span>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-neo-text-dim">
                  Optimized Deployment
                </p>
                <CountUp
                  value={totalQaoaSpend}
                  decimals={0}
                  prefix="₹"
                  suffix=" Cr"
                  className="text-2xl font-[var(--font-data)] font-bold text-neo-text"
                />
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
              District Literacy Gap Map — India
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
            All Districts — Sortable Dataset
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
