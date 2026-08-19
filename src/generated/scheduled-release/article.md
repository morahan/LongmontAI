---
id: edition-2026-08-05-signal-routing
date: 2026-08-05
publishAt: 2026-08-05T11:15:00-06:00
status: scheduled
title: "Signal Routing: Models, Machines, and the Cost of Belief"
summary: "An August 5 briefing on the agentic model wave, open-weight competition, embodied AI and orbital compute, token-cost optimization, and the discipline of measuring claims before deploying them."
---

## Signal Routing

The last two weeks were not a single-model race. They were a routing problem.
Frontier and open-weight releases keep making capable coding and knowledge-work
agents cheaper. At the same time, models are absorbing video, audio, tools,
physical action, and robots. The result is a bigger choice set and a sharper
obligation: evaluate the whole system before a release announcement, a
purchasing decision, or an autonomous action becomes real.

This edition groups the supplied research by the decision it informs: model
selection, evidence and evaluation, the physical stack, efficiency, markets,
and governance. Screenshots of posts and vendor charts are labelled as supplied
claims — useful leads, not replacements for primary documentation or a
repeatable local test.

**In this edition:** the release board, evidence discipline, long-horizon
agents, two mathematical-research claims, robotics and orbital compute,
token-cost optimization, market signals, and a promotion checklist.

{{slideshow:signal-routing}}

## The release board: agentic work gets cheaper, more open, and more multimodal

| Rank | Release | Date | Why it matters in practice |
| --- | --- | --- | --- |
| 1 | Claude Opus 5 | Jul. 24 | Anthropic's everyday frontier tier for coding, knowledge work, and automation; vendor-reported near-Fable 5 quality at about half the price. |
| 2 | Qwen3.8-Max | Aug. 3 | Alibaba's 2.4T-parameter MoE flagship, with 95B active parameters, native vision, and a 1M-token context window. |
| 3 | DeepSeek-V4-Flash-0731 | Jul. 31 | A re-post-trained Flash API release focused on coding agents, tool use, Responses API compatibility, and Codex. |
| 4 | Kimi K3 full weights | Jul. 27 | A downloadable 2.8T-parameter MoE with 104B active parameters, vision/video understanding, and 1M context. |
| 5 | Gemini Robotics ER 2 | Jul. 30 | An embodied-reasoning layer for continuous video, planning, tool use, correction, and multi-robot work. |
| 6 | FLUX 3 | Jul. 23 | A unified image, video, audio, and action-prediction effort, with video and robotics entering early access. |
| 7 | MiniMax H3 | Jul. 31; weights Aug. 2 | A 33B omni-modal video model for text, image, video, and audio inputs, with 2K video and stereo sound claims. |
| 8 | Grok Voice Think Fast 2.0 | Jul. 29 | A real-time speech-to-speech update aimed at lower-latency conversational agents and more reliable tools. |
| 9 | Microsoft MAI-Cyber-1-Flash | Jul. 27 | A specialized vulnerability-finding model supporting Microsoft's MDASH remediation workflow. |
| 10 | Mistral Shieldstral | Aug. 4 | A 3B open-weight multimodal classifier for runtime, natural-language safety policies. |
| 11 | Meta AI with Muse Spark 1.1 | Jul. 24 | Meta extended Muse Spark 1.1 into planning, connected email and calendar work, slide creation, and recurring tasks. |
| 12 | Grok Build Workflows | Jul. 23 | xAI added background workflows that distribute work across parallel agents and report verified results. |

Two more updates belong on the watchlist: **Google Lyria 3.5** for more
controllable music generation, and **Grok Imagine Video 1.5** for 1080p video,
voice references, and character consistency.

Dates, availability, parameter counts, and benchmark figures above are
provider-reported unless a linked source names an independent harness. The
table ranks expected practical impact, not parameter count alone.

![Supplied benchmark screenshot for Alpamayo 2, presented as a vendor comparison rather than an independent ranking.](/weekly-screenshots/2026.08.05/alpamayo-reasoning-benchmark.png)

