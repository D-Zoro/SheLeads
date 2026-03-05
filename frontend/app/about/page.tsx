"use client";

import { useEffect, useRef, useState } from "react";

/* ── Fade-in on scroll hook ───────────────────────────────────── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return { ref, visible };
}

/* ── Animated counter ─────────────────────────────────────────── */
function AnimNum({ value, suffix = "", prefix = "" }: { value: number; suffix?: string; prefix?: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          let frame = 0;
          const total = 50;
          const tick = () => {
            frame++;
            const progress = frame / total;
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplay(Math.round(eased * value));
            if (frame < total) requestAnimationFrame(tick);
          };
          tick();
        }
      },
      { threshold: 0.5 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [value]);

  return (
    <span ref={ref} className="font-[var(--font-data)] font-bold">
      {prefix}{display}{suffix}
    </span>
  );
}

/* ── Section wrapper with reveal animation ────────────────────── */
function Section({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ── Mini bar for inline visualization ────────────────────────── */
function MiniBar({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  const { ref, visible } = useReveal();
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div ref={ref} className="flex items-center gap-3">
      <span className="text-[10px] text-neo-text-dim w-24 text-right shrink-0">{label}</span>
      <div className="flex-1 h-4 bg-neo-bg/50 rounded-full overflow-hidden border border-neo-border/30">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: visible ? `${pct}%` : "0%",
            background: color,
            boxShadow: `0 0 8px ${color}40`,
          }}
        />
      </div>
      <span className="text-[10px] font-[var(--font-data)] text-neo-text w-12">{value}%</span>
    </div>
  );
}

