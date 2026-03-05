"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
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
  selectedDistrict: District | null;
  setSelectedDistrict: (d: District | null) => void;
  toasts: Toast[];
  addToast: (message: string, type?: Toast["type"]) => void;
  removeToast: (id: string) => void;
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
  const [selectedDistrict, setSelectedDistrict] = useState<District | null>(
    null
  );
  const [toasts, setToasts] = useState<Toast[]>([]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    async (b: number) => {
      setOptimizationLoading(true);
      setOptimizationError(null);
      try {
        const res = await fetch(`${API}/optimize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ total_budget_cr: b }),
        });
        if (!res.ok) throw new Error("Optimization failed");
        const data: OptimizationResult = await res.json();
        setOptimizationResult(data);
        addToast(
          `Optimization complete — Quantum advantage: ${data.improvement_pct >= 0 ? "+" : ""}${data.improvement_pct.toFixed(1)}%`
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

  /* ── Run on budget change (debounced 400ms) ─────────────────── */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runOptimization(budget);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [budget, runOptimization]);

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
        selectedDistrict,
        setSelectedDistrict,
        toasts,
        addToast,
        removeToast,
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