![Supplied Alpamayo 2 comparison chart across major AV tasks, presented as vendor-reported evidence.](/weekly-screenshots/2026.08.05/alpamayo-av-task-benchmark.png)

### The high-impact changes

**Claude Opus 5 is the closed-model release to test first.** Anthropic says it
is available across Claude surfaces, is the default on Claude Max and the
strongest model on Claude Pro, and approaches Claude Fable 5 at roughly half
the price. The announcement frames the gain around software engineering,
knowledge work, automation, and using effort settings to trade intelligence
for cost and latency — a routing proposition, so reproduce it against the same
tasks, tools, permissions, and review gates your team actually uses.

**Qwen3.8-Max and Kimi K3 make open-weight availability part of the frontier
conversation.** Qwen3.8-Max's claimed 1M context and native vision matter only
if its API behavior, downloadable release, hardware footprint, and license fit
the workload. Kimi K3's full weights change the equation differently: they let
a team inspect, host, and evaluate a very large multimodal MoE without
depending solely on a proprietary endpoint.

**DeepSeek-V4-Flash-0731 shows that post-training can move the product more
than an architecture label.** DeepSeek describes a re-post-training update,
not a new architecture, but reports stronger agent benchmarks, native
Responses API support, and direct Codex adaptation. Keep the benchmark
configuration attached to the result — DeepSeek names its own harness and
max-effort settings for coding-agent measurements.

**The multimodal and robotic releases point beyond chat.** Gemini Robotics
ER 2, FLUX 3, MiniMax H3, Grok Voice Think Fast 2.0, and Lyria 3.5 all widen
the model boundary: a system may perceive, plan, act, speak, generate media,
and re-plan. The acceptance test has to widen too — measure latency,
grounding, interruption handling, tool failure recovery, permissions, and
human override, not just a final text answer.

**Security and safety are becoming smaller, deployable components.**
MAI-Cyber-1-Flash is a specialized agent component; Shieldstral is small
enough to run as a configurable multimodal policy layer. Neither removes the
need for staged review, least privilege, isolated test environments, and a
human decision on material changes.

**Agent products are also becoming orchestration layers.** Meta's Muse Spark
1.1 update connects planning to email, calendars, slides, and recurring tasks,
while Grok Build Workflows can fan background work across parallel agents.
Both make workflow verification and permission boundaries part of the product,
not an optional layer added after deployment.

## The evidence board: do not route by a single score

![Supplied FrontierCode score-versus-cost chart. It should be read as a chart of listed configurations, not a universal model ranking.](/weekly-screenshots/2026.08.05/frontier-code-cost-comparison.png)

![Supplied agentic coding chart showing how score and cost change by effort level.](/weekly-screenshots/2026.08.05/agentic-coding-effort-level.png)

![Supplied FrontierCode score-versus-cost snapshot with named configurations.](/weekly-screenshots/2026.08.05/frontier-code-score-cost.png)

![Supplied model cost routing chart. The right selection depends on the task, harness, and acceptance threshold.](/weekly-screenshots/2026.08.05/model-cost-routing-chart.png)

![Supplied novel-problem score-versus-evaluation-cost chart.](/weekly-screenshots/2026.08.05/novel-problem-cost-chart.png)

The common message across the supplied cost charts is not that one model has
won. It is that the cost of an *accepted* result depends on a whole
configuration: model, reasoning setting, prompt, retries, tool calls, tokens,
latency, and agent harness. A cheap failed run is not cheap. A high benchmark
score achieved in a different environment may not transfer.

![Supplied ARC-AGI-3 DLC-games chart. Treat the associated caption and any model comparison as an evaluation result under its named setup.](/weekly-screenshots/2026.08.05/arc-agi-3-dlc-games.png)

> **A better local decision loop**
> 1. Select five to ten real tasks, including one failure-prone task and one that needs review.
> 2. Define the acceptance test before choosing a model: tests pass, output is correct, a reviewer can reproduce it, and policy constraints hold.
> 3. Hold the harness fixed while comparing models, then compare harnesses separately.
> 4. Record success rate, total wall time, total tokens, tool failures, human intervention, and cost per accepted result.
> 5. Route routine work to the cheapest configuration that clears the bar. Escalate hard work deliberately, with a capable fallback.

