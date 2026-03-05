"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  type ReactNode,
} from "react";
import type { District, OptimizationResult, Toast } from "@/types";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/* ── Context shape ────────────────────────────────────────────── */
interface OptimizationContextValue {
  budget: number;
  setBudget: (b: number) => void;
  districts: District[];
  districtsLoading: boolean;
  optimizationResult: OptimizationResult | null;
  optimizationLoading: boolean;
  optimizationError: string | null;
  toasts: Toast[];
  addToast: (message: string, type?: Toast["type"]) => void;
  removeToast: (id: string) => void;
  // Geographic filters
  availableStates: string[];
  selectedStates: string[];
  setSelectedStates: (s: string[]) => void;
  selectedDistricts: string[];
  setSelectedDistricts: (d: string[]) => void;
  // Report
  reportLoading: boolean;
  generateReport: () => Promise<string | null>;
}

const OptimizationContext = createContext<OptimizationContextValue | null>(null);

/* ── Provider ─────────────────────────────────────────────────── */
export function OptimizationProvider({ children }: { children: ReactNode }) {
  const [budget, setBudget] = useState(500);
  const [districts, setDistricts] = useState<District[]>([]);
  const [districtsLoading, setDistrictsLoading] = useState(true);
  const [optimizationResult, setOptimizationResult] =
    useState<OptimizationResult | null>(null);
  const [optimizationLoading, setOptimizationLoading] = useState(false);
  const [optimizationError, setOptimizationError] = useState<string | null>(
    null
  );
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Geographic filters
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [reportLoading, setReportLoading] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derive unique state names from loaded districts
  const availableStates = useMemo(() => {
    const stateSet = new Set(districts.map((d) => d.state));
    return Array.from(stateSet).sort();
  }, [districts]);

  /* ── Toast helpers ──────────────────────────────────────────── */
  const addToast = useCallback(
    (message: string, type: Toast["type"] = "success") => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /* ── Fetch districts on mount ───────────────────────────────── */
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/districts`);
        if (!res.ok) throw new Error("Failed to fetch districts");
        const data: District[] = await res.json();
        setDistricts(data);
      } catch (err) {
        console.error(err);
        addToast("Failed to load district data", "error");
      } finally {
        setDistrictsLoading(false);
      }
    })();
  }, [addToast]);

  /* ── Debounced optimization ─────────────────────────────────── */
  const runOptimization = useCallback(
    async (b: number, states: string[], districtNames: string[]) => {
      setOptimizationLoading(true);
      setOptimizationError(null);
      try {
        const body: Record<string, unknown> = { total_budget_cr: b };
        if (districtNames.length > 0) body.districts = districtNames;
        else if (states.length > 0) body.states = states;

        const res = await fetch(`${API}/optimize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Optimization failed");
        const data: OptimizationResult = await res.json();
        setOptimizationResult(data);
        addToast(
          `Optimization complete — ${data.num_districts} districts analysed`
        );
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Optimization failed";
        setOptimizationError(msg);
        addToast(msg, "error");
      } finally {
        setOptimizationLoading(false);
      }
    },
    [addToast]
  );

  /* ── Run on budget / filter change (debounced 400ms) ────────── */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runOptimization(budget, selectedStates, selectedDistricts);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [budget, selectedStates, selectedDistricts, runOptimization]);

  /* ── Generate full report ───────────────────────────────────── */
  const generateReport = useCallback(async (): Promise<string | null> => {
    setReportLoading(true);
    try {
      const body: Record<string, unknown> = { total_budget_cr: budget };
      if (selectedDistricts.length > 0) body.districts = selectedDistricts;
      else if (selectedStates.length > 0) body.states = selectedStates;

      const res = await fetch(`${API}/generate-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Report generation failed");
      const data = await res.json();
      addToast("Report generated successfully");
      return data.report as string;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Report generation failed";
      addToast(msg, "error");
      return null;
    } finally {
      setReportLoading(false);
    }
  }, [budget, selectedStates, selectedDistricts, addToast]);

  return (
    <OptimizationContext.Provider
      value={{
        budget,
        setBudget,
        districts,
        districtsLoading,
        optimizationResult,
        optimizationLoading,
        optimizationError,
        toasts,
        addToast,
        removeToast,
        availableStates,
        selectedStates,
        setSelectedStates,
        selectedDistricts,
        setSelectedDistricts,
        reportLoading,
        generateReport,
      }}
    >
      {children}
    </OptimizationContext.Provider>
  );
}

/* ── Hook ─────────────────────────────────────────────────────── */
export function useOptimizationCtx() {
  const ctx = useContext(OptimizationContext);
  if (!ctx)
    throw new Error(
      "useOptimizationCtx must be used within OptimizationProvider"
    );
  return ctx;
}
