"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
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

const ImpactChart = dynamic(() => import("@/components/ImpactChart"), {
  ssr: false,
  loading: () => (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
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
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [policyText, setPolicyText] = useState("");
  const [policyParsing, setPolicyParsing] = useState(false);
  const [showCustomParams, setShowCustomParams] = useState(false);

  // Refs for capturing sections as images in the PDF
  const statCardsRef = useRef<HTMLDivElement>(null);
  const mapChartRef = useRef<HTMLDivElement>(null);

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

  const handleParsePolicy = useCallback(async () => {
    if (!policyText.trim()) return;
    setPolicyParsing(true);
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${API}/parse-policy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policy_text: policyText }),
      });
      if (!res.ok) throw new Error("Policy parsing failed");
      const data = await res.json();
      if (data.budget !== null && data.budget !== undefined) {
        const b = Math.max(100, Math.min(2000, Math.round(data.budget / 50) * 50));
        setBudget(b);
      }
      if (data.states?.length) setSelectedStates(data.states);
      if (data.districts?.length) setSelectedDistricts(data.districts);
      setPolicyText("");
    } catch (err) {
      console.error("Policy parse error:", err);
    } finally {
      setPolicyParsing(false);
    }
  }, [policyText, setBudget, setSelectedStates, setSelectedDistricts]);

  /* ── CSV data download handler ─────────────────────────────── */
  const handleDownloadCSV = useCallback(() => {
    if (!optimizationResult || !districts.length) return;
    const qaoa = optimizationResult.qaoa_allocation;
    const greedy = optimizationResult.greedy_allocation;
    const predBase = optimizationResult.predicted_impact_baseline;
    const predQ = optimizationResult.predicted_impact_quantum;
    const predG = optimizationResult.predicted_impact_greedy;

    const headers = [
      "District", "State", "Literacy Gap (%)", "Employment Gap (%)",
      "Agency Score", "Quantum Alloc (Cr)", "Greedy Alloc (Cr)",
      "Delta (Cr)", "Predicted Impact Baseline", "Predicted Impact Quantum",
      "Predicted Impact Greedy", "QAOA Boosted",
    ];
    const boostedSet = new Set(optimizationResult.qaoa_selected);
    const rows = districts.map((d) => {
      const qA = qaoa[d.district] || 0;
      const gA = greedy[d.district] || 0;
      return [
        `"${d.district}"`, `"${d.state}"`, d.literacy_gap.toFixed(2),
        d.employment_gap.toFixed(2), d.agency_score.toFixed(4),
        qA.toFixed(2), gA.toFixed(2), (qA - gA).toFixed(2),
        (predBase[d.district] ?? 0).toFixed(6),
        (predQ[d.district] ?? 0).toFixed(6),
        (predG[d.district] ?? 0).toFixed(6),
        boostedSet.has(d.district) ? "Yes" : "No",
      ].join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leadher-data-${budget}cr.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [optimizationResult, districts, budget]);

  /* ── PDF download handler ────────────────────────────────────── */
  const handleDownloadReport = useCallback(async () => {
    if (!reportText) return;
    setPdfGenerating(true);
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import("jspdf"),
        import("html2canvas"),
      ]);

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 12;
      const contentW = pageW - margin * 2;
      const footerH = 10;
      let y = margin;

      // ── Helper: add text with word-wrap and auto page-break ───
      const addText = (
        text: string,
        fontSize: number,
        opts?: { bold?: boolean; color?: [number, number, number]; lineH?: number }
      ) => {
        pdf.setFontSize(fontSize);
        pdf.setFont("helvetica", opts?.bold ? "bold" : "normal");
        pdf.setTextColor(...(opts?.color ?? [30, 30, 30]));

        const lines = pdf.splitTextToSize(text, contentW);
        const lh = opts?.lineH ?? fontSize * 0.4;
        for (const line of lines) {
          if (y + lh > pageH - footerH) { pdf.addPage(); y = margin; }
          pdf.text(line, margin, y);
          y += lh;
        }
      };

      // ── Helper: capture a DOM element, scaled to fit page ─────
      const captureEl = async (el: HTMLElement | null, maxH: number) => {
        if (!el) return;
        try {
          const canvas = await html2canvas(el, {
            backgroundColor: "#0a0f1e",
            scale: 1.5,
            useCORS: true,
            logging: false,
            ignoreElements: (element: Element) => {
              // Skip elements that cause lab() errors
              const style = window.getComputedStyle(element);
              const bg = style.backgroundColor;
              if (bg && (bg.includes("lab(") || bg.includes("oklch("))) return true;
              return false;
            },
          });
          const imgData = canvas.toDataURL("image/png");
          let imgW = contentW;
          let imgH = (canvas.height / canvas.width) * imgW;
          if (imgH > maxH) {
            imgH = maxH;
            imgW = (canvas.width / canvas.height) * imgH;
          }
          if (y + imgH > pageH - footerH) { pdf.addPage(); y = margin; }
          pdf.addImage(imgData, "PNG", margin, y, imgW, imgH);
          y += imgH + 2;
        } catch (captureErr) {
          console.error("Element capture failed, skipping:", captureErr);
        }
      };

      // ── Page 1: Title + Stats + Visuals ───────────────────────
      // Title bar
      pdf.setFillColor(15, 23, 42);
      pdf.rect(0, 0, pageW, 28, "F");
      pdf.setFontSize(18);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(59, 130, 246);
      pdf.text("LEADHER", margin, 12);
      pdf.setFontSize(9);
      pdf.setTextColor(148, 163, 184);
      pdf.text("Quantum Women's Empowerment Optimizer — Policy Report", margin, 18);
      const dateStr = new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });
      pdf.text(dateStr, pageW - margin - pdf.getTextWidth(dateStr), 18);

      // Budget & scope line
      pdf.setFontSize(10);
      pdf.setTextColor(226, 232, 240);
      const scope = selectedDistricts.length
        ? `Districts: ${selectedDistricts.slice(0, 8).join(", ")}${selectedDistricts.length > 8 ? ` +${selectedDistricts.length - 8} more` : ""}`
        : selectedStates.length
          ? `States: ${selectedStates.join(", ")}`
          : "All India (648 districts)";
      pdf.text(`Budget: Rs ${budget} Cr  |  ${scope}`, margin, 25);
      y = 32;

      // Stat cards screenshot (compact)
      await captureEl(statCardsRef.current, 30);

      // Map + chart screenshot (scaled to fit remaining page 1 space)
      const remainingP1 = pageH - y - footerH - 2;
      await captureEl(mapChartRef.current, Math.min(remainingP1, 110));

      // ── Page 2+: LLM Report Text (compact) ────────────────────
      pdf.addPage();
      y = margin;

      const reportLines = reportText.split("\n");
      for (const rawLine of reportLines) {
        const trimmed = rawLine.trim();
        if (!trimmed) { y += 1.5; continue; }

        if (trimmed.startsWith("# ")) {
          y += 2;
          addText(trimmed.replace(/^#+\s*/, ""), 14, { bold: true, color: [59, 130, 246] });
          y += 1;
        } else if (trimmed.startsWith("## ")) {
          y += 1.5;
          addText(trimmed.replace(/^#+\s*/, ""), 11, { bold: true, color: [30, 30, 30] });
          y += 0.5;
        } else if (trimmed.startsWith("### ")) {
          y += 1;
          addText(trimmed.replace(/^#+\s*/, ""), 10, { bold: true, color: [60, 60, 60] });
        } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          addText("  \u2022 " + trimmed.slice(2).replace(/\*\*/g, ""), 8.5);
        } else if (/^\d+\.\s/.test(trimmed)) {
          addText("  " + trimmed.replace(/\*\*/g, ""), 8.5);
        } else if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
          // Table row — render as monospaced text
          addText(trimmed, 7.5, { lineH: 3 });
        } else {
          addText(trimmed.replace(/\*\*/g, ""), 8.5);
        }
      }

      // ── Footer on all pages ───────────────────────────────────
      const totalPages = pdf.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        pdf.setPage(p);
        pdf.setFontSize(7);
        pdf.setTextColor(130, 130, 130);
        pdf.text(
          `Leadher — Quantum Women's Empowerment Optimizer  |  Page ${p}/${totalPages}`,
          margin,
          pageH - 5
        );
        pdf.setDrawColor(30, 41, 59);
        pdf.line(margin, pageH - footerH + 2, pageW - margin, pageH - footerH + 2);
      }

      pdf.save(`leadher-report-${budget}cr.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setPdfGenerating(false);
    }
  }, [reportText, budget, selectedStates, selectedDistricts]);

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

          {/* Right: Nav + Clock + status */}
          <div className="flex items-center gap-5">
            <a
              href="/about"
              className="text-xs uppercase tracking-wider text-neo-text-dim hover:text-neo-cyan transition-colors"
            >
              About
            </a>
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
            POLICY INPUT — Describe your policy
            ============================================================ */}
        <section className="pb-6">
          <div className="glow-card px-6 py-5 border-neo-cyan/30">
            <h2 className="text-sm font-bold font-[var(--font-heading)] text-neo-text mb-2">
              Describe Your Policy
            </h2>
            <p className="text-xs text-neo-text-dim mb-3">
              Describe your policy in plain English and our AI will extract the budget, target states, and districts automatically.
            </p>
            <div className="flex gap-3">
              <textarea
                value={policyText}
                onChange={(e) => setPolicyText(e.target.value)}
                placeholder="e.g. Allocate 800 crores for women's empowerment in Bihar, Jharkhand, and Uttar Pradesh focusing on districts with highest literacy gaps..."
                className="flex-1 bg-neo-bg border border-neo-border rounded-lg px-4 py-2.5 text-sm text-neo-text placeholder-neo-text-dim focus:outline-none focus:border-neo-cyan transition-colors resize-none h-20"
              />
              <button
                onClick={handleParsePolicy}
                disabled={policyParsing || !policyText.trim()}
                className="px-5 py-2.5 bg-neo-cyan/20 border border-neo-cyan/40 rounded-lg text-neo-cyan text-sm font-medium hover:bg-neo-cyan/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2 self-end"
              >
                {policyParsing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-neo-cyan border-t-transparent rounded-full animate-spin" />
                    Parsing...
                  </>
                ) : (
                  <>Analyze Policy</>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* ============================================================
            PARAMETERS — Budget + Geographic Filters (collapsible)
            ============================================================ */}
        <section className="pb-6">
          <button
            onClick={() => setShowCustomParams(!showCustomParams)}
            className="flex items-center gap-2 mb-3 group"
          >
            <span className="text-xs uppercase tracking-wider text-neo-text-dim group-hover:text-neo-blue transition-colors">
              Custom Parameters
            </span>
            <span className="text-neo-text-dim text-xs transition-transform duration-200" style={{ transform: showCustomParams ? "rotate(180deg)" : "rotate(0)" }}>
              ▼
            </span>
            <span className="text-[10px] text-neo-text-dim bg-neo-bg px-2 py-0.5 rounded-full border border-neo-border">
              ₹{budget} Cr
              {selectedStates.length > 0 && ` · ${selectedStates.length} states`}
              {selectedDistricts.length > 0 && ` · ${selectedDistricts.length} districts`}
            </span>
          </button>
          {showCustomParams && (
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
          )}
        </section>

        {/* ============================================================
            STAT CARDS
            ============================================================ */}
        <section ref={statCardsRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
        <section ref={mapChartRef} className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
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
            DISTRICT GAPS & PREDICTED IMPACT
            ============================================================ */}
        <section className="mb-8">
          <div className="glow-card p-5">
            <h2 className="text-xs uppercase tracking-wider text-neo-text-dim mb-4">
              District Gaps & Predicted Impact
            </h2>
            <ImpactChart />
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
              <div className="flex flex-wrap gap-3">
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
                    disabled={pdfGenerating}
                    className="px-5 py-2.5 bg-neo-green/20 border border-neo-green/40 rounded-lg text-neo-green text-sm font-medium hover:bg-neo-green/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                  >
                    {pdfGenerating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-neo-green border-t-transparent rounded-full animate-spin" />
                        Building PDF...
                      </>
                    ) : (
                      <>Download PDF</>
                    )}
                  </button>
                )}
                <button
                  onClick={handleDownloadCSV}
                  disabled={!optimizationResult}
                  className="px-5 py-2.5 bg-neo-amber/20 border border-neo-amber/40 rounded-lg text-neo-amber text-sm font-medium hover:bg-neo-amber/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  Download Data (CSV)
                </button>
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