## Long-horizon agents: capability without verification is a fragile asset

![Supplied METR chart at the 50 percent completion threshold, relating model capability to software-task time horizon.](/weekly-screenshots/2026.08.05/metr-50-percent-time-horizon.png)

![Supplied METR chart at the 80 percent completion threshold.](/weekly-screenshots/2026.08.05/metr-80-percent-time-horizon.png)

![Supplied METR linear-scale chart at the 50 percent threshold.](/weekly-screenshots/2026.08.05/metr-linear-50-time-horizon.png)

![Supplied METR linear-scale chart at the 80 percent threshold.](/weekly-screenshots/2026.08.05/metr-linear-80-time-horizon.png)

The time-horizon visuals make a useful distinction: finishing a longer task
under a benchmark's protocol does not earn a system permission to operate
without checks. Long runs accumulate ambiguity, stale state, credential
exposure, partial tool failure, and an incentive to declare success early. The
answer isn't to avoid agents — it's to give them bounded authority, observable
checkpoints, rollback paths, and independent verification.

![Supplied example notes on GPT changes. It is presented as a working artifact, not a validated diagnosis.](/weekly-screenshots/2026.08.05/rsi-gpt-tweaks.png)

![Supplied screenshot carrying a suspicious claim. The edition preserves it as a claim and does not treat it as proof.](/weekly-screenshots/2026.08.05/rsi-suspicious-claim.png)

![Supplied review-chain graphic: useful as a process prompt, not proof that a particular review has run.](/weekly-screenshots/2026.08.05/review-chains-work.png)

**Working rule:** model output, a social post, and a chart are inputs to a
decision. The evidence is the result of an observable test someone else can
repeat.

## Mathematical breakthroughs: from plausible answers to checked arguments

The most consequential development in this window may not be a chatbot
release at all — it's the growing ability of AI systems to search for
original mathematical results and return work that can be checked
mechanically. That reframes the question from "does this answer sound
convincing?" to "what exactly has been formalized, what does it establish, and
what remains for the research community to interpret?"

**OpenAI's Astra results are an extraordinary research claim.** On August 1,
OpenAI reported that an internal version of its forthcoming Astra model
resolved or made substantial progress on ten long-standing open problems. The
company says the model found the arguments and humans prepared manuscripts,
after which the model formalized every argument as a Lean certificate. The
claimed results span high-dimensional geometry, coding theory, arithmetic
circuit complexity, group theory, operator algebras, quantum complexity,
lattice cryptography, and extremal combinatorics.

The announced examples are unusually concrete:

- New sphere-packing upper bounds reaching the Cohn-Elkies threshold, and exponentially improved bounds for binary and spherical codes.
- A construction of non-sofic groups, a disproof of Connes's rigidity conjecture, and a resolution of Ehrhart's volume conjecture in every dimension.
- An arithmetic-formula lower bound of order $n^4 / \log n$, an exponential parallel-repetition theorem for general two-player quantum games, and polynomial-factor hardness of approximation for the Closest Vector Problem.
- New multicolor Ramsey-number and extremal-graph-theory results that OpenAI describes as resolving three Erdős problems.

The technical significance isn't a score on a familiar contest set — these are
claims about new bounds, constructions, and counterexamples in open research
areas. Formal Lean verification can check that the encoded proof follows the
rules of the formal system, an enormous step beyond trusting a fluent
natural-language derivation. It does **not** by itself decide whether a result
is novel, how it relates to earlier literature, whether the formalization
captures the intended theorem, how important it is, or how credit should be
assigned. Those remain mathematical-community questions.

