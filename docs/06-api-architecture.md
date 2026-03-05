# 06 — API Architecture

## Overview

The backend is a FastAPI application serving the quantum-optimized budget
allocation engine. It loads data and model once at startup for fast
request handling.

## Endpoints

### GET /health

Health check.

```json
{ "status": "ok" }
```

### GET /districts

Returns the full dataset as a JSON array (648 objects).

```json
[
  {
    "district": "Araria",
    "state": "Bihar",
    "literacy_gap": 28.3,
    "employment_gap": 42.1,
    "total_spent_cr": 18.5,
    "women_wage_est": 4.2,
    "unutilized_bal": 2.1,
    "agency_score": 0.052
  },
  ...
]
```

### GET /states

Returns a sorted list of unique state names.

```json
["Andhra Pradesh", "Bihar", "Gujarat", ...]
```

### GET /district/{name}

Returns a single district by name (case-insensitive).

### POST /optimize

Run QAOA quantum optimization.

**Request:**
```json
{
  "total_budget_cr": 500,
  "states": ["Bihar", "Jharkhand"],
  "districts": null
}
```

- `states` and `districts` are optional geographic filters
- If `districts` is provided, it takes priority over `states`
- If neither is provided, optimization runs on all 648 districts

**Response:**
```json
{
  "qaoa_allocation": { "Araria": 12.5, "Kishanganj": 8.3, ... },
  "greedy_allocation": { "Araria": 10.0, "Kishanganj": 10.0, ... },
  "qaoa_selected": ["Araria", "Kishanganj", "Gaya"],
  "qaoa_total_impact": 0.042,
  "greedy_total_impact": 0.038,
  "improvement_pct": 10.53,
  "num_districts": 38,
  "budget_cr": 500,
  "predicted_impact_baseline": { "Araria": 0.15, ... },
  "predicted_impact_quantum": { "Araria": 0.21, ... },
  "predicted_impact_greedy": { "Araria": 0.18, ... }
}
```

### POST /generate-report

Generate an LLM-powered policy report using Gemini 2.5 Flash.

**Request:** Same schema as `/optimize`.

**Response:**
```json
{
  "report": "# Executive Summary\n\nThis report analyses...",
  "optimization": { ... }
}
```

### POST /parse-policy

Parse natural-language policy text into structured parameters.

**Request:**
```json
{
  "policy_text": "Allocate 800 crores for women in Bihar and UP"
}
```

**Response:**
```json
{
  "budget": 800,
  "states": ["Bihar", "Uttar Pradesh"],
  "districts": []
}
```

## Architecture

```
┌─────────────────────────────────────────────┐
│  FastAPI Application                        │
│                                             │
│  ┌───────────────┐   ┌──────────────────┐   │
│  │  AppState      │   │  Endpoints       │   │
│  │  - df (pandas) │──►│  /optimize       │   │
│  │  - model (RF)  │   │  /generate-report│   │
│  └───────────────┘   │  /parse-policy   │   │
│                      │  /districts      │   │
│                      │  /states         │   │
│                      └──────────────────┘   │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │  Modules                             │   │
│  │  src/quantum/optimizer.py  (QAOA)    │   │
│  │  src/api/llm_policy.py     (Gemini)  │   │
│  │  src/models/trainer.py     (RF)      │   │
│  │  src/dataset/pipeline.py   (ETL)     │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

## Startup (Lifespan)

The app uses FastAPI's lifespan context manager to load data and model
once at startup:

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    state.df = pd.read_csv(csv_path)
    state.model = joblib.load(model_path)
    yield
```

## CORS

All origins are allowed (`allow_origins=["*"]`) for development.
In production, this should be restricted to the frontend domain.

## CLI

The backend also exposes CLI commands:

```bash
uv run python main.py pipeline   # Run data pipeline
uv run python main.py train      # Train RF model
uv run python main.py optimize   # Run optimization (standalone)
uv run python main.py serve      # Start FastAPI server
uv run python main.py all        # Run pipeline + train + optimize
```
