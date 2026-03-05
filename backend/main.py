"""
main.py — Leadher FastAPI Backend

Serves the quantum-optimized budget allocation API for women's empowerment.

Endpoints:
    GET  /health               → {"status": "ok"}
    GET  /districts             → full dataset as JSON
    GET  /states                → list of unique state names
    GET  /district/{name}       → single district features
    POST /optimize              → QAOA vs greedy optimization
    POST /generate-report       → LLM-generated policy report

CLI utilities (run directly):
    uv run python main.py pipeline
    uv run python main.py train
    uv run python main.py optimize [budget]
    uv run python main.py serve
    uv run python main.py all
"""

import sys
from pathlib import Path
from contextlib import asynccontextmanager

import pandas as pd
import joblib
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from src.quantum.optimizer import run_qaoa_optimization, FEATURE_COLS
from src.api.llm_policy import generate_report, parse_policy_text

# ── Path constants ───────────────────────────────────────────────────────
_DATASET_DIR = Path(__file__).resolve().parent / "src" / "dataset"
_MODELS_DIR = Path(__file__).resolve().parent / "src" / "models"


# ── Shared state loaded once at startup ──────────────────────────────────
class AppState:
    df: pd.DataFrame | None = None
    model = None


state = AppState()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load data and model once when the server starts."""
    csv_path = _DATASET_DIR / "ready_to_optimize.csv"
    model_path = _MODELS_DIR / "rf_model.pkl"

    state.df = pd.read_csv(csv_path)
    state.model = joblib.load(model_path)
    print(f"Loaded {len(state.df)} districts and RF model")
    yield
    # Cleanup (nothing needed)


# ── FastAPI app ──────────────────────────────────────────────────────────
app = FastAPI(
    title="Leadher API",
    description="Quantum-enhanced women's empowerment budget optimizer",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response models ────────────────────────────────────────────
class OptimizeRequest(BaseModel):
    total_budget_cr: float
    states: list[str] | None = None
    districts: list[str] | None = None


class ReportRequest(BaseModel):
    total_budget_cr: float
    states: list[str] | None = None
    districts: list[str] | None = None


class PolicyTextRequest(BaseModel):
    policy_text: str


# ── Endpoints ────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/districts")
async def get_districts():
    """Return the full district dataset as a list of JSON objects."""
    df = state.df
    if df is None:
        raise HTTPException(status_code=503, detail="Data not loaded yet")
    # fillna(None) + to_dict won't help with numpy NaN → use .where + python None
    records = df.to_dict(orient="records")
    # Sanitize NaN → null for JSON compliance
    for row in records:
        for k, v in row.items():
            if isinstance(v, float) and (v != v):  # NaN check
                row[k] = None
    return records


@app.get("/states")
async def get_states():
    """Return a sorted list of unique state names."""
    df = state.df
    if df is None:
        raise HTTPException(status_code=503, detail="Data not loaded yet")
    return sorted(df["state"].dropna().unique().tolist())


@app.get("/district/{district_name}")
async def get_district(district_name: str):
    """Return a single district's features. Case-insensitive match."""
    df = state.df
    if df is None:
        raise HTTPException(status_code=503, detail="Data not loaded yet")

    match = df[df["district"].str.lower() == district_name.lower()]
    if match.empty:
        raise HTTPException(status_code=404, detail=f"District '{district_name}' not found")

    row = match.iloc[0].to_dict()
    for k, v in row.items():
        if isinstance(v, float) and (v != v):
            row[k] = None
    return row


@app.post("/optimize")
async def optimize(req: OptimizeRequest):
    """
    Run QAOA quantum optimization for the given total budget.
    Returns QAOA allocation, greedy baseline, and comparison metrics.
    """
    if req.total_budget_cr <= 0:
        raise HTTPException(status_code=400, detail="Budget must be positive")

    try:
        result = run_qaoa_optimization(
            req.total_budget_cr,
            states=req.states,
            district_names_filter=req.districts,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Optimization failed: {str(e)}")

    return result


@app.post("/generate-report")
async def generate_report_endpoint(req: ReportRequest):
    """
    Generate a comprehensive LLM-powered policy report.
    Runs optimization with the given parameters, then asks Gemini to
    produce a full analysis with budget allocations, predicted impacts,
    and policy recommendations.
    """
    if req.total_budget_cr <= 0:
        raise HTTPException(status_code=400, detail="Budget must be positive")

    # Run quantum optimization
    try:
        opt_result = run_qaoa_optimization(
            req.total_budget_cr,
            states=req.states,
            district_names_filter=req.districts,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Optimization failed: {str(e)}")

    # Generate report via Gemini
    try:
        report_text = generate_report(opt_result, req.states, req.districts)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM generation failed: {str(e)}")

    return {
        "report": report_text,
        "optimization": opt_result,
    }


@app.post("/parse-policy")
async def parse_policy_endpoint(req: PolicyTextRequest):
    """
    Parse a natural-language policy description into structured
    optimization parameters (budget, states, districts) using Gemini.
    """
    if not req.policy_text.strip():
        raise HTTPException(status_code=400, detail="Policy text is empty")

    df = state.df
    if df is None:
        raise HTTPException(status_code=503, detail="Data not loaded yet")

    available_states = sorted(df["state"].dropna().unique().tolist())

    try:
        params = parse_policy_text(req.policy_text, available_states)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Policy parsing failed: {str(e)}")

    return params


# ── CLI Commands ─────────────────────────────────────────────────────────

def _cli():
    """CLI entrypoint for pipeline/train/optimize/serve commands."""

    def cmd_pipeline():
        from src.dataset.pipeline import run_pipeline
        run_pipeline()

    def cmd_train():
        from src.models.trainer import train
        train()

    def cmd_optimize():
        budget = float(sys.argv[2]) if len(sys.argv) > 2 else 500.0
        result = run_qaoa_optimization(budget)

        print(f"\n=== QAOA Quantum Allocation ===")
        for d, amt in sorted(result["qaoa_allocation"].items()):
            print(f"  {d:35s}  Rs {amt} Cr")
        print(f"  Districts funded : {len(result['qaoa_allocation'])}")
        print(f"  Predicted impact : {result['qaoa_total_impact']:.6f}")

        print(f"\n=== Greedy Baseline (top {len(result['greedy_allocation'])}) ===")
        shown = list(sorted(result["greedy_allocation"].items()))[:10]
        for d, amt in shown:
            print(f"  {d:35s}  Rs {amt} Cr")
        remaining = len(result["greedy_allocation"]) - len(shown)
        if remaining > 0:
            print(f"  ... and {remaining} more districts")
        print(f"  Predicted impact : {result['greedy_total_impact']:.6f}")

        print(f"\n=== Quantum vs Greedy ===")
        print(f"  QAOA impact   : {result['qaoa_total_impact']:.6f}")
        print(f"  Greedy impact : {result['greedy_total_impact']:.6f}")
        print(f"  Improvement   : {result['improvement_pct']:+.2f}%")

    def cmd_serve():
        import uvicorn
        uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

    commands = {
        "pipeline": cmd_pipeline,
        "train": cmd_train,
        "optimize": cmd_optimize,
        "serve": cmd_serve,
    }

    if len(sys.argv) < 2 or sys.argv[1] not in {*commands, "all"}:
        print(__doc__)
        sys.exit(1)

    cmd = sys.argv[1]
    if cmd == "all":
        for name in ("pipeline", "train", "optimize"):
            print(f"\n{'='*60}")
            print(f"  Running: {name}")
            print(f"{'='*60}\n")
            commands[name]()
    else:
        commands[cmd]()


if __name__ == "__main__":
    _cli()