**Claude Fable 5's Jacobian-conjecture contribution illustrates both the
promise and the qualification.** Mathematician Levent Alpöge used the model to
identify a three-dimensional polynomial map that gives a counterexample to a
long-standing version of the Jacobian conjecture; Smithsonian reports that
several mathematicians independently checked it. The result matters because
the model contributed to original research. It does not resolve every
formulation or the lower-dimensional cases of the conjecture — the correct
headline is a significant counterexample, not "AI solved the Jacobian
conjecture."

### Lean, research loops, and responsible mathematical claims

The wider shift is from math benchmarks with known answers toward open-ended
research loops: search for a construction or counterexample, generate an
argument, translate it into Lean 4, and submit both the human-readable proof
and the formal artifact to expert scrutiny. Some call this "vibe-proving,"
when AI runs autonomously for hours to explore a search space. The better name
for a serious workflow is **generate, formalize, review**.

The Leiden Declaration on AI and Mathematics gives this moment useful
guardrails: disclose AI use, credit prior work, make results available for
evaluation, and don't let an announcement replace mathematical peer review.
For builders, this is the clearest available model of high-stakes agentic
work — generate quickly, verify mechanically where possible, and preserve the
human process that explains what the proof means.

## The physical stack: from phones to robots to orbital compute

![Supplied on-device model comparison chart.](/weekly-screenshots/2026.08.05/on-device-model-comparison.png)

![Supplied note about on-device frontier-model capability. Confirm the model, quantization, device, and test before inferring a hardware requirement.](/weekly-screenshots/2026.08.05/on-device-model-capability-note.png)

![Supplied on-device model memory table.](/weekly-screenshots/2026.08.05/on-device-model-memory-table.png)

Phone-sized inference belongs in the same conversation as giant open-weight
models: deployment is a spectrum. Private, low-latency, offline-capable local
inference can be worth choosing even when it's less capable than a cloud
frontier endpoint. Compare the whole operating envelope — memory, battery,
throughput, model quality, data handling, update process, and whether the task
can fail safely.

Gemini Robotics ER 2 and FLUX 3 put physical action closer to the
model-release board. In robotics, the acceptance surface is tangible: can the
system maintain situational awareness, recognize a failed action, stop safely,
and ask for help? Those are better questions than a single demo clip.

### Robotics: the model is the coordinator, not the whole robot

The current step forward is architectural. Google presents **Gemini Robotics
ER 2** as a high-level embodied-reasoning layer: it watches continuous video,
reasons about the next step, plans multi-step work, calls tools, and hands
motor execution to lower-level vision-language-action models or robotics
APIs. Google says the model can track progress, retry a failed step, and
coordinate multiple robots in shared environments. Its public availability in
the Gemini API and AI Studio makes it a practical system to evaluate, not only
a research demo.

That division of responsibility matters. A language-and-vision planner
shouldn't get raw, unrestricted actuator control just because it can describe
an action. A robust stack separates the work into layers:

1. **Perceive:** stream video, audio, task state, and safety signals into a model that can identify objects, people, locations, and task progress.
2. **Plan:** turn a human objective into bounded, observable steps with explicit preconditions, a time limit, and a safe stop state.
3. **Act:** invoke constrained navigation, grasping, manipulation, or teleoperation interfaces through an approved controller rather than arbitrary device access.
4. **Verify:** use sensors and task-specific checks to decide whether the intended state was actually reached, not whether the model believes it was.
5. **Recover or escalate:** retry only within a defined budget; otherwise stop, preserve the evidence, and hand the decision to a person.

**Progress understanding is a particularly important capability.** Google
describes ER 2 as classifying progress from continuous video and finding the
moments that establish whether a multi-step action is complete — valuable
because a robot that can't tell a bag is still open, an object is missing, or
a hand has entered the workspace doesn't have a reliable stopping condition.
Vendor-reported progress scores are a starting signal; a deployment needs a
site-specific test set covering glare, clutter, occlusion, novel objects,
people moving through the scene, delayed tools, and real recovery behavior.

