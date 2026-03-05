"""
data_pipeline.py — Feature Engineering Pipeline for NeoPolicy
Transforms raw district-level data into optimization-ready features.
"""

import pandas as pd


def run_pipeline(input_path: str = "raw_districts.csv", output_path: str = "ready_to_optimize.csv") -> pd.DataFrame:
    # ── 1. Load raw merged district data ──────────────────────────────────
    df = pd.read_csv(input_path)
    print(f"Loaded {len(df)} districts from {input_path}")

    # ── 2. Feature Engineering ────────────────────────────────────────────

    # Gap = distance from 100%. Higher gap → more need for intervention.
    df["literacy_gap"] = 100 - df["literacy_rate"]

    # Employment gap: % of women NOT working (complement of women_worked_pct)
    df["employment_gap"] = 100 - df["women_worked_pct"]

    # Convert total expenditure from Lakhs to Crores for readability (1 Cr = 100 Lakhs)
    df["total_spent_cr"] = df["total_exp_lakhs"] / 100

    # Estimate women's wage share: pro-rate unskilled wages by women's personday ratio,
    # then convert Lakhs → Crores
    df["women_wage_est"] = (
        df["unskilled_wages_lakhs"] * (df["women_persondays"] / df["total_persondays"])
    ) / 100

    # Unspent balance in Crores — signals inefficiency / absorption capacity
    df["unutilized_bal"] = df["balance_lakhs"] / 100

    # Agency score: ratio of individual (autonomous) accounts to total accounts
    # Higher score → women have more direct financial control
    df["agency_score"] = df["individual_accounts"] / df["total_accounts"]

    # ── 3. Keep only engineered features + identifiers ────────────────────
    keep_cols = [
        "district",
        "state",
        "literacy_gap",
        "employment_gap",
        "total_spent_cr",
        "women_wage_est",
        "unutilized_bal",
        "agency_score",
    ]
    df = df[keep_cols]

    # ── 4. Save to CSV ───────────────────────────────────────────────────
    df.to_csv(output_path, index=False)
    print(f"Saved {len(df)} rows → {output_path}")

    # ── 5. Summary ───────────────────────────────────────────────────────
    print("\n═══ Pipeline Summary ═══")
    print(f"Rows   : {len(df)}")
    print(f"Nulls  :\n{df.isnull().sum().to_string()}")
    print(f"\nFeature Ranges:")
    feature_cols = [c for c in keep_cols if c not in ("district", "state")]
    for col in feature_cols:
        print(f"  {col:20s}  min={df[col].min():.4f}  max={df[col].max():.4f}")

    return df


if __name__ == "__main__":
    run_pipeline()
