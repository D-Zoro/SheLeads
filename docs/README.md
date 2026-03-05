# Leadher Documentation

Professional documentation for the Leadher Quantum Women's Empowerment Optimizer.

## Table of Contents

1. [Dataset Collection](01-dataset-collection.md) — Sources, download procedures, raw format
2. [Data Cleaning & Pipeline](02-data-cleaning.md) — Standardization, imputation, merge strategy
3. [Feature Engineering](03-feature-engineering.md) — Computed features and rationale
4. [Machine Learning Model](04-ml-model.md) — Random Forest training, evaluation, usage
5. [Quantum Optimizer (QAOA)](05-quantum-optimizer.md) — Circuit design, cost Hamiltonian, simulation
6. [API Architecture](06-api-architecture.md) — FastAPI endpoints, request/response schemas
7. [Frontend](07-frontend.md) — Next.js dashboard, components, theming

## Quick Start

```bash
# Backend
cd backend
uv run python main.py serve

# Frontend
cd frontend
npm run dev
```