**FLUX 3 points to a second path: models of physical dynamics.** Black Forest
Labs describes a unified image, video, and audio model meant to represent how
objects move, interact, and sound, with action prediction being evaluated
through specialized robotics work. Its announced FLUX-mimic effort combines
the video backbone with robot-learning systems for dexterous manipulation.
This is an early-access, partner-led direction, not evidence that a general
video model is ready to run production robots — but the idea that
simulation, perception, prediction, and action can share a representation of
the same world is a promising one.

#### What a credible robotics evaluation looks like

- **Task success:** complete the real task to a measurable specification, across repeated trials rather than a single favorable demo.
- **Safety behavior:** detect a blocked path, unexpected person, dropped object, or contradictory instruction; enter the defined safe state within the required time.
- **Grounding:** match plans and verbal explanations to what cameras and sensors actually observed.
- **Recovery:** demonstrate what happens after a failed grasp, unavailable tool, degraded network, stale scene state, or impossible request.
- **Human control:** provide an accessible pause, stop, teleoperation, and incident trail; a human must be able to take over without fighting the agent.
- **Operational fit:** measure latency, uptime, battery or power constraints, maintenance burden, calibration drift, access controls, and cost per completed task.

The near-term opportunity isn't a universal household robot. It's a small
number of bounded physical workflows where the environment, tools, handoffs,
and failure modes are known well enough to evaluate. Build the stop button and
the evidence trail before the clever demo.

### Elon Web Services: when the compute moves to orbit

![Supplied Starlink one-terabit concept graphic.](/weekly-screenshots/2026.08.05/starlink-one-terabit-concept.jpeg)

![Supplied StarMind satellite concept image.](/weekly-screenshots/2026.08.05/starmind-satellite-concept.jpeg)

![Supplied SpaceX post: SpaceX says it is partnering with Nvidia to design the Starmind AI1 satellite compute payload, with each satellite carrying Nvidia Rubin GPUs and Vera CPUs for datacenter-class space compute.](/weekly-screenshots/2026.08.05/starmind-nvidia-compute-claim.png)

![Supplied StarMind satellite concept image. Confirm deployment plans, capacity, financing, and regulatory approvals through primary sources.](/weekly-screenshots/2026.08.05/starmind-nvidia-compute-post.jpeg)

We're only half joking about "Elon Web Services." Between Starlink's claimed
one-terabit downlink concept, xAI's Grok Voice and Imagine Video updates, and
the newly supplied Starmind AI1 claim — Nvidia Rubin GPUs and Vera CPUs flown
as a satellite compute payload — one company's orbital, connectivity, and
model stack is starting to look like a vertically integrated cloud provider
that happens to launch itself into space. That's a genuinely interesting
systems bet: put GPUs where the sun and cooling are free and the fiber
constraints of a terrestrial datacenter don't apply.

It is also, right now, a set of announcement-stage claims, not a shipping
product. Treat "Starmind AI1" the way this edition treats every other vendor
post: confirm launch dates, payload specifications, thermal and power budgets,
latency to ground stations, and regulatory approval before it enters any
capacity-planning conversation. Orbital compute is a compelling long-range
prompt for where the physical stack is headed — it is not yet a line item.

## The efficiency board: optimization techniques for token maxxing

Every board above eventually reduces to the same unit economics: what does an
*accepted* result cost, in tokens, wall time, and dollars? Model releases get
the headlines, but three quieter classes of optimization move that number
more than picking a different model does.

**Squeeze the kernel, not just the prompt.** Cursor's open-sourced
Mixture-of-Kittens (MoK) training kernel fuses Mixture-of-Experts
communication and computation into a single deterministic kernel and reports
up to 2.37x higher forward throughput than the strongest public baseline on
GB300 NVL72 hardware, across Kimi K2.7, GLM 5.2, Qwen 3.5, and DeepSeek V4
Pro. This is infrastructure-layer optimization — the same prompt, the same
model, running faster for less — and it's a reminder that "token maxxing"
isn't only a prompting trick. Some of the cheapest tokens in this edition
come from better plumbing, not a better model.

