"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useOptimizationCtx } from "@/context/OptimizationContext";
import type { PolicyBriefResponse } from "@/types";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function PolicyBriefPanel() {
  const { selectedDistrict, setSelectedDistrict, budget, optimizationResult } =
    useOptimizationCtx();

  const [brief, setBrief] = useState<PolicyBriefResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayedText, setDisplayedText] = useState("");
  const [copied, setCopied] = useState(false);
  const [closing, setClosing] = useState(false);
  const typewriterRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isOpen = !!selectedDistrict;

  /* ── Fetch policy brief when district selected ────────────── */
  useEffect(() => {
    if (!selectedDistrict) return;

    setBrief(null);
    setDisplayedText("");
    setError(null);
    setLoading(true);

    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch(`${API}/policy-brief`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            district_name: selectedDistrict.district,
            total_budget_cr: budget,
          }),
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("Failed to generate policy brief");
        const data: PolicyBriefResponse = await res.json();
        setBrief(data);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError(
            err instanceof Error ? err.message : "Failed to generate brief"
          );
        }
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [selectedDistrict, budget]);

  /* ── Typewriter effect ──────────────────────────────────────── */
  useEffect(() => {
    if (!brief?.brief) return;

    setDisplayedText("");
    let i = 0;
    const text = brief.brief;

    typewriterRef.current = setInterval(() => {
      if (i < text.length) {
        setDisplayedText(text.slice(0, i + 1));
        i++;
      } else {
        if (typewriterRef.current) clearInterval(typewriterRef.current);
      }
    }, 15);

    return () => {
      if (typewriterRef.current) clearInterval(typewriterRef.current);
    };
  }, [brief]);

  /* ── Close handler with animation ───────────────────────────── */
  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setSelectedDistrict(null);
      setClosing(false);
      setBrief(null);
      setDisplayedText("");
    }, 350);
  }, [setSelectedDistrict]);

  /* ── Copy to clipboard ──────────────────────────────────────── */
  const handleCopy = useCallback(async () => {
    if (!brief?.brief) return;
    await navigator.clipboard.writeText(brief.brief);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [brief]);

  if (!isOpen && !closing) return null;

  const qaoaAlloc =
    optimizationResult?.qaoa_allocation[selectedDistrict?.district || ""] || 0;
  const delta = qaoaAlloc - (selectedDistrict?.total_spent_cr || 0);

  const metrics = selectedDistrict
    ? [
        {
          label: "Literacy Gap",
          value: `${selectedDistrict.literacy_gap.toFixed(1)}%`,
          color: selectedDistrict.literacy_gap > 30 ? "text-neo-red" : "text-neo-amber",
        },
        {
          label: "Employment Gap",
          value: `${selectedDistrict.employment_gap.toFixed(1)}%`,
          color: "text-neo-text",
        },
        {
          label: "Agency Score",
          value: selectedDistrict.agency_score.toFixed(4),
          color: "text-neo-cyan",
        },
        {
          label: "Current Spend",
          value: `₹${selectedDistrict.total_spent_cr.toFixed(1)} Cr`,
          color: "text-neo-text",
        },
        {
          label: "Quantum Alloc",
          value: `₹${qaoaAlloc.toFixed(1)} Cr`,
          color: "text-neo-blue",
        },
        {
          label: "Delta",
          value: `${delta >= 0 ? "+" : ""}₹${delta.toFixed(1)} Cr`,
          color: delta > 0 ? "text-neo-green" : delta < 0 ? "text-neo-red" : "text-neo-text-dim",
        },
      ]
    : [];

  return (
    <>
      {/* ── Backdrop ──────────────────────────────────────────── */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          closing ? "opacity-0" : "opacity-100"
        }`}
        onClick={handleClose}
      />

      {/* ── Panel ─────────────────────────────────────────────── */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-full sm:w-[480px] bg-[#0d1526] border-l border-neo-blue/30 shadow-[-4px_0_30px_rgba(59,130,246,0.15)] overflow-y-auto transition-transform duration-350 ${
          closing ? "translate-x-full" : "translate-x-0"
        }`}
        style={{
          animation: closing
            ? "panel-slide-out 350ms cubic-bezier(0.4,0,0.2,1) forwards"
            : "panel-slide-in 350ms cubic-bezier(0,0,0.2,1) forwards",
        }}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-neo-border/50 text-neo-text-dim hover:text-neo-text hover:bg-neo-border transition-all z-10"
        >
          ✕
        </button>

        <div className="p-6 space-y-6">
          {/* ── District header ────────────────────────────────── */}
          {selectedDistrict && (
            <div>
              <h2 className="text-2xl font-bold font-[var(--font-heading)] text-neo-text">
                {selectedDistrict.district}
              </h2>
              <span className="inline-block mt-2 px-3 py-1 bg-neo-blue/10 text-neo-blue text-xs rounded-full font-medium">
                {selectedDistrict.state}
              </span>

              {/* Metric chips */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                {metrics.map((m) => (
                  <div
                    key={m.label}
                    className="bg-neo-bg/60 border border-neo-border rounded-lg px-3 py-2"
                  >
                    <p className="text-[10px] uppercase tracking-wider text-neo-text-dim">
                      {m.label}
                    </p>
                    <p
                      className={`text-sm font-[var(--font-data)] font-semibold ${m.color}`}
                    >
                      {m.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Quantum Brief ─────────────────────────────────── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-neo-blue text-lg">⚛</span>
              <h3 className="text-sm uppercase tracking-wider font-bold text-neo-text">
                Quantum Brief
              </h3>
            </div>

            {loading && (
              <div className="glow-card p-6 text-center">
                <div className="flex justify-center gap-1 mb-3">
                  <span className="bounce-dot" />
                  <span className="bounce-dot" />
                  <span className="bounce-dot" />
                </div>
                <p className="text-xs text-neo-text-dim italic">
                  Quantum Brain generating policy brief...
                </p>
              </div>
            )}

            {error && (
              <div className="border border-neo-red/30 rounded-lg p-4">
                <p className="text-sm text-neo-red">{error}</p>
              </div>
            )}

            {!loading && !error && displayedText && (
              <div className="glow-card p-5">
                <div className="font-[var(--font-data)] text-sm text-neo-text leading-[1.8] whitespace-pre-wrap">
                  {displayedText}
                  {displayedText.length < (brief?.brief.length || 0) && (
                    <span className="typewriter-cursor" />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Actions ───────────────────────────────────────── */}
          {brief && !loading && (
            <div className="flex gap-3">
              <button
                onClick={handleCopy}
                className="flex-1 py-2.5 rounded-lg border border-neo-blue/30 text-sm font-medium text-neo-blue hover:bg-neo-blue/10 transition-all"
              >
                {copied ? "COPIED ✓" : "COPY BRIEF"}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
