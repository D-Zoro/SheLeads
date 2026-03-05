# Leadher — Developer Explanation (Simple Terms)

## What Is This?

Leadher is a web app that helps the Indian government decide how to spend
money on women's empowerment programs across all 648 districts. Think of it
as a smart budget calculator that uses quantum computing and AI.

## The Problem (In Simple Terms)

India has a program called MGNREGA that provides jobs and wages to rural
workers. The government needs to decide: "How much money should each of
648 districts get?" Currently this is done manually with basic rules like
"give more to poorer districts." But that's like dividing a pizza equally
without asking who's actually hungry.

## What We Built

### 1. Data Pipeline

We collected three government datasets:
- **NFHS-5**: Health survey data -- how literate are women? Are they employed?
  Do they have bank accounts? Do they make household decisions?
- **MGNREGA**: Employment data -- how much was spent in each district?
  How much went to women?
- **Financial data**: Bank account ownership, financial independence

We cleaned all three and merged them into one table: 648 rows (districts)
× 8 columns (features like literacy gap, employment gap, agency score, etc.)

### 2. Machine Learning Model (Random Forest)

Think of this as a "prediction engine." We trained it to answer: "If we
give District X more money, how much will women's empowerment improve?"

- **Input**: 6 features per district (literacy gap, employment gap, spending, wages, unspent balance, agency score)
- **Output**: A predicted "impact score"
- **Accuracy**: R-squared = 0.78 (explains 78% of what drives empowerment)

The key insight: we compute **gradients** — for each district, "how much
does the impact improve per extra Rs 10 Crore?" This tells us which
districts benefit MOST from additional funding.

### 3. Quantum Optimizer (QAOA)

This is the core innovation. Here's what it does in simple terms:

**The classical (greedy) way**: Sort districts by highest literacy gap.
Fund the top ones first. Done. Simple but dumb — it ignores which
districts actually benefit most from more money.

**The quantum way**: Imagine 8 light switches, each representing one
district. Quantum mechanics lets us flip ALL combinations of switches
simultaneously (256 combinations for 8 switches). We check which
combination gives the highest total impact while staying within budget.
Classical computers check one combination at a time; quantum checks
them all at once.

**Technical details** (for those curious):
- 8 qubits = 256 quantum states = 256 possible funding combinations
- QAOA alternates between two operations:
  - "Phase kick": Good combinations get amplified
  - "Mixing": Creates interference so good solutions become more likely
- scipy's COBYLA optimizer tunes two angles (gamma, beta) to maximize
  the probability of measuring the best combination
- Result: 3 priority districts get identified and receive 3x funding weight

### 4. Full Budget Allocation

After QAOA identifies 3 priority districts, we allocate the ENTIRE budget:
- Every district gets funding proportional to its impact gradient
- QAOA-selected districts get 3× the weight
- Total always sums to the user's budget setting

We also compute a "greedy baseline" (fund by raw literacy gap) for comparison.
The quantum approach typically beats greedy by +2% to +15%.

### 5. AI Report Generation (Gemini)

Google's Gemini 2.5 Flash AI reads the optimization results and writes
a professional policy report with:
- Executive summary
- Why each district was prioritized
- Budget allocation table
- Impact predictions
- Implementation recommendations

### 6. Policy Text Parser

Users can describe their policy in plain English (e.g., "800 crores for
Bihar and UP"). Gemini extracts the budget, states, and districts
automatically, setting the sliders for them.

### 7. Frontend Dashboard

A dark-themed "mission control" interface built with Next.js:
- **Budget slider**: Drag to set total budget (100-2000 Cr)
- **State/district filters**: Multi-select dropdowns
- **India map**: Color-coded by literacy gap, clickable states
- **Comparison chart**: Quantum vs Greedy allocation (top 10 districts)
- **District table**: Full 648-row table, sortable + searchable
- **PDF export**: Downloads a formatted report with charts
- **CSV download**: Export raw data for analysis

## How Everything Connects

```
User sets budget & filters
         ↓
Frontend sends POST /optimize to backend
         ↓
Backend loads 648-district CSV + trained RF model
         ↓
RF model computes impact gradient for each district
         ↓
Top 8 districts encoded as 8 qubits (256 states)
         ↓
QAOA finds optimal subset → 3 priority districts
         ↓
Full budget distributed (proportional, 3× for QAOA picks)
         ↓
Results sent back to frontend → charts, map, table update
         ↓
User clicks "Generate Report" → Gemini writes policy doc
         ↓
User downloads PDF or CSV
```

## File Structure

```
Leadher/
├── backend/
│   ├── main.py                    # FastAPI app + CLI
│   ├── src/
│   │   ├── quantum/optimizer.py   # QAOA optimizer (the core)
│   │   ├── models/trainer.py      # RF model training
│   │   ├── api/llm_policy.py      # Gemini report + policy parser
│   │   └── dataset/
│   │       ├── pipeline.py        # Data cleaning pipeline
│   │       └── ready_to_optimize.csv  # Final clean data
│   └── pyproject.toml
├── frontend/
│   ├── app/
│   │   ├── page.tsx               # Main dashboard
│   │   ├── about/page.tsx         # About page
│   │   ├── layout.tsx             # Root layout
│   │   └── globals.css            # Theme + animations
│   ├── components/
│   │   ├── IndiaMap.tsx           # Choropleth map
│   │   ├── ComparisonChart.tsx    # Bar chart
│   │   ├── DistrictTable.tsx      # Data table
│   │   ├── CountUp.tsx            # Animated counter
│   │   └── ToastContainer.tsx     # Notifications
│   ├── context/
│   │   └── OptimizationContext.tsx # Global state
│   └── types/index.ts             # TypeScript interfaces
├── data/                          # Raw data + combiner scripts
├── docs/                          # Professional documentation
└── LoRA/                          # Fine-tuning experiments
```

## Running Locally

```bash
# Terminal 1: Backend
cd backend
uv run python main.py serve       # Starts on port 8000

# Terminal 2: Frontend
cd frontend
npm install && npm run dev         # Starts on port 3000
```

Environment variables needed:
- `backend/.env`: `GEMINI_API_KEY=your_key_here`
- `frontend/.env.local`: `NEXT_PUBLIC_API_URL=http://localhost:8000`

## Key Design Decisions

1. **Pure-NumPy QAOA** instead of Qiskit: Avoids heavy dependencies,
   runs on any machine in <2s, and we control every quantum operation
2. **8 qubits**: Sweet spot between speed (256 states) and expressiveness.
   More qubits are exponentially slower on classical hardware
3. **3× weight boost**: QAOA only selects a subset; the 3× multiplier
   ensures quantum-identified districts get meaningfully more funding
   while every district still gets something
4. **Debounced optimization**: 400ms delay prevents re-running QAOA on
   every slider tick, keeping the UI responsive
5. **rgb() colors**: Tailwind v4 emits lab() for hex colors, which
   html2canvas can't parse. Using rgb() avoids the issue
6. **No database**: The dataset is static (648 districts). A CSV + in-memory
   pandas DataFrame is faster and simpler than a database