![Supplied Cursor (@cursor_ai) post announcing the open-sourced Mixture-of-Kittens MoE training kernel, reporting up to 2.37x higher throughput than the strongest public baseline.](/weekly-screenshots/2026.08.05/mixture-of-kittens-benchmark.png)

**Cache what repeats.** Qwen3.8-Max's posted pricing — $2.00 per million input
tokens, $6.00 output, and $0.25 per million tokens served from implicit
caching — puts a number on a technique every routing decision should already
use: a cache hit on a repeated system prompt, tool schema, or long context
costs roughly an eighth of a fresh input token. Multiply that across a coding
agent that resends the same repo context on every turn, and prompt caching
stops being a nice-to-have and becomes the largest lever most teams haven't
pulled.

**Route by effort, not by default.** The agentic-coding effort-level chart in
the evidence board above shows the same model producing a range of scores and
costs depending on its reasoning setting. Claude Opus 5's own announcement
frames effort settings as the mechanism for trading intelligence against cost
and latency, and DeepSeek names its harness and max-effort configuration
alongside its benchmark claims for the same reason: the effort dial is part
of the model's identity for cost purposes, not an afterthought.

**A practical checklist for token maxxing:**

- Cache repeated system prompts, tool schemas, and long context instead of resending them.
- Batch independent requests where the provider supports it, rather than paying per-call overhead one at a time.
- Trim context to what the task needs; a bigger window is not free just because it's available.
- Match reasoning effort to task difficulty, and reserve max-effort settings for the failure-prone cases identified in your acceptance test.
- Fix retries at the acceptance-test level, not the prompt level — a well-defined pass/fail gate prevents the silent retry loops that quietly multiply token spend.
- Measure cost per *accepted* result, not cost per token or per call, so infrastructure wins like Mixture-of-Kittens and prompting wins like caching show up in the same ledger.

## The economics board: price changes, supply chains, and market stories

![Supplied model price comparison from before a reported change.](/weekly-screenshots/2026.08.05/model-pricing-before-change.png)

![Supplied model price comparison from after a reported change.](/weekly-screenshots/2026.08.05/model-pricing-after-change.png)

Pricing is a product feature. It shapes routing, retries, effort settings,
model fallbacks, and whether a workflow is economical at scale — and it's
the market-level counterpart to the caching and effort-routing techniques
above. Snapshot images are especially perishable here: preserve the date,
link the official price page, and calculate cost from current terms and
observed usage rather than an old card or a headline discount.

The same caution applies one level up, where price becomes valuation.

![Supplied market-cap comparison for AI labs.](/weekly-screenshots/2026.08.05/ai-lab-market-cap-comparison.png)

![Supplied Leopold market timeline screenshot.](/weekly-screenshots/2026.08.05/leopold-market-timeline.png)

![Supplied Situational Awareness Fund composition graphic.](/weekly-screenshots/2026.08.05/leopold-situational-awareness-fund.png)

![Supplied fund-profile screenshot.](/weekly-screenshots/2026.08.05/leopold-fund-profile.png)

These market images show why the AI story isn't limited to model providers.
Semiconductors, networking, power, cooling, hosting, device makers, and
software distribution all capture different parts of the value chain. They do
not, however, establish an investment thesis. Separate a fund's or
commentator's story from audited financial results, valuation, concentration
risk, and your own time horizon.

## Open weights, policy, business workflows, and health claims

![Supplied open-weight model-family notes.](/weekly-screenshots/2026.08.05/open-weight-model-family-notes.png)

![Supplied Satya Nadella post on open weights and technology leadership. It is a policy position, not a model benchmark.](/weekly-screenshots/2026.08.05/open-weights-policy-post.png)

Open weights change the operational conversation: a team may inspect, host,
adapt, and retain a model, but it also inherits evaluation, security,
license, distribution, and update responsibilities. Check weight
availability, license terms, region restrictions, acceptable-use terms, and
model-card limitations before calling a release "open" in the way that
matters to your deployment.

![Supplied business-agent notes.](/weekly-screenshots/2026.08.05/business-agent-notes.png)

![Supplied business-agent workflow notes.](/weekly-screenshots/2026.08.05/business-agent-workflow-notes.png)