/* ── Flowchart node ───────────────────────────────────────────── */
function FlowNode({
  icon,
  title,
  sub,
  color,
  delay,
  showArrow = true,
}: {
  icon: string;
  title: string;
  sub: string;
  color: string;
  delay: number;
  showArrow?: boolean;
}) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      className={`flex flex-col items-center transition-all duration-600 ease-out ${
        visible ? "opacity-100 scale-100" : "opacity-0 scale-75"
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div
        className="w-16 h-16 rounded-xl border-2 flex items-center justify-center text-2xl mb-2 relative"
        style={{ borderColor: color, background: `${color}15` }}
      >
        {icon}
        <div
          className="absolute -inset-1 rounded-xl opacity-20 blur-md"
          style={{ background: color }}
        />
      </div>
      <p className="text-[11px] font-bold text-neo-text text-center leading-tight">{title}</p>
      <p className="text-[9px] text-neo-text-dim text-center mt-0.5">{sub}</p>
      {showArrow && (
        <div className="mt-2 text-neo-text-dim text-lg hidden md:block">→</div>
      )}
    </div>
  );
}

export default function AboutPage() {
  return (
    <>
      {/* ── Header ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-neo-bg/90 backdrop-blur-md border-b border-neo-border">
        <div className="max-w-[1200px] mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="group">
            <h1 className="text-2xl font-bold font-[var(--font-heading)] text-neo-text group-hover:text-neo-blue transition-colors">
              LEADHER
            </h1>
          </a>
          <div className="flex items-center gap-5">
            <a
              href="/"
              className="text-xs uppercase tracking-wider text-neo-text-dim hover:text-neo-blue transition-colors"
            >
              Dashboard
            </a>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-neo-green pulse-green" />
              <span className="text-[11px] uppercase tracking-wider text-neo-green font-medium">
                Active
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-6 pb-20">
        {/* ═══════════════════════════════════════════════════════
            HERO
            ═══════════════════════════════════════════════════════ */}
        <section className="py-24 text-center">
          <Section>
            <p className="text-xs uppercase tracking-[0.3em] text-neo-cyan mb-4">
              She Leads — Hackathon 2025
            </p>
            <h1 className="text-5xl md:text-6xl font-bold font-[var(--font-heading)] text-neo-text leading-tight mb-6">
              <span className="text-neo-blue">Quantum</span>-Powered{" "}
              <br className="hidden md:block" />
              Women&apos;s Empowerment
            </h1>
            <p className="text-base text-neo-text-dim max-w-2xl mx-auto leading-relaxed mb-8">
              Leadher uses quantum optimization (QAOA) and machine learning to find
              the <strong className="text-neo-text">mathematically optimal</strong> budget
              allocation for women&apos;s empowerment across 648 Indian districts.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a
                href="/"
                className="px-6 py-3 bg-neo-blue/20 border border-neo-blue/40 rounded-lg text-neo-blue text-sm font-medium hover:bg-neo-blue/30 transition-all"
              >
                Launch Dashboard
              </a>
              <a
                href="#pipeline"
                className="px-6 py-3 bg-neo-card border border-neo-border rounded-lg text-neo-text-dim text-sm font-medium hover:border-neo-blue/40 hover:text-neo-text transition-all"
              >
                How It Works ↓
              </a>
            </div>
          </Section>
        </section>

        {/* ═══════════════════════════════════════════════════════
            THE PROBLEM — stats + mini bars
            ═══════════════════════════════════════════════════════ */}
        <section className="py-16 border-t border-neo-border/30">
          <Section>
            <p className="text-[10px] uppercase tracking-[0.2em] text-neo-red mb-2">
              The Challenge
            </p>
            <h2 className="text-3xl font-bold font-[var(--font-heading)] text-neo-text mb-4">
              India&apos;s empowerment gap is a ₹multi-trillion misallocation
            </h2>
            <p className="text-sm text-neo-text-dim leading-relaxed max-w-3xl mb-8">
              MGNREGA spends thousands of crores annually but lacks data-driven
              targeting. Districts with the highest literacy gaps, lowest women&apos;s
              employment, and weakest financial agency often receive proportionally
              less funding.
            </p>
          </Section>

          {/* Big stat cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
            <Section delay={0}>
              <div className="glow-card px-5 py-5 text-center">
                <p className="text-4xl text-neo-red mb-2">
                  <AnimNum value={648} />
                </p>
                <p className="text-[10px] text-neo-text-dim uppercase tracking-wider">
                  Districts competing
                </p>
              </div>
            </Section>
            <Section delay={100}>
              <div className="glow-card px-5 py-5 text-center">
                <p className="text-4xl text-neo-amber mb-2">
                  <AnimNum value={35} suffix="%" />
                </p>
                <p className="text-[10px] text-neo-text-dim uppercase tracking-wider">
                  Avg literacy gap (worst)
                </p>
              </div>
            </Section>
            <Section delay={200}>
              <div className="glow-card px-5 py-5 text-center">
                <p className="text-4xl text-neo-cyan mb-2">
                  2<sup className="text-lg">648</sup>
                </p>
                <p className="text-[10px] text-neo-text-dim uppercase tracking-wider">
                  Possible combinations
                </p>
              </div>
            </Section>
            <Section delay={300}>
              <div className="glow-card px-5 py-5 text-center">
                <p className="text-4xl text-neo-green mb-2">
                  <AnimNum value={78} suffix="%" />
                </p>
                <p className="text-[10px] text-neo-text-dim uppercase tracking-wider">
                  Model accuracy (R²)
                </p>
              </div>
            </Section>
          </div>

          {/* Mini bar visualization — example gaps */}
          <Section delay={200}>
            <div className="glow-card p-6">
              <h3 className="text-xs uppercase tracking-wider text-neo-text-dim mb-4">
                Sample: Gender Gap Distribution Across Districts
              </h3>
              <div className="space-y-2.5">
                <MiniBar value={42} max={100} color="#ef4444" label="Literacy Gap" />
                <MiniBar value={55} max={100} color="#f59e0b" label="Employment Gap" />
                <MiniBar value={28} max={100} color="#8b5cf6" label="Financial Excl." />
                <MiniBar value={65} max={100} color="#06b6d4" label="Low Agency" />
              </div>
              <p className="text-[9px] text-neo-text-dim mt-3">
                * Illustrative averages from worst-performing 50 districts (NFHS-5 data)
              </p>
            </div>
          </Section>
        </section>

        {/* ═══════════════════════════════════════════════════════
            DATA SOURCES — three cards
            ═══════════════════════════════════════════════════════ */}
        <section className="py-16 border-t border-neo-border/30">
          <Section>
            <p className="text-[10px] uppercase tracking-[0.2em] text-neo-amber mb-2">
              Our Data
            </p>
            <h2 className="text-3xl font-bold font-[var(--font-heading)] text-neo-text mb-6">
              Three national datasets, merged at district level
            </h2>
          </Section>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            {[
              {
                icon: "📊",
                color: "#3b82f6",
                title: "NFHS-5 Health Survey",
                desc: "Literacy rates, employment status, financial inclusion, decision-making autonomy across 648 districts.",
                stat: "648",
                statLabel: "districts",
              },
              {
                icon: "💰",
                color: "#f59e0b",
                title: "MGNREGA Employment",
                desc: "Women's wage estimates, total spent per district, employment person-days, unutilized balance.",
                stat: "₹2L+",
                statLabel: "Cr processed",
              },
              {
                icon: "🏦",
                color: "#22c55e",
                title: "Financial Inclusion",
                desc: "Women's bank account ownership, joint account access, and agency scores from financial autonomy.",
                stat: "6",
                statLabel: "features",
              },
            ].map((d, i) => (
              <Section key={d.title} delay={i * 150}>
                <div className="glow-card px-5 py-5 h-full flex flex-col group hover:border-neo-blue/40 transition-all">
                  <span className="text-3xl mb-3">{d.icon}</span>
                  <h3 className="text-sm font-bold text-neo-text mb-1">{d.title}</h3>
                  <p className="text-xs text-neo-text-dim leading-relaxed flex-1">{d.desc}</p>
                  <div className="mt-3 pt-3 border-t border-neo-border/30 flex items-center gap-2">
                    <span className="text-lg font-[var(--font-data)] font-bold" style={{ color: d.color }}>
                      {d.stat}
                    </span>
                    <span className="text-[9px] text-neo-text-dim uppercase">{d.statLabel}</span>
                  </div>
                </div>
              </Section>
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            DATA FLOW PIPELINE — visual flowchart
            ═══════════════════════════════════════════════════════ */}
        <section id="pipeline" className="py-16 border-t border-neo-border/30">
          <Section>
            <p className="text-[10px] uppercase tracking-[0.2em] text-neo-blue mb-2">
              Data Pipeline
            </p>
            <h2 className="text-3xl font-bold font-[var(--font-heading)] text-neo-text mb-2">
              End-to-end data flow
            </h2>
            <p className="text-sm text-neo-text-dim mb-10">
              From raw CSVs to quantum-optimal budget allocation in 7 stages
            </p>
          </Section>

          {/* ── Horizontal flowchart ──────────────────────────── */}
          <div className="glow-card p-6 overflow-x-auto mb-8">
            <div className="flex items-start gap-2 md:gap-4 min-w-[700px] justify-between">
              <FlowNode icon="📂" title="Raw CSVs" sub="3 datasets" color="#94a3b8" delay={0} />
              <FlowNode icon="🧹" title="Clean & Merge" sub="648 districts" color="#3b82f6" delay={80} />
              <FlowNode icon="⚙️" title="Feature Eng." sub="6 features" color="#f59e0b" delay={160} />
              <FlowNode icon="🌳" title="RF Model" sub="R² = 0.78" color="#22c55e" delay={240} />
              <FlowNode icon="⚛️" title="QAOA" sub="8 qubits" color="#8b5cf6" delay={320} />
              <FlowNode icon="💸" title="Allocate" sub="₹ per district" color="#06b6d4" delay={400} />
              <FlowNode icon="📋" title="AI Report" sub="Gemini 2.5" color="#ec4899" delay={480} showArrow={false} />
            </div>
          </div>

          {/* ── Detailed pipeline steps ───────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                step: "01",
                title: "Data Ingestion & Cleaning",
                desc: "Three CSV datasets (NFHS-5, MGNREGA, Financial Inclusion) are cleaned, standardized to 648 matching districts, and merged on district+state keys.",
                color: "#3b82f6",
                detail: "Missing values imputed with column medians. Duplicate districts resolved by state-level matching.",
              },
              {
                step: "02",
                title: "Feature Engineering",
                desc: "Six features computed per district: literacy_gap, employment_gap, total_spent_cr, women_wage_est, unutilized_bal, agency_score.",
                color: "#f59e0b",
                detail: "Agency score = composite of bank account ownership + decision-making autonomy indicators.",
              },
              {
                step: "03",
                title: "Random Forest Impact Model",
                desc: "An RF regressor learns spending → impact relationship. R² = 0.78 on held-out test set.",
                color: "#22c55e",
                detail: "Target: impact_score = (1 − literacy_gap/100) × agency_score × women_wage_est",
              },
              {
                step: "04",
                title: "Impact Gradient Computation",
                desc: "For each district, compute marginal impact: how much does predicted impact increase per ₹10 Cr added?",
                color: "#06b6d4",
                detail: "The gradient drives both quantum and greedy allocation strategies.",
              },
              {
                step: "05",
                title: "QAOA Quantum Optimization",
                desc: "Top 8 districts encoded into 8 qubits. QAOA explores 256 basis states via superposition to find the optimal subset.",
                color: "#8b5cf6",
                detail: "COBYLA optimizes variational angles. Budget constraint via quadratic penalty Hamiltonian.",
              },
              {
                step: "06",
                title: "Full Budget Allocation",
                desc: "QAOA-selected districts get 3x weight. Full budget distributed proportionally. Greedy baseline computed for comparison.",
                color: "#ec4899",
                detail: "Greedy = fund by raw literacy gap descending. Quantum = fund by multi-factor optimal subset.",
              },
            ].map((s, i) => (
              <Section key={s.step} delay={i * 80}>
                <div className="glow-card px-5 py-4 relative overflow-hidden group hover:border-neo-blue/50 transition-all h-full">
                  <div className="absolute top-0 left-0 w-1 h-full" style={{ background: s.color }} />
                  <div className="flex items-start gap-3 ml-2">
                    <span
                      className="text-xl font-[var(--font-data)] font-bold opacity-30 shrink-0"
                      style={{ color: s.color }}
                    >
                      {s.step}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-neo-text mb-1">{s.title}</h3>
                      <p className="text-xs text-neo-text-dim leading-relaxed">{s.desc}</p>
                      <p className="text-[10px] text-neo-text-dim/60 mt-1.5 italic">{s.detail}</p>
                    </div>
                  </div>
                </div>
              </Section>
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            BEFORE / AFTER — visual comparison
            ═══════════════════════════════════════════════════════ */}
        <section className="py-16 border-t border-neo-border/30">
          <Section>
            <p className="text-[10px] uppercase tracking-[0.2em] text-neo-green mb-2">
              The Result
            </p>
            <h2 className="text-3xl font-bold font-[var(--font-heading)] text-neo-text mb-6">
              Greedy vs Quantum — What changes?
            </h2>
          </Section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
            {/* Greedy / Before */}
            <Section delay={0}>
              <div className="glow-card px-6 py-6 border-neo-amber/30 h-full">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-3 h-3 rounded-full bg-neo-amber" />
                  <h3 className="text-sm font-bold text-neo-amber uppercase tracking-wider">
                    Greedy (Classical)
                  </h3>
                </div>

                <div className="space-y-4 text-xs text-neo-text-dim">
                  <div className="flex items-center gap-3">
                    <span className="text-neo-red text-base">✕</span>
                    <span>Ranks by single metric (literacy gap)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-neo-red text-base">✕</span>
                    <span>Funds districts one-by-one until budget exhausted</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-neo-red text-base">✕</span>
                    <span>Ignores synergies and diminishing returns</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-neo-red text-base">✕</span>
                    <span>Cannot capture non-linear feature interactions</span>
                  </div>
                </div>

                {/* Mini visual: linear allocation */}
                <div className="mt-5 pt-4 border-t border-neo-border/30">
                  <p className="text-[9px] uppercase text-neo-text-dim mb-2">Allocation Pattern</p>
                  <div className="flex gap-1 h-12 items-end">
                    {[90, 75, 60, 50, 40, 30, 20, 15, 10, 5].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t-sm bg-neo-amber/60"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                  <p className="text-[8px] text-neo-text-dim mt-1">Linear decay — top districts get most, tail gets nothing</p>
                </div>
              </div>
            </Section>

            {/* Quantum / After */}
            <Section delay={150}>
              <div className="glow-card px-6 py-6 border-neo-blue/30 h-full">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-3 h-3 rounded-full bg-neo-blue" />
                  <h3 className="text-sm font-bold text-neo-blue uppercase tracking-wider">
                    QAOA (Quantum)
                  </h3>
                </div>

                <div className="space-y-4 text-xs text-neo-text-dim">
                  <div className="flex items-center gap-3">
                    <span className="text-neo-green text-base">✓</span>
                    <span>Evaluates all 2^N combos via superposition</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-neo-green text-base">✓</span>
                    <span>Uses RF-predicted impact gradients as objective</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-neo-green text-base">✓</span>
                    <span>Budget constraint via quadratic penalty Hamiltonian</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-neo-green text-base">✓</span>
                    <span>Finds globally optimal subset, not locally greedy</span>
                  </div>
                </div>

                {/* Mini visual: quantum-boosted allocation */}
                <div className="mt-5 pt-4 border-t border-neo-border/30">
                  <p className="text-[9px] uppercase text-neo-text-dim mb-2">Allocation Pattern</p>
                  <div className="flex gap-1 h-12 items-end">
                    {[85, 82, 70, 65, 60, 55, 40, 35, 30, 25].map((h, i) => (
                      <div
                        key={i}
                        className={`flex-1 rounded-t-sm ${i < 3 ? "bg-neo-cyan" : "bg-neo-blue/60"}`}
                        style={{ height: `${h}%`, boxShadow: i < 3 ? "0 0 6px #06b6d440" : "none" }}
                      />
                    ))}
                  </div>
                  <p className="text-[8px] text-neo-text-dim mt-1">Balanced spread — priority districts (cyan) get 3x boost</p>
                </div>
              </div>
            </Section>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            IMPACT FORMULA — visual breakdown
            ═══════════════════════════════════════════════════════ */}
        <section className="py-16 border-t border-neo-border/30">
          <Section>
            <p className="text-[10px] uppercase tracking-[0.2em] text-neo-cyan mb-2">
              The Math
            </p>
            <h2 className="text-3xl font-bold font-[var(--font-heading)] text-neo-text mb-6">
              How we measure impact
            </h2>
          </Section>

          <Section delay={100}>
            <div className="glow-card p-6 md:p-8">
              {/* Formula */}
              <div className="text-center mb-8">
                <p className="text-xs text-neo-text-dim mb-3 uppercase tracking-wider">Composite Impact Score</p>
                <div className="inline-flex items-center gap-3 bg-neo-bg/50 border border-neo-border rounded-xl px-6 py-4">
                  <span className="text-neo-blue font-[var(--font-data)] text-sm">(1 − literacy_gap/100)</span>
                  <span className="text-neo-text-dim">×</span>
                  <span className="text-neo-green font-[var(--font-data)] text-sm">agency_score</span>
                  <span className="text-neo-text-dim">×</span>
                  <span className="text-neo-amber font-[var(--font-data)] text-sm">women_wage_est</span>
                </div>
              </div>

              {/* Factor breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-neo-bg/30 border border-neo-blue/20 rounded-lg p-4 text-center">
                  <p className="text-2xl mb-1">📖</p>
                  <p className="text-sm font-bold text-neo-blue mb-1">Literacy Health</p>
                  <p className="text-[10px] text-neo-text-dim">
                    Higher literacy = higher score. Measures education parity between genders.
                  </p>
                </div>
                <div className="bg-neo-bg/30 border border-neo-green/20 rounded-lg p-4 text-center">
                  <p className="text-2xl mb-1">🏦</p>
                  <p className="text-sm font-bold text-neo-green mb-1">Financial Agency</p>
                  <p className="text-[10px] text-neo-text-dim">
                    Bank account ownership + decision-making autonomy. Measures economic independence.
                  </p>
                </div>
                <div className="bg-neo-bg/30 border border-neo-amber/20 rounded-lg p-4 text-center">
                  <p className="text-2xl mb-1">💰</p>
                  <p className="text-sm font-bold text-neo-amber mb-1">Wage Reach</p>
                  <p className="text-[10px] text-neo-text-dim">
                    Actual ₹ reaching women through MGNREGA. Measures funding effectiveness.
                  </p>
                </div>
              </div>
            </div>
          </Section>
        </section>

        {/* ═══════════════════════════════════════════════════════
            TECH STACK — with icons
            ═══════════════════════════════════════════════════════ */}
        <section className="py-16 border-t border-neo-border/30">
          <Section>
            <p className="text-[10px] uppercase tracking-[0.2em] text-neo-cyan mb-2">
              Technology
            </p>
            <h2 className="text-3xl font-bold font-[var(--font-heading)] text-neo-text mb-8">
              Built with
            </h2>
          </Section>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: "Next.js 16", desc: "Frontend framework", icon: "⚡", color: "#e2e8f0" },
              { name: "FastAPI", desc: "Backend API", icon: "🚀", color: "#22c55e" },
              { name: "NumPy QAOA", desc: "Quantum optimizer", icon: "⚛️", color: "#3b82f6" },
              { name: "scikit-learn", desc: "Random Forest", icon: "🌳", color: "#f59e0b" },
              { name: "Gemini 2.5", desc: "AI reports", icon: "🤖", color: "#06b6d4" },
              { name: "Recharts", desc: "Visualizations", icon: "📊", color: "#ec4899" },
              { name: "Tailwind v4", desc: "Styling", icon: "🎨", color: "#3b82f6" },
              { name: "jsPDF", desc: "PDF export", icon: "📄", color: "#22c55e" },
            ].map((tech, i) => (
              <Section key={tech.name} delay={i * 60}>
                <div className="glow-card px-4 py-4 text-center group hover:border-neo-blue/40 transition-all">
                  <span className="text-2xl block mb-2">{tech.icon}</span>
                  <p className="text-sm font-bold mb-0.5" style={{ color: tech.color }}>
                    {tech.name}
                  </p>
                  <p className="text-[10px] text-neo-text-dim">{tech.desc}</p>
                </div>
              </Section>
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            CTA
            ═══════════════════════════════════════════════════════ */}
        <section className="py-20 border-t border-neo-border/30 text-center">
          <Section>
            <h2 className="text-3xl font-bold font-[var(--font-heading)] text-neo-text mb-4">
              Ready to optimize?
            </h2>
            <p className="text-sm text-neo-text-dim mb-8 max-w-xl mx-auto">
              Open the dashboard, set your budget, and let quantum computing
              find the best allocation for women&apos;s empowerment.
            </p>
            <a
              href="/"
              className="inline-block px-8 py-3 bg-neo-blue/20 border border-neo-blue/40 rounded-lg text-neo-blue text-sm font-medium hover:bg-neo-blue/30 transition-all"
            >
              Open Dashboard
            </a>
          </Section>
        </section>
      </main>
    </>
  );
}
