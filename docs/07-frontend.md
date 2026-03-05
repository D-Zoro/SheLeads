# 07 — Frontend

## Overview

The frontend is a Next.js 16 application with a dark "mission control"
aesthetic built with Tailwind CSS v4. It provides real-time visualization
of quantum-optimized budget allocations.

## Tech Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 16.1.6 | React framework |
| React | 19.2.3 | UI library |
| Tailwind CSS | v4 | Styling (with @theme inline) |
| recharts | 3.7.0 | Bar charts |
| react-simple-maps | 3.0.0 | India map (GeoJSON) |
| jsPDF | 4.2.0 | PDF generation |
| html2canvas | 1.4.1 | DOM-to-image for PDF |

## Page Routes

| Route | File | Description |
|-------|------|-------------|
| `/` | `app/page.tsx` | Main optimizer dashboard |
| `/about` | `app/about/page.tsx` | About page with animated sections |

## Components

### `IndiaMap.tsx`
- Renders a GeoJSON map of Indian states
- Colors states by average literacy gap (red → green)
- Click a state to add/remove it from the filter
- Tooltip shows aggregated district-level metrics
- Handles name mismatches (Maharashtra/Maharastra, Delhi/NCT of Delhi)

### `ComparisonChart.tsx`
- Top 10 districts bar chart: Quantum vs Greedy allocation
- QAOA-boosted districts highlighted in cyan
- Summary cards: QAOA Impact, Greedy Impact, Quantum Advantage %

### `DistrictTable.tsx`
- Full 648-district table with 7 columns
- Sortable, searchable, paginated (15 per page)
- QAOA-boosted rows have subtle blue background

### `CountUp.tsx`
- Animated number counter with spring easing
- Used by stat cards for dynamic data display

### `ToastContainer.tsx`
- Toast notifications for success/error/info messages
- Auto-dismiss after 4 seconds

## Context (State Management)

`OptimizationContext.tsx` provides global state:

- **budget** — Current budget slider value (100-2000, step 50)
- **districts** — Full 648-district dataset
- **selectedStates / selectedDistricts** — Geographic filters
- **optimizationResult** — Latest QAOA vs Greedy results
- **generateReport()** — Calls `/generate-report` endpoint

Optimization runs automatically with 400ms debounce on budget/filter changes.

## Theme

The theme uses `@theme inline` in `globals.css` with custom colors:

| Token | Value | Usage |
|-------|-------|-------|
| `neo-bg` | rgb(10, 15, 30) | Page background |
| `neo-card` | rgb(19, 25, 41) | Card background |
| `neo-border` | rgb(30, 41, 59) | Borders |
| `neo-blue` | rgb(59, 130, 246) | Primary accent |
| `neo-cyan` | rgb(34, 211, 238) | QAOA highlight |
| `neo-green` | rgb(34, 197, 94) | Positive values |
| `neo-red` | rgb(239, 68, 68) | Negative/priority |
| `neo-amber` | rgb(245, 158, 11) | Greedy/warning |

Colors use `rgb()` format to prevent Tailwind v4 from emitting `lab()` color
functions that html2canvas cannot parse.

## Fonts

- **Space Grotesk** — Headings (`--font-heading`)
- **IBM Plex Mono** — Data/numbers (`--font-data`)

## PDF Generation

The "Download PDF" button:
1. Captures stat cards and map/chart sections as PNG via html2canvas
2. Renders the LLM report text with markdown heading parsing
3. Adds page numbers and footer
4. Exports as A4 PDF via jsPDF

## CSS Animations

- `grid-drift` — Moving grid background
- `district-pulse` — Pulsing effect on QAOA-boosted map states
- `pulse-green` — Green dot indicator
- `shimmer` — Skeleton loading effect
- `toast-in/out` — Toast slide animations