The business-workflow sketches fit the central theme: value appears when an
agent's action connects to a clear handoff, a responsible owner, data access
that is actually authorized, and a testable business outcome. The model alone
is not the workflow.

![Supplied health interface screenshot about a claimed reverse-aging result. It is not clinical evidence and should not guide health decisions.](/weekly-screenshots/2026.08.05/health-reverse-aging-interface.png)

Health is the sharpest reminder that evidence standards are domain-specific. A
dashboard, paper summary, or post cannot establish safety or efficacy. For any
health claim, look for the actual study, population, endpoints, limitations,
independent replication, and appropriate clinical guidance.

## What to do this week

- Test Claude Opus 5, Qwen3.8-Max, DeepSeek-V4-Flash-0731, and Kimi K3 on one shared local acceptance set.
- Treat availability, licensing, region restrictions, price, context behavior, tool reliability, and data handling as selection criteria alongside score.
- For voice, video, robotics, and computer-use agents, add interruption, recovery, stop, and human-override tests to the eval.
- Turn on prompt caching where your provider supports it, and route routine calls to a lower effort setting before reaching for a bigger model.
- Put a compact policy layer such as Shieldstral behind measured enforcement, but keep least privilege and human review for consequential actions.
- Preserve a source trail. Label vendor claims, social-media claims, independent evaluations, and local measurements differently.

## Sources and watchlist

- [Anthropic: Introducing Claude Opus 5](https://www.anthropic.com/news/claude-opus-5)
- [Alibaba Cloud: Qwen3.8-Max](https://www.alibabacloud.com/blog/alibaba-unveils-qwen3-8-max-its-largest-and-most-capable-flagship-model-to-date_603420)
- [DeepSeek API: July 31 V4-Flash update](https://api-docs.deepseek.com/updates/)
- [OpenAI: Ten advances in mathematics and theoretical computer science](https://openai.com/index/ten-advances-in-mathematics/)
- [Smithsonian: Claude Fable 5 and the Jacobian-conjecture counterexample](https://www.smithsonianmag.com/smart-news/ai-disproves-a-decades-old-mathematical-idea-the-biggest-conjecture-that-the-tech-has-played-a-role-in-yet-180989189/)
- [Moonshot AI: Kimi K3 weights commit](https://huggingface.co/moonshotai/Kimi-K3/commit/c5d1dd4c428bd1ce8b88c5044f3b6ccde9e3b721)
- [Google: Gemini Robotics ER 2](https://blog.google/innovation-and-ai/models-and-research/google-deepmind/gemini-robotics-er-2/)
- [Black Forest Labs: FLUX 3](https://bfl.ai/blog/flux-3)
- [MiniMax: MiniMax H3](https://www.minimax.io/blog/minimax-h3)
- [xAI: Grok Voice Think Fast 2.0](https://x.ai/news/grok-voice-think-fast-2)
- [Microsoft: Rethinking security for the age of AI](https://blogs.microsoft.com/blog/2026/07/27/rethinking-security-for-the-age-of-ai/)
- [Mistral AI: Shieldstral](https://mistral.ai/news/shieldstral/)
- [Google DeepMind: Lyria 3.5](https://deepmind.google/blog/were-launching-lyria-35-in-google-flow-music-with-advances-across-musicality-lyrics-vocals-and-creative-control/)
- [xAI: Imagine Video 1.5 with References](https://x.ai/news/grok-imagine-video-1-5-references)
- [Meta: Muse Spark 1.1 acts across connected workflows](https://about.fb.com/news/2026/07/meta-ai-muse-spark-doesnt-just-think-it-acts/)
- [xAI: Grok Build Workflows](https://x.ai/news/workflows)

**Promotion checklist:** confirm the official sources and time-sensitive price,
availability, and license claims; review every supplied screenshot for context
and personal information; copy the approved assets into
`public/weekly-screenshots/2026.08.05/`; then register the article, run the
model-watch update, asset check, build, and mobile browser audit.
