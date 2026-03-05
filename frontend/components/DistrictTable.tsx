"use client";

import { useMemo, useState } from "react";
import { useOptimizationCtx } from "@/context/OptimizationContext";
import type { SortConfig } from "@/types";

const PAGE_SIZE = 15;

type ViewFilter = "all" | "selected" | "boosted";

/* ── Color helpers ────────────────────────────────────────────── */
function gapColorClass(gap: number): string {
  if (gap > 30) return "text-neo-red";
  if (gap > 15) return "text-neo-amber";
  return "text-neo-green";
}

/* ── Skeleton rows ────────────────────────────────────────────── */
function SkeletonRows() {
  return (
    <>
      {Array.from({ length: PAGE_SIZE }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: 7 }).map((_, j) => (
            <td key={j} className="px-3 py-2.5">
              <div className="skeleton h-4 w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export default function DistrictTable() {
  const {
    districts,
    districtsLoading,
    optimizationResult,
    availableStates,
    selectedStates: ctxSelectedStates,
    selectedDistricts: ctxSelectedDistricts,
  } = useOptimizationCtx();

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortConfig>({
    key: "literacy_gap",
    dir: "desc",
  });
  const [page, setPage] = useState(0);
  const [viewFilter, setViewFilter] = useState<ViewFilter>("all");
  const [tableStateFilter, setTableStateFilter] = useState<string>("");

  /* ── Enrich districts with quantum allocation + delta ─────── */
  const qaoaBoostedSet = useMemo(() => {
    return new Set(optimizationResult?.qaoa_selected ?? []);
  }, [optimizationResult]);

  const enriched = useMemo(() => {
    return districts.map((d) => {
      const qAlloc = optimizationResult?.qaoa_allocation[d.district] || 0;
      const gAlloc = optimizationResult?.greedy_allocation[d.district] || 0;
      const delta = qAlloc - gAlloc;
      const isBoosted = qaoaBoostedSet.has(d.district);
      return {
        ...d,
        quantum_alloc: qAlloc,
        greedy_alloc: gAlloc,
        delta,
        isBoosted,
      };
    });
  }, [districts, optimizationResult, qaoaBoostedSet]);

  /* ── Filter: view mode + state + text search ─────────────────── */
  const filtered = useMemo(() => {
    let result = enriched;

    // Apply view filter
    if (viewFilter === "selected") {
      const selStates = new Set(ctxSelectedStates);
      const selDistricts = new Set(ctxSelectedDistricts);
      if (selStates.size > 0 || selDistricts.size > 0) {
        result = result.filter(
          (d) => selStates.has(d.state) || selDistricts.has(d.district)
        );
      }
    } else if (viewFilter === "boosted") {
      result = result.filter((d) => d.isBoosted);
    }

    // Apply table state dropdown filter
    if (tableStateFilter) {
      result = result.filter((d) => d.state === tableStateFilter);
    }

    // Apply text search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (d) =>
          d.district.toLowerCase().includes(q) ||
          d.state.toLowerCase().includes(q)
      );
    }

    return result;
  }, [enriched, viewFilter, ctxSelectedStates, ctxSelectedDistricts, tableStateFilter, search]);

  /* ── Sort ────────────────────────────────────────────────────── */
  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const key = sort.key as string;
      const aVal = (a as Record<string, unknown>)[key] as number;
      const bVal = (b as Record<string, unknown>)[key] as number;
      const diff = (aVal ?? 0) - (bVal ?? 0);
      return sort.dir === "asc" ? diff : -diff;
    });
    return arr;
  }, [filtered, sort]);

  /* ── Paginate ───────────────────────────────────────────────── */
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageData = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  /* ── Sort toggle ────────────────────────────────────────────── */
  function toggleSort(key: SortConfig["key"]) {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "desc" }
    );
    setPage(0);
  }

  const arrow = (key: SortConfig["key"]) =>
    sort.key === key ? (sort.dir === "asc" ? " ↑" : " ↓") : "";

  const headers: { key: SortConfig["key"]; label: string }[] = [
    { key: "district", label: "District" },
    { key: "state" as SortConfig["key"], label: "State" },
    { key: "literacy_gap", label: "Lit. Gap" },
    { key: "employment_gap", label: "Emp. Gap" },
    { key: "agency_score", label: "Agency" },
    { key: "quantum_alloc", label: "Quantum ₹Cr" },
    { key: "greedy_alloc", label: "Greedy ₹Cr" },
  ];

  return (
    <div className="glow-card overflow-hidden">
      {/* ── Filter tabs + state dropdown + search ──────────────── */}
      <div className="p-4 border-b border-neo-border space-y-3">
        {/* Row 1: View filter tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-neo-text-dim mr-1">
            View:
          </span>
          {(
            [
              { key: "all" as ViewFilter, label: "All Districts", count: enriched.length },
              {
                key: "selected" as ViewFilter,
                label: "Selected",
                count: (() => {
                  const ss = new Set(ctxSelectedStates);
                  const sd = new Set(ctxSelectedDistricts);
                  if (ss.size === 0 && sd.size === 0) return 0;
                  return enriched.filter((d) => ss.has(d.state) || sd.has(d.district)).length;
                })(),
              },
              {
                key: "boosted" as ViewFilter,
                label: "QAOA Boosted",
                count: enriched.filter((d) => d.isBoosted).length,
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setViewFilter(tab.key); setPage(0); }}
              className={`px-3 py-1.5 text-[11px] rounded-lg border transition-all ${
                viewFilter === tab.key
                  ? "bg-neo-blue/20 border-neo-blue/40 text-neo-blue font-medium"
                  : "bg-neo-bg border-neo-border text-neo-text-dim hover:border-neo-blue/30 hover:text-neo-text"
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 text-[9px] ${viewFilter === tab.key ? "text-neo-blue/70" : "text-neo-text-dim/60"}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Row 2: State filter dropdown + text search */}
        <div className="flex gap-3">
          <select
            value={tableStateFilter}
            onChange={(e) => { setTableStateFilter(e.target.value); setPage(0); }}
            className="bg-neo-bg border border-neo-border rounded-lg px-3 py-2 text-sm text-neo-text focus:outline-none focus:border-neo-blue transition-colors min-w-[180px]"
          >
            <option value="">All States</option>
            {availableStates.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Search district or state..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="flex-1 bg-neo-bg border border-neo-border rounded-lg px-4 py-2 text-sm text-neo-text placeholder-neo-text-dim focus:outline-none focus:border-neo-blue transition-colors"
          />
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs font-[var(--font-data)]">
          <thead>
            <tr className="sticky top-0 bg-neo-card z-10">
              {headers.map((h) => (
                <th
                  key={h.key}
                  onClick={() => toggleSort(h.key)}
                  className="px-3 py-3 text-left text-neo-text-dim uppercase tracking-wider cursor-pointer hover:text-neo-blue transition-colors select-none whitespace-nowrap"
                >
                  {h.label}
                  <span className="text-neo-blue">{arrow(h.key)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {districtsLoading ? (
              <SkeletonRows />
            ) : pageData.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-neo-text-dim"
                >
                  No districts found
                </td>
              </tr>
            ) : (
              pageData.map((d) => (
                <tr
                  key={d.district + d.state}
                  className={`border-t border-neo-border/50 hover:bg-neo-hover transition-all duration-200 ${
                    d.isBoosted ? "bg-neo-blue/[0.04]" : ""
                  }`}
                >
                  <td className="px-3 py-2.5 text-neo-text font-medium whitespace-nowrap">
                    <span className="flex items-center gap-1.5">
                      {d.isBoosted && (
                        <span className="text-neo-cyan text-[10px]" title="QAOA Boosted">P</span>
                      )}
                      {d.district}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-neo-text-dim whitespace-nowrap">
                    {d.state}
                  </td>
                  <td className={`px-3 py-2.5 ${gapColorClass(d.literacy_gap)}`}>
                    {d.literacy_gap.toFixed(1)}%
                  </td>
                  <td className={`px-3 py-2.5 ${gapColorClass(d.employment_gap)}`}>
                    {d.employment_gap.toFixed(1)}%
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-neo-border rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(d.agency_score * 100, 100)}%`,
                            background:
                              d.agency_score > 0.5
                                ? "#22c55e"
                                : d.agency_score > 0.2
                                  ? "#f59e0b"
                                  : "#ef4444",
                          }}
                        />
                      </div>
                      <span className="text-neo-text-dim">
                        {d.agency_score.toFixed(3)}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-neo-blue font-medium">
                    ₹{d.quantum_alloc.toFixed(1)}
                  </td>
                  <td className="px-3 py-2.5 text-neo-amber">
                    ₹{d.greedy_alloc.toFixed(1)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-neo-border">
        <span className="text-xs text-neo-text-dim">
          {sorted.length} districts · Page {page + 1} of {totalPages}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="px-3 py-1 text-xs rounded border border-neo-border text-neo-text-dim hover:border-neo-blue hover:text-neo-text disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            Prev
          </button>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 py-1 text-xs rounded border border-neo-border text-neo-text-dim hover:border-neo-blue hover:text-neo-text disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
