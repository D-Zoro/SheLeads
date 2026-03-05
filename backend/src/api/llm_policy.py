"""
llm_policy.py — LLM-powered Policy Report Generator for Leadher

Uses Google Gemini 2.5 Flash to generate comprehensive policy reports
that analyse quantum-optimized budget allocations for women's empowerment.
"""

import os
from google import genai


# ── Gemini client (initialized lazily) ───────────────────────────────────
_client: genai.Client | None = None


def _get_client() -> genai.Client:
    """Lazy-init the Gemini client from the GEMINI_API_KEY env var."""
    global _client
    if _client is None:
        api_key = os.environ.get("GEMINI_API_KEY", "")
        if not api_key:
            raise RuntimeError(
                "GEMINI_API_KEY environment variable is not set. "
                "Get one at https://aistudio.google.com/apikey"
            )
        _client = genai.Client(api_key=api_key)
    return _client


def generate_report(
    optimization_result: dict,
    states_filter: list[str] | None = None,
    districts_filter: list[str] | None = None,
) -> str:
    """
    Generate a comprehensive policy report covering all optimized districts.

    Parameters
    ----------
    optimization_result : dict
        Output from run_qaoa_optimization().
    states_filter : list[str] | None
        States that were selected for filtering, or None for all-India.
    districts_filter : list[str] | None
        Districts that were selected for filtering, or None.

    Returns
    -------
    str — The generated policy report as Markdown text.
    """

    qaoa_alloc = optimization_result.get("qaoa_allocation", {})
    greedy_alloc = optimization_result.get("greedy_allocation", {})
    improvement = optimization_result.get("improvement_pct", 0)
    num_districts = optimization_result.get("num_districts", 0)
    budget = optimization_result.get("budget_cr", 0)
    qaoa_impact = optimization_result.get("qaoa_total_impact", 0)
    greedy_impact = optimization_result.get("greedy_total_impact", 0)

    # Predicted impact scores
    pred_baseline = optimization_result.get("predicted_impact_baseline", {})
    pred_quantum = optimization_result.get("predicted_impact_quantum", {})

    # Build top allocations summary
    top_qaoa = sorted(qaoa_alloc.items(), key=lambda x: x[1], reverse=True)[:15]
    qaoa_table = "\n".join(
        f"  {d}: Rs {amt} Cr (baseline impact: {pred_baseline.get(d, 'N/A')}, "
        f"after quantum: {pred_quantum.get(d, 'N/A')})"
        for d, amt in top_qaoa
    )

    # Scope description
    if districts_filter:
        scope = f"Selected districts: {', '.join(districts_filter)}"
    elif states_filter:
        scope = f"Selected states: {', '.join(states_filter)}"
    else:
        scope = "All-India (all 648 districts)"

    prompt = f"""You are a senior policy analyst for the Government of India, \
specialising in women's empowerment and MGNREGA budget allocation.

Generate a professional, comprehensive policy report in Markdown based on the \
following quantum-optimized budget allocation analysis by the Leadher platform.

--- ANALYSIS PARAMETERS ---
Scope: {scope}
Total Budget: Rs {budget} Crore
Districts Analysed: {num_districts}

--- QUANTUM VS GREEDY COMPARISON ---
Quantum (QAOA) Total Impact Score: {qaoa_impact:.6f}
Greedy Baseline Total Impact Score: {greedy_impact:.6f}
Quantum Advantage: {improvement:+.2f}%

--- TOP QUANTUM ALLOCATIONS ---
{qaoa_table}

--- REPORT STRUCTURE ---
Write the report with these sections:
1. **Executive Summary** — 2-3 sentences overview of the analysis scope, budget, and key finding.
2. **Methodology** — Brief explanation of quantum QAOA optimization vs greedy baseline using MGNREGA data (literacy gap, employment gap, agency score, women wage estimates).
3. **Key Findings** — Top 5 priority districts, why they were selected (cite specific metrics), quantum advantage explanation.
4. **Budget Allocation Recommendations** — Detailed allocation table with justification for each top district.
5. **Predicted Impact** — Expected improvements in literacy gap, employment, and women's agency from the quantum-optimized allocation vs baseline.
6. **Implementation Recommendations** — 3-4 actionable policy recommendations.

Use formal government language. Cite all numbers precisely. Keep the report concise but thorough (600-800 words).
Do NOT use any emojis."""

    client = _get_client()
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
    )

    return response.text


def parse_policy_text(policy_text: str, available_states: list[str]) -> dict:
    """
    Use Gemini to extract structured optimization parameters from a
    natural-language policy description.

    Parameters
    ----------
    policy_text : str
        Free-form policy description from the user.
    available_states : list[str]
        List of valid state names from the dataset.

    Returns
    -------
    dict with keys: budget (float|null), states (list[str]), districts (list[str])
    """
    client = _get_client()

    prompt = f"""You are a parameter extraction assistant for Leadher, a women's \
empowerment budget optimizer for India.

Given the user's policy description below, extract optimization parameters.

--- USER POLICY DESCRIPTION ---
{policy_text}

--- AVAILABLE STATES IN DATASET ---
{', '.join(available_states)}

--- EXTRACTION RULES ---
1. **budget**: Extract the numeric budget in Crores (Rs Cr). \
If they say "500 crore" → 500. If "200 million" → 20. If they say "2000 crore" → 2000. \
Clamp between 100 and 2000. If not mentioned, return null.
2. **states**: Extract any Indian states mentioned. Match them to the available states list above \
(fuzzy match — e.g. "UP" → "Uttar Pradesh", "MP" → "Madhya Pradesh", "Bihar" → "Bihar"). \
Return as a JSON array of exact state names from the available list. Empty array if none.
3. **districts**: Extract any specific district names mentioned. Return as a JSON array. Empty if none.

--- OUTPUT FORMAT ---
Return ONLY a raw JSON object (no markdown, no code fences) with exactly these keys:
{{"budget": <number or null>, "states": [...], "districts": [...]}}"""

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
    )

    # Parse the JSON from the response
    import json
    text = response.text.strip()
    # Strip markdown code fences if present
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()
    if text.startswith("json"):
        text = text[4:].strip()

    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        parsed = {"budget": None, "states": [], "districts": []}

    return {
        "budget": parsed.get("budget"),
        "states": parsed.get("states", []),
        "districts": parsed.get("districts", []),
    }
