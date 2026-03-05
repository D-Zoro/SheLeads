"use client";

import { useOptimizationCtx } from "@/context/OptimizationContext";

export default function ToastContainer() {
  const { toasts, removeToast } = useOptimizationCtx();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast-enter glow-card flex items-center gap-3 px-5 py-3 min-w-[320px] max-w-[420px] ${
            t.type === "error"
              ? "border-neo-red/50"
              : t.type === "info"
                ? "border-neo-amber/50"
                : "border-neo-green/50"
          }`}
        >
          <span
            className={`text-sm font-medium ${
              t.type === "error"
                ? "text-neo-red"
                : t.type === "info"
                  ? "text-neo-amber"
                  : "text-neo-green"
            }`}
          >
            {t.type === "error" ? "✕" : t.type === "info" ? "ℹ" : "✓"}
          </span>
          <span className="text-sm text-neo-text flex-1">{t.message}</span>
          <button
            onClick={() => removeToast(t.id)}
            className="text-neo-text-dim hover:text-neo-text transition-colors"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
