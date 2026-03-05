"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import { useOptimizationCtx } from "@/context/OptimizationContext";
import CountUp from "@/components/CountUp";
import DistrictTable from "@/components/DistrictTable";

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

/* ── Multi-select dropdown ────────────────────────────────────── */
function MultiSelect({
  label,
  options,
  selected,
  onChange,
  placeholder,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, search]);

  return (
    <div className="relative">
      <p className="text-[10px] uppercase tracking-wider text-neo-text-dim mb-1">
        {label}
      </p>
      <button
        onClick={() => setOpen(!open)}
        className="w-full bg-neo-bg border border-neo-border rounded-lg px-3 py-2 text-sm text-left text-neo-text hover:border-neo-blue transition-colors flex items-center justify-between"
      >
        <span className={selected.length ? "text-neo-text" : "text-neo-text-dim"}>
          {selected.length
            ? `${selected.length} selected`
            : placeholder}
        </span>
        <span className="text-neo-text-dim text-xs">{open ? "▲" : "▼"}</span>
      </button>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {selected.slice(0, 5).map((s) => (
            <span
              key={s}
              className="px-2 py-0.5 bg-neo-blue/10 text-neo-blue text-[10px] rounded-full border border-neo-blue/20 flex items-center gap-1"
            >
              {s.length > 15 ? s.slice(0, 15) + "…" : s}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(selected.filter((v) => v !== s));
                }}
                className="text-neo-text-dim hover:text-neo-red"
              >
                x
              </button>
            </span>
          ))}
          {selected.length > 5 && (
            <span className="px-2 py-0.5 text-neo-text-dim text-[10px]">
              +{selected.length - 5} more
            </span>
          )}
        </div>
      )}
      {open && (
        <div className="absolute z-40 mt-1 w-full bg-neo-card border border-neo-border rounded-lg shadow-2xl max-h-56 overflow-hidden">
          <div className="p-2 border-b border-neo-border">
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-neo-bg border border-neo-border rounded px-2 py-1 text-xs text-neo-text placeholder-neo-text-dim focus:outline-none focus:border-neo-blue"
              autoFocus
            />
          </div>
          <div className="overflow-y-auto max-h-40">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-xs text-neo-text-dim">No results</p>
            ) : (
              filtered.map((opt) => {
                const isSelected = selected.includes(opt);
                return (
                  <button
                    key={opt}
                    onClick={() => {
                      onChange(
                        isSelected
                          ? selected.filter((v) => v !== opt)
                          : [...selected, opt]
                      );
                    }}
                    className={`w-full px-3 py-1.5 text-xs text-left hover:bg-neo-hover transition-colors flex items-center gap-2 ${
                      isSelected ? "text-neo-blue" : "text-neo-text"
                    }`}
                  >
                    <span
                      className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[8px] ${
                        isSelected
                          ? "bg-neo-blue border-neo-blue text-white"
                          : "border-neo-border"
                      }`}
                    >
                      {isSelected && "✓"}
                    </span>
                    {opt}
                  </button>
                );
              })
            )}
          </div>
          <div className="p-2 border-t border-neo-border flex justify-between">
            <button
              onClick={() => onChange([])}
              className="text-[10px] text-neo-text-dim hover:text-neo-red"
            >
              Clear all
            </button>
            <button
              onClick={() => setOpen(false)}
              className="text-[10px] text-neo-blue hover:text-neo-cyan"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const {
    budget,
    setBudget,
    districts,
    optimizationResult,
    optimizationLoading,
    availableStates,
    selectedStates,
    setSelectedStates,
    selectedDistricts,
    setSelectedDistricts,
    reportLoading,
    generateReport,
  } = useOptimizationCtx();

  const clock = useClock();
  const [reportText, setReportText] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);

  const numDistricts = optimizationResult?.num_districts ?? districts.length;
  const improvementPct = optimizationResult?.improvement_pct ?? 0;
  const totalQaoaSpend = optimizationResult
    ? Object.values(optimizationResult.qaoa_allocation).reduce(
        (s, v) => s + v,
        0
      )
    : 0;
  const qaoaBoosted = optimizationResult?.qaoa_selected?.length ?? 0;

  // Districts available for the district filter (filtered by selected states)
  const availableDistricts = useMemo(() => {
    if (selectedStates.length === 0) return districts.map((d) => d.district).sort();
    return districts
      .filter((d) => selectedStates.includes(d.state))
      .map((d) => d.district)
      .sort();
  }, [districts, selectedStates]);

  // When states change, clear districts that no longer match
  useEffect(() => {
    if (selectedStates.length > 0 && selectedDistricts.length > 0) {
      const valid = new Set(availableDistricts);
      const filtered = selectedDistricts.filter((d) => valid.has(d));
      if (filtered.length !== selectedDistricts.length) {
        setSelectedDistricts(filtered);
      }
    }
  }, [selectedStates, availableDistricts, selectedDistricts, setSelectedDistricts]);

  const handleGenerateReport = useCallback(async () => {
    const text = await generateReport();
    if (text) {
      setReportText(text);
      setShowReport(true);
    }
  }, [generateReport]);

  const handleDownloadReport = useCallback(() => {
    if (!reportText) return;
    const blob = new Blob([reportText], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leadher-report-${budget}cr.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [reportText, budget]);

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
              LEADHER
            </h1>
            <p className="text-[11px] uppercase tracking-[0.2em] text-neo-text-dim mt-0.5">
              Quantum Women&apos;s Empowerment Optimizer
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
                  <strong className="text-neo-text">Leadher</strong> uses a{" "}
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
                    Gemini AI Reports
                  </span>
                </div>
              </div>
              <div className="flex flex-col justify-center gap-2 text-xs text-neo-text-dim font-[var(--font-data)] border-l border-neo-border/50 pl-6">
                <div className="flex items-center gap-2">
                  <span className="text-neo-blue">01</span>
                  <span>Set budget & select states/districts</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-neo-green">02</span>
                  <span>Quantum optimizer allocates budget</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-neo-amber">03</span>
                  <span>Compare quantum vs greedy approach</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-neo-cyan">04</span>
                  <span>Download AI-generated policy report</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================
            PARAMETERS — Budget + Geographic Filters
            ============================================================ */}
        <section className="pb-6">
          <div className="glow-card px-6 py-5">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Budget slider */}
              <div className="lg:col-span-1">
                <p className="text-[10px] uppercase tracking-wider text-neo-text-dim mb-1">
                  Total Policy Budget
                </p>
                <p className="text-3xl font-[var(--font-data)] font-bold text-neo-text mt-1 mb-2">
                  ₹{budget} Cr
                </p>
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

              {/* State filter */}
              <div>
                <MultiSelect
                  label="Filter by State"
                  options={availableStates}
                  selected={selectedStates}
                  onChange={setSelectedStates}
                  placeholder="All India (all states)"
                />
              </div>

              {/* District filter */}
              <div>
                <MultiSelect
                  label="Filter by District"
                  options={availableDistricts}
                  selected={selectedDistricts}
                  onChange={setSelectedDistricts}
                  placeholder={
                    selectedStates.length
                      ? `All districts in ${selectedStates.length} state(s)`
                      : "All districts"
                  }
                />
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
                  value={numDistricts}
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
                <p className="text-[9px] text-neo-text-dim mt-0.5">QAOA vs greedy impact</p>
              </div>
            </div>
          </div>

          {/* QAOA Boosted */}
          <div className="glow-card gradient-top-border px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-lg bg-neo-cyan/10 border border-neo-cyan/20 flex items-center justify-center text-neo-cyan font-bold text-sm">P</span>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-neo-text-dim">
                  Priority Districts
                </p>
                <CountUp
                  value={qaoaBoosted}
                  decimals={0}
                  className="text-2xl font-[var(--font-data)] font-bold text-neo-cyan"
                />
                <p className="text-[9px] text-neo-text-dim mt-0.5">QAOA 3x boosted</p>
              </div>
            </div>
          </div>

          {/* Budget Deployed */}
          <div className="glow-card gradient-top-border px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-lg bg-neo-amber/10 border border-neo-amber/20 flex items-center justify-center text-neo-amber font-bold text-sm">B</span>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-neo-text-dim">
                  Budget Deployed
                </p>
                <CountUp
                  value={totalQaoaSpend}
                  decimals={0}
                  prefix="₹"
                  suffix=" Cr"
                  className="text-2xl font-[var(--font-data)] font-bold text-neo-text"
                />
                <p className="text-[9px] text-neo-text-dim mt-0.5">quantum allocation</p>
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
            REPORT GENERATION
            ============================================================ */}
        <section className="mb-8">
          <div className="glow-card px-6 py-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold font-[var(--font-heading)] text-neo-text">
                  AI Policy Report
                </h2>
                <p className="text-xs text-neo-text-dim mt-1">
                  Generate a comprehensive policy report with budget allocations, impact predictions, and recommendations using Gemini AI.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleGenerateReport}
                  disabled={reportLoading || optimizationLoading}
                  className="px-5 py-2.5 bg-neo-blue/20 border border-neo-blue/40 rounded-lg text-neo-blue text-sm font-medium hover:bg-neo-blue/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  {reportLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-neo-blue border-t-transparent rounded-full animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>Generate Report</>
                  )}
                </button>
                {reportText && (
                  <button
                    onClick={handleDownloadReport}
                    className="px-5 py-2.5 bg-neo-green/20 border border-neo-green/40 rounded-lg text-neo-green text-sm font-medium hover:bg-neo-green/30 transition-all flex items-center gap-2"
                  >
                    Download .md
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================
            REPORT DISPLAY (if generated)
            ============================================================ */}
        {showReport && reportText && (
          <section className="mb-8">
            <div className="glow-card px-6 py-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold font-[var(--font-heading)] text-neo-text">
                  Generated Report
                </h2>
                <button
                  onClick={() => setShowReport(false)}
                  className="text-xs text-neo-text-dim hover:text-neo-red transition-colors"
                >
                  Close
                </button>
              </div>
              <div className="prose prose-invert prose-sm max-w-none text-neo-text-dim leading-relaxed whitespace-pre-wrap font-[var(--font-data)] text-xs border-t border-neo-border pt-4">
                {reportText}
              </div>
            </div>
          </section>
        )}

        {/* ============================================================
            DISTRICT TABLE — full width
            ============================================================ */}
        <section className="mb-8">
          <h2 className="text-xs uppercase tracking-wider text-neo-text-dim mb-3">
            All Districts — Quantum vs Greedy Budget Allocation
          </h2>
          <DistrictTable />
        </section>
      </main>
    </>
  );
}
