# 01 — Dataset Collection

## Overview

Leadher consumes three national-level datasets, each providing a different
lens on women's empowerment across Indian districts.

## Data Sources

### 1. NFHS-5 (National Family Health Survey, 2019-21)

| Field | Detail |
|-------|--------|
| **Source** | Ministry of Health and Family Welfare, Government of India |
| **URL** | http://rchiips.org/nfhs/NFHS-5Reports/NFHS-5_INDIA_REPORT.pdf |
| **Granularity** | District-level (648 districts) |
| **Format** | PDF tables → manually extracted CSV |

**Key indicators extracted:**
- Literacy rate (male and female separately)
- Employment status of women
- Women's participation in household decision-making
- Women who have a bank/savings account they use themselves

### 2. MGNREGA (Mahatma Gandhi National Rural Employment Guarantee Act)

| Field | Detail |
|-------|--------|
| **Source** | Ministry of Rural Development |
| **URL** | https://nrega.nic.in |
| **Granularity** | District-level |
| **Format** | HTML tables → scraped to CSV |

**Key indicators extracted:**
- Total expenditure per district (Rs Crores)
- Women's wage estimates
- Person-days of employment generated
- Unutilized balance (allocated but unspent funds)

### 3. Financial Inclusion Data

| Field | Detail |
|-------|--------|
| **Source** | NFHS-5 supplementary tables, PMJDY reports |
| **Granularity** | District-level |
| **Format** | CSV |

**Key indicators extracted:**
- Women with bank accounts (individual and joint)
- Financial autonomy indicators
- Account usage frequency

## Raw File Structure

```
data/
├── acc/           # Financial inclusion CSVs (state-wise)
├── emp/           # MGNREGA employment CSVs (state-wise)
├── fin/           # Financial data CSVs (state-wise)
└── final_data/
    ├── nfhs-5.csv              # Cleaned NFHS-5 data
    ├── employment_status.csv   # Cleaned MGNREGA data
    ├── financial_data.csv      # Cleaned financial data
    └── women_joint_acc.csv     # Joint account ownership
```

## Collection Process

1. State-wise CSV files were collected from government portals
2. `data/combine_acc_data.py` — Combines all state-wise financial access files
3. `data/combine_emp_data.py` — Combines all state-wise employment files
4. `data/combine_fin_data.py` — Combines all state-wise financial files
5. `data/merge_all_data.py` — Merges the three combined datasets by district+state
6. `data/main.py` — Orchestrates the full pipeline

## District Matching

The three datasets use slightly different district/state naming conventions.
A fuzzy matching step resolves differences:

- "Maharastra" vs "Maharashtra"
- "NCT of Delhi" vs "Delhi"
- "Andaman & Nicobar Islands" vs "Andaman & Nicobar"

Final output: **648 matched districts** across 35 states/UTs.
