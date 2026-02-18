---
id: model-comparison-matrix-2026-02-18
date: 2026-02-18
title: "AI Model Showdown: SWE-bench, Tool Use & Cost Comparison (Feb 2026)"
summary: "Head-to-head comparison of GLM-5, Kimi K2.5, MiniMax M2.5, Claude Opus 4.5/4.6, GPT-5.2, Gemini 3, and DeepSeek V3.2 across coding benchmarks, tool use, and API pricing."
---

## The Frontier Model Matrix — February 2026

The AI landscape just got its biggest shakeup in months. On February 17, 2026, SWE-bench published a massive batch of new results using **mini-SWE-agent v2.0** as a standardized scaffold — finally giving us apples-to-apples comparisons across every major frontier model. Combined with Kimi K2.5's benchmark claims and real-world API pricing, here's where things actually stand.

---

## SWE-bench Verified — Coding Performance

The Verified leaderboard (500 human-filtered instances) shows how well each model resolves real GitHub issues:

| Model | SWE-bench Verified (%) | SWE-bench Bash Only (%) | Avg Cost/Task | Date |
|-------|----------------------|------------------------|---------------|------|
| **Claude 4.5 Opus** (high reasoning) | **76.80** 🥇 | **76.80** 🥇 | **$0.75** | 2026-02-17 |
| **Gemini 3 Flash** (high reasoning) | 75.80 | 75.80 | $0.36 | 2026-02-17 |
| **MiniMax M2.5** (high reasoning) | 75.80 | 75.80 | **$0.07** 💰 | 2026-02-17 |
| **Claude Opus 4.6** | 75.60 | 75.60 | $0.55 | 2026-02-17 |
| **GLM-5** (high reasoning) | 72.80 | 72.80 | $0.53 | 2026-02-17 |
| **GPT-5.2** (high reasoning) | 72.80 | 72.80 | $0.47 | 2026-02-17 |
| **Claude 4.5 Sonnet** (high reasoning) | 71.40 | 71.40 | $0.66 | 2026-02-17 |
| **Kimi K2.5** (high reasoning) | 70.80 | 70.80 | **$0.15** 💰 | 2026-02-17 |
| **DeepSeek V3.2** (high reasoning) | 70.00 | 70.00 | $0.45 | 2026-02-17 |
| **Claude 4.5 Haiku** (high reasoning) | 66.60 | 66.60 | $0.33 | 2026-02-17 |
| **GPT-5 Mini** | 56.20 | 56.20 | $0.05 | 2026-02-17 |

*All results use mini-SWE-agent v2.0 as a standardized scaffold. Cost is average per task solved.*

### Key Takeaways

**Claude 4.5 Opus leads** at 76.80% — but it's also the most expensive at $0.75/task. Meanwhile, **MiniMax M2.5** ties for second at 75.80% while costing just **$0.07/task** — over 10x cheaper than Opus for nearly identical performance. That's the real story here.

**Gemini 3 Flash** matches MiniMax's score at a moderate $0.36/task, making it the strongest "balanced" option.

**GPT-5.2** lands in the middle of the pack at 72.80% — tied with GLM-5 but more expensive than several models that outperform it.

**Kimi K2.5** at 70.80% for just $0.15/task offers compelling value for budget-conscious teams, though it trails the leaders by ~6 points.

---

## Kimi K2.5 Self-Reported Benchmarks

Kimi K2.5's own benchmark claims (from their January 27 launch post, 2.3M views) paint a more aggressive picture, especially on agentic tasks:

| Benchmark | Kimi K2.5 | GPT-5.2 (xhigh) | Claude Opus 4.5 | Gemini 3 Pro |
|-----------|-----------|------------------|------------------|--------------|
| Humanity's Last Exam | **50.2** | 45.5 | 43.2 | 45.8 |
| BrowseComp | **74.9** | 65.8 | 57.8 | 59.2 |
| DeepSearchQA | **77.1** | 71.3 | 76.1 | 63.2 |
| SWE-bench Verified | 76.8 | 80.0 | **80.9** | 76.2 |
| SWE-bench Multilingual | 73.0 | 72.0 | **77.5** | 65.8 |

*Note: Self-reported scores differ from standardized SWE-bench results above. Kimi's SWE-bench scores use their own agent scaffold, not mini-SWE-agent.*

![Kimi K2.5 benchmark scores](/weekly-screenshots/2026.02.18/kimi-k25-benchmark-scores.jpg)

The divergence is instructive. On **standardized** SWE-bench (mini-SWE-agent), Kimi K2.5 scores 70.80%. On their **own agent**, they claim 76.8%. This gap highlights why scaffold matters — and why the SWE-bench Bash Only leaderboard (standardized agent) is so valuable.

---

## API Pricing Comparison

Cost per million tokens across frontier models:

| Model | Input $/M | Output $/M | Cached Input $/M | Notes |
|-------|-----------|------------|-------------------|-------|
| **GPT-5 Mini** | ~$0.15 | ~$0.60 | — | Cheapest overall |
| **MiniMax M2.5** | ~$0.10 | ~$0.30 | — | Extraordinary value |
| **Kimi K2.5** | **$0.60** | **$3.00** | **$0.10** | 47-62% cheaper than K2 |
| **Claude 4.5 Haiku** | $1.00 | $5.00 | $0.10 | Budget Anthropic |
| **DeepSeek V3.2** | $0.27 | $1.10 | $0.07 | Strong budget option |
| **Gemini 3 Flash** | $0.15 | $0.60 | $0.04 | Google's value play |
| **Claude 4.5 Sonnet** | $3.00 | $15.00 | $0.30 | Mid-tier Anthropic |
| **GLM-5** | ~$0.50 | ~$2.00 | — | Zhipu AI |
| **GPT-5.2** | $2.50 | $10.00 | $1.25 | OpenAI flagship |
| **Claude Opus 4.6** | $15.00 | $75.00 | $1.50 | Most expensive |
| **Claude 4.5 Opus** | $15.00 | $75.00 | $1.50 | Highest SWE-bench |

*Pricing approximate; varies by tier, volume, and reasoning mode.*

![Kimi K2.5 API pricing](/weekly-screenshots/2026.02.18/kimi-k25-api-pricing.jpg)

---

## The Cost-Performance Sweet Spot

Here's the real decision matrix — **performance per dollar**:

| Model | SWE-bench % | Cost/Task | Performance/$ | Verdict |
|-------|------------|-----------|---------------|---------|
| MiniMax M2.5 | 75.80 | $0.07 | ⭐⭐⭐⭐⭐ | **Best bang for buck** |
| Kimi K2.5 | 70.80 | $0.15 | ⭐⭐⭐⭐ | Great value, 5pts behind |
| Gemini 3 Flash | 75.80 | $0.36 | ⭐⭐⭐⭐ | Balanced choice |
| GPT-5 Mini | 56.20 | $0.05 | ⭐⭐⭐ | Cheap but limited |
| GPT-5.2 | 72.80 | $0.47 | ⭐⭐⭐ | Overpriced for performance |
| DeepSeek V3.2 | 70.00 | $0.45 | ⭐⭐⭐ | Decent but not standout |
| Claude 4.5 Haiku | 66.60 | $0.33 | ⭐⭐⭐ | Good for light tasks |
| GLM-5 | 72.80 | $0.53 | ⭐⭐⭐ | Solid middle ground |
| Claude Opus 4.6 | 75.60 | $0.55 | ⭐⭐⭐ | Premium quality |
| Claude 4.5 Sonnet | 71.40 | $0.66 | ⭐⭐ | Pricey for its tier |
| Claude 4.5 Opus | 76.80 | $0.75 | ⭐⭐ | Best quality, highest cost |

---

## Tool Usage & Agent Capabilities

Beyond raw coding benchmarks, agentic tool use — browsing, search, multi-step reasoning — tells a different story:

| Capability | Best Model | Score | Runner-up |
|-----------|-----------|-------|-----------|
| **BrowseComp** (web browsing) | Kimi K2.5 | 74.9 | GPT-5.2 (65.8) |
| **DeepSearchQA** (deep search) | Kimi K2.5 | 77.1 | Claude Opus 4.5 (76.1) |
| **Humanity's Last Exam** | Kimi K2.5 | 50.2 | Gemini 3 Pro (45.8) |
| **SWE-bench Verified** (coding) | Claude 4.5 Opus | 76.80 | Gemini 3 Flash / MiniMax M2.5 (75.80) |
| **VideoMMU** (video understanding) | Kimi K2.5 | Leading | — |

Kimi K2.5 dominates agentic benchmarks while Claude leads coding. The two have very different strengths.

---

## METR: How Long Can LLMs Work Autonomously?

![METR benchmark — 80% success](/weekly-screenshots/2026.02.18/metr-llm-task-duration-80-percent.jpg)

![METR benchmark — 50% success](/weekly-screenshots/2026.02.18/metr-llm-task-duration-50-percent.jpg)

METR's time-horizon benchmarks show that frontier models can now autonomously complete tasks that take humans **1 hour** (at 80% success) to **7 hours** (at 50% success). The capability is doubling roughly every 7-8 months.

---

## Bottom Line for Developers

**If you want the absolute best coding agent:** Claude 4.5 Opus (76.80%) — but be prepared to pay for it.

**If you want near-best at a fraction of the cost:** MiniMax M2.5 (75.80% at $0.07/task) is the revelation here. Nearly matches Opus for ~10% of the price.

**If you're building agentic workflows (search, browsing, multi-step):** Kimi K2.5 leads on every agentic benchmark, and at $0.15/task it's affordable to experiment.

**If you want Google's ecosystem:** Gemini 3 Flash (75.80%) delivers top-tier performance at moderate cost.

**If you're budget-constrained:** GPT-5 Mini at $0.05/task handles basic tasks, but drops to 56.20% — a significant quality trade-off.

**The models that feel overpriced right now:** GPT-5.2 ($0.47 for 72.80%) and Claude 4.5 Sonnet ($0.66 for 71.40%) are caught in an awkward middle — beaten on both price AND performance by newer competitors.

---

*Data sources: SWE-bench Official Leaderboard (Feb 17, 2026), Kimi K2.5 launch benchmarks (Jan 27, 2026), METR benchmarks, public API pricing pages. All SWE-bench standardized results use mini-SWE-agent v2.0.*
