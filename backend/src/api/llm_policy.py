"""
llm_policy.py — LLM-powered Policy Brief Generator for NeoPolicy

Uses Google Gemini 2.5 Flash to generate professional government-style
policy briefs that justify quantum-optimized budget allocations.
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


def generate_policy_brief(
    optimization_result: dict,
    district_name: str,
    district_data: dict,
) -> str:
    """
    Generate a professional policy brief for one district.

    Parameters
    ----------
    optimization_result : dict
        Output from run_qaoa_optimization(), containing qaoa_allocation etc.
    district_name : str
        Name of the district to generate the brief for.
    district_data : dict
        Feature dict for the district (literacy_gap, agency_score, etc.)

    Returns
    -------
    str — The generated policy brief text.
    """

    # How much QAOA allocated to this district (0 if not selected)
    qaoa_amount = optimization_result["qaoa_allocation"].get(district_name, 0)
    current_spent = district_data.get("total_spent_cr", 0) or 0
    delta = qaoa_amount - current_spent
    direction = "increase" if delta >= 0 else "decrease"

    prompt = f"""You are a senior policy analyst for the Government of India.
Based on the MGNREGA quantum optimization analysis:

District: {district_name}
Literacy Gap: {district_data.get('literacy_gap', 'N/A')}%
Employment Gap: {district_data.get('employment_gap', 'N/A')}%
Agency Score: {district_data.get('agency_score', 'N/A'):.4f}
Current Spending: {current_spent:.2f} Cr
Quantum Optimized Allocation: {qaoa_amount} Cr
Change from current: {abs(delta):.2f} Cr ({direction})

Write a 3-paragraph professional policy brief justifying this \
allocation decision. Paragraph 1: current situation. \
Paragraph 2: why this allocation amount. \
Paragraph 3: expected outcomes with specific predicted metrics.
Be specific, cite the numbers, use formal government language."""

    client = _get_client()
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
    )

    return response.text
