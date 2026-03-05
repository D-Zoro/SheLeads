# 03 — Feature Engineering

## Overview

Six features are computed from the merged dataset to capture the key
dimensions of women's empowerment and government spending effectiveness.

## Feature Definitions

### 1. `literacy_gap` (%)

```
literacy_gap = male_literacy_rate - female_literacy_rate
```

**Rationale:** Higher gap = more need. This is the primary indicator of
gender inequality in education. National average: ~15%, worst districts: 35%+.

### 2. `employment_gap` (%)

```
employment_gap = male_employment_rate - female_employment_rate
```

**Rationale:** Captures the gender disparity in workforce participation.
Districts with high employment gaps need targeted interventions.

### 3. `total_spent_cr` (Rs Crores)

Direct MGNREGA expenditure in the district. This is the "treatment" variable —
the model learns how spending relates to outcomes.

### 4. `women_wage_est` (Rs Crores)

Estimated total wages earned by women through MGNREGA. Higher values
indicate better reach of the scheme to women.

### 5. `unutilized_bal` (Rs Crores)

Allocated MGNREGA budget that remains unspent. High values suggest
administrative bottlenecks or low demand — a signal of implementation gaps.

### 6. `agency_score` (0 to 1)

Composite score derived from:
- Women with individual bank accounts (%)
- Women participating in household decisions (%)
- Women with freedom of movement (%)

```python
agency_score = (bank_account_pct / 100) * (decision_pct / 100) * (mobility_pct / 100)
```

Normalized to [0, 1]. Higher = more empowered.

## Target Variable (for ML model)

The Random Forest model predicts an "impact score":

```python
impact_score = (1 - literacy_gap / 100) * agency_score * women_wage_est
```

This composite captures how well a district converts funding into
measurable women's empowerment outcomes.

## Feature Statistics

| Feature | Min | Median | Max | Std Dev |
|---------|-----|--------|-----|---------|
| literacy_gap | 0.1% | 14.8% | 42.3% | 8.2% |
| employment_gap | -5.2% | 18.6% | 55.1% | 12.4% |
| total_spent_cr | 0.01 | 12.5 | 280.0 | 25.3 |
| women_wage_est | 0.0 | 3.2 | 120.0 | 10.1 |
| unutilized_bal | 0.0 | 1.8 | 45.0 | 4.5 |
| agency_score | 0.001 | 0.12 | 0.85 | 0.14 |

## Why These Features?

1. **literacy_gap + employment_gap** — Define the problem (where is inequality worst?)
2. **total_spent_cr + women_wage_est** — Define current intervention level
3. **unutilized_bal** — Signals implementation capacity
4. **agency_score** — Measures outcomes (are women actually empowered?)

The optimizer needs both "need" signals (gaps) and "capacity" signals
(spending, agency) to allocate budget effectively.
