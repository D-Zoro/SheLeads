# 04 — Machine Learning Model

## Overview

A Random Forest Regressor is trained to predict the "impact score" for each
district given its features. The model's predictions drive the quantum
optimizer by providing impact gradients.

## Architecture

| Parameter | Value |
|-----------|-------|
| Algorithm | Random Forest Regressor (scikit-learn) |
| n_estimators | 100 (default) |
| max_depth | None (fully grown trees) |
| min_samples_split | 2 |
| Features | 6 (see Feature Engineering doc) |
| Target | impact_score (composite) |
| Train/Test Split | 80/20 |

## Target Construction

```python
def build_target(df):
    """Composite impact score: higher = better women's empowerment outcomes."""
    return (1 - df["literacy_gap"] / 100) * df["agency_score"] * df["women_wage_est"]
```

This target captures districts where:
- Literacy gap is low (1 - gap/100 is high)
- Women's agency is high
- Women's wage earnings are high

The combination rewards districts that effectively convert resources into
empowerment outcomes.

## Training

```bash
cd backend
uv run python main.py train
```

This:
1. Loads `ready_to_optimize.csv`
2. Splits into 80% train / 20% test
3. Fits the Random Forest
4. Saves the model to `backend/src/models/rf_model.pkl`

## Evaluation

| Metric | Value |
|--------|-------|
| R-squared (test) | 0.7831 |
| MAE | 0.42 |
| RMSE | 0.89 |

An R-squared of ~0.78 means the model explains 78% of the variance in
impact scores — sufficient for gradient computation.

## Usage in the Optimizer

The model is NOT used to make final predictions. Instead, it computes
**marginal impact gradients**:

```python
gradient_i = model.predict(features_with_budget + 10) - model.predict(features_with_budget)
```

For each district, this gradient tells us: "If we add Rs 10 Cr of
funding, how much does the predicted impact improve?"

Districts with higher gradients benefit MORE from additional funding.
This gradient is the objective function for the QAOA optimizer.

## Why Random Forest?

1. **Non-linear relationships** — RF captures interactions between literacy
   gaps, spending, and agency that linear models miss
2. **Feature importance** — Built-in feature importance helps explain
   which factors matter most
3. **Robustness** — Ensemble of 100 trees is robust to outliers and noise
4. **Speed** — Trains in <1 second on 648 rows
5. **No tuning needed** — Default hyperparameters work well for this problem size

## Feature Importance (from trained model)

| Feature | Importance |
|---------|-----------|
| women_wage_est | 0.38 |
| agency_score | 0.24 |
| literacy_gap | 0.17 |
| total_spent_cr | 0.11 |
| employment_gap | 0.06 |
| unutilized_bal | 0.04 |
