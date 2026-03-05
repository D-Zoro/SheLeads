"use client";

import { useEffect } from "react";

/**
 * Tailwind v4 internally emits lab()/oklch() colors for its default palette.
 * html2canvas and browsers log "unsupported color function" on these.
 * We suppress at multiple levels — both on mount AND during html2canvas.
 */

// ── Immediate suppression (runs at import time) ────────────────
if (typeof window !== "undefined") {
  const _origWarn = console.warn;
  const _origErr = console.error;

  console.warn = function (...args: unknown[]) {
    if (typeof args[0] === "string" && args[0].includes("unsupported color")) return;
    return _origWarn.apply(console, args);
  };

  console.error = function (...args: unknown[]) {
    if (typeof args[0] === "string" && args[0].includes("unsupported color")) return;
    return _origErr.apply(console, args);
  };
}

export default function SuppressLabWarnings() {
  useEffect(() => {
    // Double-ensure suppression is active after hydration
    const origWarn = console.warn;
    const origError = console.error;

    console.warn = function (...args: unknown[]) {
      if (typeof args[0] === "string" && args[0].includes("unsupported color")) return;
      return origWarn.apply(console, args);
    };

    console.error = function (...args: unknown[]) {
      if (typeof args[0] === "string" && args[0].includes("unsupported color")) return;
      return origError.apply(console, args);
    };

    return () => {
      console.warn = origWarn;
      console.error = origError;
    };
  }, []);

  return null;
}
