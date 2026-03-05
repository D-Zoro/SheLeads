"""
train_model.py — Classical AI Predictor for NeoPolicy
Trains a Random Forest to predict district-level "impact score"
from engineered features, then serializes the model for the API.
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score
import joblib


# ── Feature & target definitions ─────────────────────────────────────────
FEATURE_COLS = [
    "total_spent_cr",
    "women_wage_est",
    "unutilized_bal",
    "agency_score",
    "literacy_gap",
    "employment_gap",
]


def build_target(df: pd.DataFrame) -> pd.Series:
    """
    Synthetic ground-truth: measures how effective current spending was.

    impact_score = (1 - literacy_gap/100) * agency_score * women_wage_est

    Intuition:
      - (1 - literacy_gap/100) → literacy "health" (higher = better)
      - agency_score           → women's financial autonomy
      - women_wage_est         → actual money reaching women (₹ Cr)
    A district that is literate, autonomous, AND well-funded scores high.
    """
    return (
        (1 - df["literacy_gap"] / 100)
        * df["agency_score"]
        * df["women_wage_est"]
    )


def train(input_path: str = "ready_to_optimize.csv", model_path: str = "rf_model.pkl"):
    """Load data, engineer target, train Random Forest, evaluate, and save."""

    # ── 1. Load engineered features ──────────────────────────────────────
    df = pd.read_csv(input_path)
    print(f"Loaded {len(df)} rows from {input_path}")

    # Drop rows with nulls in feature or target columns to avoid NaN leakage
    df = df.dropna(subset=FEATURE_COLS)
    print(f"After dropping nulls: {len(df)} rows")

    # ── 2. Build synthetic target ────────────────────────────────────────
    df["impact_score"] = build_target(df)

    X = df[FEATURE_COLS]
    y = df["impact_score"]

    # ── 3. Train / test split (80/20) ────────────────────────────────────
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    # ── 4. Train Random Forest ───────────────────────────────────────────
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)

    # ── 5. Evaluate ──────────────────────────────────────────────────────
    y_pred = model.predict(X_test)
    r2 = r2_score(y_test, y_pred)
    print(f"\n═══ Model Evaluation ═══")
    print(f"R² Score : {r2:.4f}")

    # Feature importances, sorted highest → lowest
    importances = pd.Series(model.feature_importances_, index=FEATURE_COLS)
    importances = importances.sort_values(ascending=False)
    print(f"\nFeature Importances:")
    for feat, imp in importances.items():
        print(f"  {feat:20s}  {imp:.4f}")

    # ── 6. Save model ────────────────────────────────────────────────────
    joblib.dump(model, model_path)
    print(f"\nModel saved → {model_path}")

    return model


def predict_impact_gradient(
    model,
    district_row: dict,
    new_budget_cr: float,
) -> float:
    """
    Predict the impact score for a single district under a proposed new budget.

    Parameters
    ----------
    model : trained RandomForestRegressor (or loaded from rf_model.pkl)
    district_row : dict with keys matching FEATURE_COLS
        Current feature values for the district.
    new_budget_cr : float
        Proposed new total budget in Crores.

    Returns
    -------
    float — predicted impact_score under the new budget scenario.

    The function swaps in the new budget while keeping all other
    district characteristics unchanged, then asks the model what
    impact that budget level would produce.
    """
    # Copy so we don't mutate the caller's data
    row = dict(district_row)

    # Override spending with the proposed budget
    row["total_spent_cr"] = new_budget_cr

    # Build a single-row DataFrame in the correct column order
    X_new = pd.DataFrame([row])[FEATURE_COLS]

    return float(model.predict(X_new)[0])


if __name__ == "__main__":
    model = train()

    # ── Quick sanity check with predict_impact_gradient ───────────────────
    df = pd.read_csv("ready_to_optimize.csv").dropna(subset=FEATURE_COLS)
    sample = df.iloc[0]
    sample_dict = sample[FEATURE_COLS].to_dict()

    current_budget = sample["total_spent_cr"]
    boosted_budget = current_budget * 1.5  # simulate 50% funding increase

    pred_current = predict_impact_gradient(model, sample_dict, current_budget)
    pred_boosted = predict_impact_gradient(model, sample_dict, boosted_budget)

    print(f"\n═══ Gradient Check ({sample['district']}) ═══")
    print(f"  Current budget : {current_budget:.2f} Cr → impact = {pred_current:.4f}")
    print(f"  Boosted budget : {boosted_budget:.2f} Cr → impact = {pred_boosted:.4f}")
    print(f"  Delta          : {pred_boosted - pred_current:+.4f}")
