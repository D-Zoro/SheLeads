# 02 — Data Cleaning & Pipeline

## Overview

Raw government data is messy — inconsistent naming, missing values, duplicate
rows, and varying formats. The pipeline standardizes everything into a single
clean CSV: `backend/src/dataset/ready_to_optimize.csv`.

## Pipeline Steps

### Step 1: State-wise File Combination

Each data source arrives as one CSV per state. Three combiner scripts
concatenate them:

```python
# data/combine_acc_data.py  — Financial access (bank accounts)
# data/combine_emp_data.py  — MGNREGA employment
# data/combine_fin_data.py  — Financial indicators
```

Output: Three consolidated CSVs in `data/final_data/`.

### Step 2: District Name Standardization

District and state names are normalized:
- Stripped of leading/trailing whitespace
- Converted to title case
- Special characters standardized (& → and, etc.)
- Known aliases resolved (e.g., "Bangalore Urban" → "Bengaluru Urban")

### Step 3: Merge on (district, state)

The three datasets are merged using an inner join on the composite key
`(district, state)`. This discards districts that appear in only one source.

```python
# data/merge_all_data.py
merged = pd.merge(nfhs, employment, on=["district", "state"])
merged = pd.merge(merged, financial, on=["district", "state"])
```

### Step 4: Missing Value Handling

| Strategy | Applied to |
|----------|-----------|
| Median imputation | Numeric columns (literacy_gap, employment_gap, etc.) |
| Zero fill | Financial columns (women_wage_est, unutilized_bal) |
| Drop row | Rows missing both district and state |

### Step 5: Feature Computation

See [03-feature-engineering.md](03-feature-engineering.md).

### Step 6: Output

Final output: `backend/src/dataset/ready_to_optimize.csv`

| Column | Type | Description |
|--------|------|-------------|
| district | string | District name |
| state | string | State/UT name |
| literacy_gap | float | Male literacy - Female literacy (%) |
| employment_gap | float | Male employment - Female employment (%) |
| total_spent_cr | float | MGNREGA total expenditure (Rs Cr) |
| women_wage_est | float | Estimated women's wages (Rs Cr) |
| unutilized_bal | float | Unspent MGNREGA balance (Rs Cr) |
| agency_score | float | Composite women's agency score (0-1) |

**Rows: ~648 | Columns: 8**

## Running the Pipeline

```bash
cd backend
uv run python main.py pipeline
```

This executes the full data pipeline and writes `ready_to_optimize.csv`.
