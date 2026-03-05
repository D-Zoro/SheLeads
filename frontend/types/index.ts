/* ── NeoPolicy TypeScript Interfaces ──────────────────────────── */

/** A single district row from GET /districts */
export interface District {
  district: string;
  state: string;
  literacy_gap: number;
  employment_gap: number;
  total_spent_cr: number;
  women_wage_est: number | null;
  unutilized_bal: number;
  agency_score: number;
}

/** POST /optimize response */
export interface OptimizationResult {
  qaoa_allocation: Record<string, number>;
  greedy_allocation: Record<string, number>;
  qaoa_total_impact: number;
  greedy_total_impact: number;
  improvement_pct: number;
}

/** POST /policy-brief response */
export interface PolicyBriefResponse {
  district: string;
  brief: string;
  allocation_cr: number;
}

/** Toast notification */
export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

/** Sort direction for table */
export type SortDir = "asc" | "desc";

/** Sort config */
export interface SortConfig {
  key: keyof District | "quantum_alloc" | "delta";
  dir: SortDir;
}
