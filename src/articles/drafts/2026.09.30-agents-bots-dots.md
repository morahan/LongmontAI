---
id: edition-2026-09-30-agents-bots-dots
date: 2026-09-30
publishAt: 2026-09-30T11:30:00-06:00
status: scheduled
title: "Agents, Bots, Dots, oh my!"
summary: "Mid-tier frontier models, DevDay’s agent stack, AMD’s World Labs agreement, and the fortnight’s practical AI news."
---

## The mid-tier arrives — and agents stop waiting
Two weeks, three mid-priced frontier contenders, and one very busy DevDay. This edition asks three practical questions: **When do GPT-6.1 Sol, Grok 4.7, or Sonnet 5.5 replace an expensive default? What did OpenAI’s DevDay actually ship for builders? And what does Helix 2.5 still prove about robots in the physical world?**
The wider fortnight also brings AMD’s World Labs acquisition agreement, Meta’s wearable agents, new voice and open-weight models, and practical changes in music-making and agent safety.
Our reporting window is **September 17–30, 2026** (America/Denver), focusing on consequential product, model, hardware, and safety developments. Coverage and sources were refreshed **September 30 at 05:23 UTC (September 29, 11:23 p.m. MDT)**. September 30 daytime announcements still require a pre-publication check.
> **Evidence note — refreshed September 30, 05:23 UTC:** Primary sources include OpenAI’s DevDay 2026 recap, GPT-6.1 Sol launch post and API model card, Sep 22 Sol/Luna launch, and Dots announcement with the GPT-6 Astra system card appendix; xAI’s Grok 4.7 post and docs; Anthropic’s Sonnet 5.5 and Opus 5.5 announcements; Suno’s v6 announcement, help guide, and FAQ; Figure’s Helix 2.5 post; Google’s Live Avatar post; NaiveAI’s research post; and Aikido’s Altar post. Ultrafast pricing and Pro-plan transition details are linked to OpenAI’s pricing and help documentation. Additional primary sources cover AMD, Meta, Xiaomi, Qwen, Black Forest Labs, ElevenLabs, Microsoft, NVIDIA, and Suno’s September 17 Studio update. The White House accord section uses attributed reporting; its commitments are distinct from NVIDIA’s platform and partner initiative. Benchmarks are vendor-reported, not independent measurements, and pricing can change. Recheck before the 11:30 MT embargo if anything ships the morning of September 30.
## GPT-6.1 Sol: near-Astra work at Sol dollars
[**GPT-6.1 Sol launched 29 September 2026**](https://openai.com/index/introducing-gpt-6-1-sol/)**.**
API ID: [`gpt-6.1-sol`](https://developers.openai.com/api/docs/models/gpt-6.1-sol).
OpenAI’s pitch: near-Astra results on agentic coding, computer use, and professional work at **one-fifth of Astra’s list price**. The details:
- **Price:** $2 / $10 per 1M tokens — the same as GPT-6 Sol, versus Astra’s $10 / $50.
- **Caching:** cached input **$0.10**, half of GPT-6 Sol’s $0.20 and 95% off uncached input. Cache writes $2.50.
- **Limits:** 1,050,000-token context, 128,000 max output, knowledge cutoff Apr 30, 2026. The GPT-6 family’s >272K pricing cliff still applies.
- **Reasoning:** low / medium / high / xhigh / **max** (no none or minimal).
- **Preparedness:** Critical for cyber, High for bio/chem, with the same safeguards stack as Astra.

| Model | API ID | Input / output per 1M | Cached input | Cache writes | Context / max out |
| --- | --- | --- | --- | --- | --- |
| GPT-6 Astra (prior) | `gpt-6-astra` | $10 / $50 | $1.00 | $12.50 | 1.05M / 128K |
| **GPT-6.1 Sol** | `gpt-6.1-sol` | **$2 / $10** | **$0.10** | $2.50 | 1.05M / 128K |
| GPT-6 Sol (Sep 22) | `gpt-6-sol` | $2 / $10 | $0.20 | $2.50 | 1.05M / 128K |
| GPT-6 Luna | `gpt-6-luna` | $0.10 / $0.50 | $0.01 | $0.125 | 1.05M / 128K |

**Availability:** ChatGPT Work and Codex for Plus, Pro, Business, Enterprise, and Edu — **not yet in Chat.** **GPT-6.1 Sol Ultrafast is “coming soon”**; GPT-6 Astra Ultrafast is generally available (see DevDay below).
**Benches are OpenAI’s table.** DeepSWE matching Astra ~1/5 cost, GDP.pdf approaches, AutomationBench / OSWorld / Terminal-Bench Science deltas vs GPT-6 Sol, and factuality error-share cuts are **OpenAI-reported**. Label every score. Run your own jobs before you change a default.
### The cost-curve week that 6.1 then raised
[**GPT-6 Sol and GPT-6 Luna launched 22 September 2026**](https://openai.com/index/introducing-gpt-6-sol-and-luna/) — Astra stays the uncompromising flagship; Sol and Luna distribute GPT-6-class methods down the curve at **50% below GPT-5.6 promotional pricing**. Same day, [**Claude Opus 5.5**](https://www.anthropic.com/claude-opus-5-5) (`claude-opus-5-5`) landed at **$4 / $20** per 1M, cache reads **$0.20**, with Anthropic saying it performs at Fable 5.1 level on most work while costing about **40% less than Opus 5** on typical workloads — **Anthropic estimate**. Context **1M** / max out **128K**. Fast mode **$8 / $40**. Four breaking changes hit Opus 5 callers — read the [migration guide](https://platform.claude.com/docs/en/models/opus-5-5/migration-guide) before you flip a production agent.
Six days later, [**Claude Sonnet 5.5**](https://www.anthropic.com/claude-sonnet-5-5) (`claude-sonnet-5-5`) completed Anthropic’s 5.5 mid lane at **$2 / $10**, cache read **$0.20**, context **1M** / max out **128K**. Anthropic: **30%+** faster vs Sonnet 5; up to **~30% less cost per task** (fewer tokens) — **Anthropic-reported**. First Sonnet with **cyber safeguards** like Opus-class. Haiku 5.5 is “coming weeks,” not this window.
**For a Longmont owner:** GPT-6.1 Sol is the new default candidate for hard agent loops that do not need Astra’s full depth. Luna remains the volume lane. Opus 5.5 and Sonnet 5.5 are the Claude shop’s mid-frontier pair versus Fable’s $10/$50. Keep Astra (or Fable) for the jobs that justify the ceiling. Approvals still matter on send, pay, merge, and publish.
## DevDay 2026: OpenAI ships the agent stack
OpenAI’s [DevDay 2026](https://openai.com/index/devday-2026-recap/) in San Francisco on September 29 packed more than 20 announcements across ChatGPT, Codex, the API, and its models. GPT-6.1 Sol was the model headline. The bigger story is that OpenAI now sells every layer of an agent workflow: the agent itself, a paid speed tier, a cloud workbench for code, and the API underneath. Here is what matters for owners and builders.
### Dots: always-on agents on GPT-6 Astra
Dots are proactive, always-on agents that keep working toward your goals after you log off. Each Dot runs on **GPT-6 Astra** with its own private cloud computer and browser, connects to **4,000+ apps** through OpenAI’s plugin ecosystem, and supports messaging and calls in ChatGPT, plus messaging in Slack and Microsoft Teams. Rollout starts with ChatGPT Pro and Business Premium in eligible markets; Enterprise workspaces can join a beta once an admin enables it. Your first Dot is included, and conversations with it don’t count toward ChatGPT usage limits (tasks it starts in Codex or ChatGPT Work still do). OpenAI also previewed focused enterprise pilots of specialist Dots with their own identities for access management inside organizations.
These are product claims, not an independent capability test. A cloud computer with app access is an approval surface: review scopes, inspect what the Dot did, and keep confirmation gates on consequential actions. Sources: [OpenAI’s Dots announcement](https://openai.com/index/introducing-dots/) and [GPT-6 Astra system card, Dots appendix](https://deploymentsafety.openai.com/gpt-6-astra/robustness-to-misleading-proactivity-inputs).
**Astra name hygiene:** Dots run on **GPT-6 Astra**. That does not mean **GPT-6.1 Astra** shipped; see the release-board note below.
### Ultrafast: speed becomes a SKU
**GPT-6 Astra Ultrafast** is live today in the API, and in ChatGPT Work and Codex on the new **Pro 500** and Enterprise plans. OpenAI says it runs up to **8× faster in Codex** (about 300 tokens per second) and up to 6× faster in the API — at **6× the standard API rate**. **GPT-6.1 Sol Ultrafast is “coming soon,”** not GA.

| Model / tier | Speed | Input / 1M | Cached input / 1M | Output / 1M | vs. Standard |
| --- | --- | --- | --- | --- | --- |
| GPT-6 Astra — Standard | Baseline | $10 | $1.00 | $50 | 1× |
| GPT-6 Astra — Fast mode | Faster | $20 | $2.00 | $100 | 2× |
| **GPT-6 Astra — Ultrafast** | Up to 6× (API), 8× (Codex), ~300 tok/s | **$60** | **$6.00** | **$300** | **6×** |
| GPT-6.1 Sol — Standard | Baseline | $2 | $0.10 | $10 | 1× |
| **GPT-6.1 Sol — Ultrafast** (coming soon) | Up to 6× (API), 8× (Codex) | **$12** | **$0.60** | **$60** | **6×** |

*Ultrafast rates are derived: OpenAI states the 6× multiplier but doesn’t publish every line item. Figures follow *[*The Decoder’s*](https://the-decoder.com/openai-expands-codex-and-its-api-at-devday-with-security-scans-a-decisions-api-and-ultrafast/)* and *[*VentureBeat’s*](https://venturebeat.com/technology/openais-gpt-6-1-sol-offers-astra-like-performance-at-1-5th-price-a-new-ultrafast-tier-clocks-at-300-tokens-per-second)* DevDay reporting. The >272K long-context cliff (2× input and cache, 1.5× output for the full request) applies on top, so a long-context Astra Ultrafast call can reach $120 / $450 per 1M. Confirm on OpenAI’s pricing page before you quote a client.*
Pro 500 costs **$500 a month**, with **25× the Plus allowance** and Ultrafast included. OpenAI reduced the included allowance for new Pro 200 subscriptions; eligible existing subscribers retain their previous allowance through **October 29, 2026**, then move to the lower allowance at the unchanged $200 monthly price. Sources: [OpenAI’s DevDay recap](https://openai.com/index/devday-2026-recap/) and [official Pro-tier documentation](https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers).
**API caveats:** $60 / $300 are short-context rates. Above 272K input tokens, Astra Ultrafast is **$120 / $450** per 1M input/output tokens. Launch rate limits are low; global processing and US data residency are supported, while EU inference residency is not. Sources: [API pricing](https://developers.openai.com/api/docs/pricing?latest-pricing=ultrafast) and [Ultrafast guide](https://developers.openai.com/api/docs/guides/ultrafast-mode).
Ultrafast pays off when a person is waiting on the answer: live pairing, support, demos. For overnight agents and batch work, it’s a 6× tax on time nobody is watching.
### Codex moves to the cloud
- **Codex in the cloud:** run Codex on your computer, remotely from a phone, or in the cloud from any device. Reusable environments give a team a shared setup with approved settings and permissions, and tasks keep running after the laptop closes. Available on Plus, Pro, Business, Healthcare, Education, and Enterprise.
- **Refreshed Codex CLI:** start and steer tasks by voice, delegate and track parallel work in a new `/agents` view, and get better prompt editing, session resume, and worktrees.
- **Code Review:** a review experience in the ChatGPT desktop app with summaries, diffs, and Q&A before you comment on GitHub pull requests or GitLab merge requests. Automatic reviews let Codex take a first pass in the cloud while you’re away.
- **Codex Security Cloud:** scan whole GitHub repositories on demand or on a schedule, with ongoing checks of new commits. Codex investigates findings, removes duplicates, and prepares fixes in the cloud, and access to Daybreak Blue models is included. Available on Pro, Business, Enterprise, and Edu.
### For builders: the API layer
- **Agents API with computer use:** agents that operate software to finish tasks, plus Codex’s multi-agent orchestration, tool search, tool calling, and context compaction. OpenAI runs the infrastructure.
- **Decisions API:** points Luna at user-defined questions with a fixed set of answers — classify content, route a request, or choose an agent’s next action. Limited preview now; broad release “in the coming days.”
- **Bedrock Managed Agents, powered by OpenAI:** Agents API capabilities running entirely inside AWS.
- **Private Intelligence:** Zero Data Retention with Private Safety Processing today; a Private Inference preview built on confidential computing is due this fall.
### ChatGPT becomes a shared workspace
The rest of the keynote turned ChatGPT into a place where teams work: **ChatGPT Space** for shared knowledge, **Pages** for documents people and agents edit together, collaborative **slides** (coming weeks), **team tasks** that run on a schedule or on events, **@ChatGPT** in Slack and Teams, and a **Meetings** plugin (macOS beta). For developers, there are plugin extensions with sidebar panels, MCP Events to trigger automations, plugins inside Sites, and **Sign in with ChatGPT**, which lets Plus and Pro users spend plan allowance in 16 partner tools, including Notion, Devin, and Vercel. Enterprise buyers also get an **OpenAI Marketplace** for applying existing commitments to partner software.
**Two rollout details worth knowing:** [Dots](https://help.openai.com/en/articles/20001530-getting-started-with-your-dot) roll out over several days; Pro availability excludes the EEA, Switzerland, and UK, while Business Premium is supported across ChatGPT regions. Enterprise, Edu, and Healthcare access is an admin-enabled beta. [Sign in with ChatGPT](https://help.openai.com/en/articles/20001542-using-your-chatgpt-plan-in-other-apps-and-sites) spends the same Work/Codex allowance, subject to per-app weekly caps; a partner subscription may still cost extra. It does not automatically expose your ChatGPT conversations or memory.
The common thread: more of this work happens while you’re not looking. Budget review time accordingly.
## Suno: v6 context and this fortnight’s Studio update
**Inside this fortnight: Suno’s September 17 Studio update.** Suno reports improved MIDI-to-audio conversion and MIDI generation through the chat bar, plus clip-renaming controls. The practical experiment: bring in an existing MIDI part and try a different instrument or arrangement. These are reported workflow improvements, not a new model-family launch. Source: [Suno Studio release note](https://suno.com/release-notes/studio-improved-midi).
**Suno introduced v6 on September 9, 2026.** **Timing note:** This is outside the September 17–30 reporting window; included by request. Suno describes **v6** as its flagship: reliable, precise, and polished; **v6-wild** as the less predictable, more varied exploration model; and **v6-mini** as the faster version available to all users. Suno says v6 and v6-wild are for Pro and Premier subscribers, while v6-mini is available to everyone.
**Custom Models now run on v6.** Suno says Pro and Premier users can build up to three personalized models from their own tracks; existing v5.5 custom models are upgraded so v6 powers them, while already-created songs remain available. These are Suno’s product and quality claims, not an independent listening test. Sources: [Suno’s v6 announcement](https://www.suno.com/blog/introducing-v6), [v6 help guide](https://help.suno.com/en/articles/13924801), and [v6 FAQ](https://help.suno.com/en/articles/13924481).
## Grok 4.7: coding frontier at $2 / $6
[**Grok 4.7 launched 21 September 2026**](https://x.ai/news/grok-4-7)**.**
API / docs: [`grok-4.7`](https://docs.x.ai/developers/models). Model card dated Sep 21, 2026.
xAI’s pitch: most capable Grok for coding and knowledge work versus 4.6, at **the same list price as 4.6**: **$2 / $6** per 1M for prompts **under 200k**; **$4 / $12** at **≥200k** (full-request long-context pricing). Cached **$0.50 / $1.00**. Context **500k**. Reasoning levels low / medium / high / **xhigh**. The Fast variant is available in **Cursor and Grok Build, not the public xAI API**; its price premium is **2× for short context and 1.5× for long context**. See [xAI’s pricing](https://docs.x.ai/developers/pricing). Knowledge cutoff **May 2026** (docs). Available on Cursor, Grok Build, Grok API, routers; Copilot gradual; Amazon Bedrock as of Sep 28. Consumer surfaces (web / app / X) “later” per the model card. Supplemental Cursor workflow training is noted on the card.
**Benches are xAI’s table** (CursorBench, DeepSWE, EEBench, Terminal-Bench, and others on the launch tables). Label every score.
**Name hygiene:** Grok 4.7 ≠ Grok Bot (prior edition) ≠ Grok 4.6. SpaceXAI is a DBA of XAI LLC on the card — same product family.
## AMD agrees to acquire World Labs: a chipmaker moves closer to the models
**On September 28, AMD announced an approximately $8.2 billion all-stock agreement to acquire Fei-Fei Li’s World Labs.** The deal is expected to close by the end of 2026, subject to regulatory approvals and other customary conditions; it is **not a completed acquisition**.
World Labs develops spatial-intelligence models that generate, reconstruct, and simulate interactive 3D environments, plus technology for robot learning. AMD says that research will help shape future hardware, software, and systems. After closing, Li is expected to become AMD’s executive vice president and chief scientist. Sources: [AMD’s announcement](https://ir.amd.com/news-events/press-releases/detail/1299/amd-to-acquire-world-labs-to-advance-the-future-of-ai-compute) and [September 28 SEC filing](https://ir.amd.com/financial-information/sec-filings/content/0000002488-26-000182/amd-20260926.htm).
**Why it matters:** model research is influencing the design of the machines that run it. For robotics, simulation, and 3D creators, watch the resulting tools and compute support; the agreement itself does not deliver a new product.
## Helix 2.5: zero-shot work in 30 unseen homes
*Illustrative brand slide. Not a Figure product photo or evaluation screenshot. Numbers below are Figure-reported.*
[**Figure introduced Helix 2.5 on 17 September 2026**](https://www.figure.ai/news/helix-2-5-zero-shot-30-home-generalization)**.**
The question they asked: can a humanoid enter a home it has never seen and immediately work with its whole body?
Figure pretrained Helix 2.5 on **Index**, its global-scale human-behavior dataset, then adapted one foundation model to three long-horizon behaviors — tidying living rooms, folding towels, and making beds — and evaluated in **30 Bay Area homes** with **zero** data collection, fine-tuning, or adaptation in those environments or on the manipulated objects.
**Key Figure-reported results:**
- Zero-shot whole-body autonomy across 30 real homes on three behaviors (Figure’s “to our knowledge, first at this scope” claim).
- Holding task data, architecture, and evaluation fixed, **Index pretraining** raised full-task zero-shot success from **9%** (from scratch) to **56%** — no partial credit; every toy tidied, every towel folded, or the whole bed made.
- Behavior specification used about **half** the task-specific data of a representative Helix 02 behavior while expanding evaluation scope across 30 unseen homes.
- A human-to-humanoid transfer **scaling law**: doubling Index data improved robot-action prediction smoothly enough to forecast the largest run’s loss (Figure-reported forecasting error 0.54% of variation across an 8× data range).
- Index now generating roughly **35 minutes** of new human experience every second; Figure cites a **$3.5B** compute commitment to training Helix.
**What this is not:** homes solved. More than four in ten trials still failed. The eval covers three household behaviors in Bay Area houses under Figure’s rubric. It is a research demonstration, not a lease flyer.
**Contrast on the board (secondary):** late-September reporting on Tesla Optimus (The Information, via outlets such as Electrek) describes a production ramp to hundreds of units per week at Fremont while generalization and hands remain hard. There is no Tesla primary in this brief — treat as reported context that volume without transfer is a different bet than Helix’s Index thesis.
**For a Longmont owner:** watch generalization metrics (new environment, no fine-tune), not demo reels. If you sell into physical spaces, Helix is a signal that human-data pretraining may matter as much as hardware. It is not a reason to staff a store with humanoids next quarter.
## Beyond the headline models: what else changed this fortnight
### Meta Connect: agents move onto glasses
**September 23:** Meta announced Muse integration across its AI glasses, additional app connectors, and an email identity for Muse. Ray-Ban Meta Gen 3 became available from **$449**; Ray-Ban Meta Audio entered preorder from **$349**, with shipping set for October 13. **Muse Charm was previewed**, with more details promised later this year. Muse itself launched earlier, on September 8; this fortnight’s news is its expanded reach and the hardware. Sources: [Meta Connect recap](https://about.fb.com/news/2026/09/the-biggest-news-from-connect-2026/) and [glasses announcement](https://about.fb.com/news/2026/09/introducing-ray-ban-meta-audio-glasses-new-styles-plus-muse).
**Why it matters:** an assistant can become something you wear. Watch what is shipping versus demonstrated, and the permissions attached to connected apps.
### Voice generation: Google and ElevenLabs
**September 22–23:** Google’s Gemini 3.8 Flash TTS and Flash-Lite TTS reached Gemini API general availability, followed by the launch post. Flash adds voice design and performance direction; Flash-Lite targets high-volume speech. Enterprise API availability was still coming soon. **September 28:** ElevenLabs introduced **Eleven v4** and low-latency **v4 Turbo** through ElevenAgents, ElevenCreative, and ElevenAPI. Voice replication requires consent; check applicable regional and product restrictions. Sources: [Google API changelog](https://ai.google.dev/gemini-api/docs/changelog), [Google’s launch](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-8-text-to-speech/), and [ElevenLabs’ announcement](https://elevenlabs.io/blog/eleven-v4).
For support, narration, and interactive demos, compare latency, pronunciation, and voice controls on your actual script. Provider preference tests are not a substitute for that.
### Copilot: more work in one place, with a staged rollout
**September 25:** Microsoft announced **Home**, combining Chat/Cowork and Office editing; **Code**, for building small applications; and **Autopilot**, for continuing delegated work. Home and Code enter Frontier early access over coming weeks; Autopilot expands to private preview at month-end, and Managed Runtime is in preview. Fabric IQ grounding in Chat/Cowork is already generally available. Check permissions and usage-based charges before adopting background agents. Source: [Microsoft’s announcement](https://blogs.microsoft.com/blog/2026/09/25/introducing-the-new-copilot-with-home-code-and-autopilot/).
### NVIDIA: controls around the agent
**September 28:** NVIDIA launched its **Open Agent Safety Platform**, combining open software with a reference system design. OpenShell software and skills are available through developer resources; **Sentry is a BlueField-4-based reference design**, not a claim that the whole hardware stack is generally available. Sandboxing, external policy enforcement, and independent monitoring aim to constrain agents connected to business systems. These are NVIDIA’s safety claims, not proof that agent risk is solved. Source: [NVIDIA’s announcement](https://nvidianews.nvidia.com/news/open-agent-safety-platform).
**Shared practices:** NVIDIA’s separate September 28 initiative includes Anthropic, Microsoft, and **SpaceXAI**, among others, sharing best practices and aligning evaluation methods. SpaceXAI says it is using the platform for Cursor agents and Grok models. This is distinct from the September 29 White House accord below. [NVIDIA’s partner details](https://investor.nvidia.com/news/press-release-details/2026/NVIDIA-Launches-Open-Agent-Safety-Platform-to-Secure-Agents-From-Testing-to-Deployment/default.aspx).
## AI safety: who grades the homework?
**September 29:** NVIDIA, xAI, Anthropic, Google, Meta, and OpenAI joined President Trump in a White House accord on frontier-AI safety. Elon Musk described the approach as **“grading each other’s homework.”** Source: [SBS/AFP’s report](https://www.sbs.com.au/news/article/ai-industry-ceos-bow-to-trump-led-push-for-self-regulation/j9rdp2hr4).
The **Joint Commitment on Frontier Responsibilities** calls for four layers: monitoring during training and deployment; an internal team checking the controls; independent external auditors or evaluators; and oversight by an independent board committee. Companies also agreed to meet regularly to develop safety standards and best practices, while leaving open later legislation. Sources: [accord coverage](https://www.anadoluajansi.gov.tr/en/americas/trump-tech-leaders-sign-accord-on-super-intelligence-safety/4073174) and [Nextgov’s report](https://www.nextgov.com/artificial-intelligence/2026/09/white-house-unveils-super-intelligence-executive-order-and-industry-accord/416325/).
**The limit:** participation is voluntary; government enforcement and public release of evaluation findings are not required. [Reported limitations](https://www.theguardian.com/us-news/2026/sep/29/trump-ai-deal-tech-ceos-superintelligence).
External evaluation does not automatically mean every rival gets to inspect every model. For buyers, the useful follow-through is named evaluators, clear testing scope, disclosed findings, and evidence that problems were fixed.
## Supporting release board
Accessible primary posts below were checked through September 29. Comparative results remain **vendor-reported**. Recheck availability before adoption. September 30 morning was still open at draft time.
### Frontier proprietary

| Release | Date | Reported release | Caveat |
| --- | --- | --- | --- |
| [GPT-6.1 Sol](https://openai.com/index/introducing-gpt-6-1-sol/) | Sep. 29 | `gpt-6.1-sol`; **$2 / $10**; cached **$0.10**; 1.05M ctx; Work/Codex | Near-Astra pitch OpenAI-reported; **not in Chat**; Critical cyber; Sol Ultrafast coming soon |
| [OpenAI Dots](https://openai.com/index/introducing-dots/) | Sep. 29 | Always-on agents powered by GPT-6 Astra; own cloud computer/browser; 4,000+ apps via plugins | Pro + Business Premium in eligible markets; Enterprise admin beta; vendor claims; review permissions |
| [GPT-6 Astra Ultrafast](https://openai.com/index/devday-2026-recap/) | Sep. 29 | Up to 8× faster in Codex (~300 tok/s), up to 6× in API; **$60 / $300** per 1M (6× standard) | Work/Codex on Pro 500 + Enterprise; Sol Ultrafast coming soon |
| [Codex in the cloud + Security Cloud](https://openai.com/index/devday-2026-recap/) | Sep. 29 | Reusable cloud environments; voice CLI; automatic code review; scheduled repo scans with prepared fixes | Codex Cloud: Plus and eligible organizational plans. Security Cloud: Pro, Business, Enterprise and Edu; review permissions |
| [Agents API computer use + Decisions API](https://openai.com/index/devday-2026-recap/) | Sep. 29 | Computer use and multi-agent tooling in the API; Luna-based finite-answer decisions | Decisions API in limited preview; Bedrock Managed Agents for AWS |
| [Grok 4.7](https://x.ai/news/grok-4-7) | Sep. 21 | `grok-4.7`; **$2 / $6** (&lt;200k); **$4 / $12** ≥200k; **500k** ctx | Benches xAI-reported; consumer surfaces later; ≠ Grok Bot |
| [Claude Sonnet 5.5](https://www.anthropic.com/claude-sonnet-5-5) | Sep. 28 | `claude-sonnet-5-5`; **$2 / $10**; cache read $0.20; 1M ctx | Anthropic speed/cost-per-task claims; cyber safeguards; ≠ Opus 5.5 |
| [GPT-6 Sol](https://openai.com/index/introducing-gpt-6-sol-and-luna/) | Sep. 22 | `gpt-6-sol`; **$2 / $10**; cached $0.20; 1.05M ctx | Predecessor to 6.1; not in Chat; >272K cliffs full request |
| [GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna) | Sep. 22 | `gpt-6-luna`; **$0.10 / $0.50**; Free/Go desktop | Volume lane; same cliff/Fast rules as Sol |
| [Claude Opus 5.5](https://www.anthropic.com/claude-opus-5-5) | Sep. 22 | `claude-opus-5-5`; **$4 / $20**; cache read $0.20 | Anthropic ~Fable-level / ~40% vs Opus 5 claims; breaking API changes |
| [Gemini 3.8 Live with Live Avatar](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-8-live-with-live-avatar/) | Sep. 24 | Real-time visual presence + live dialogue in Gemini Enterprise | Builds on Sep 15 Live (prior window); SynthID; custom avatars allowlisted |

### Additional open-weight and multimodal releases
- **September 22 — **[**Xiaomi MiMo-V2.6**](https://mimo.mi.com/docs/en-US/updates/model)**:** Pro and Flash launched. The [MIT-licensed Pro-RL checkpoint](https://huggingface.co/XiaomiMiMo/MiMo-V2.6-Pro-RL) is a native text/image/video/audio MoE with **1.02T total / 42B active parameters** and **1M context**. This materially broadens the open-weight agent options; Xiaomi’s performance claims remain vendor-reported.
- **September 23 — **[**FLUX 3 Action**](https://bfl.ai/models/flux-3-action)**:** Black Forest Labs’ **open-weight 7B world-action model** jointly predicts future video and robot actions. Its [dated release listing](https://bfl.ai/blog) places it in this fortnight. It is a research/control-model milestone; check its license and evaluate on your task rather than inferring general household reliability.
- **September 18 announcement — Qwen3.8-Omni-Flash:** text, image, audio, and video understanding, with text output, reasoning modes, tool calling, and web search. [Qwen’s research listing](https://qwen.ai/research/qwen3.8-livetranslate) dates the announcement; [Alibaba’s deployment ledger](https://www.alibabacloud.com/help/en/model-studio/newly-released-models) records September 17 deployment in some regions. **API availability does not establish open model weights.**
- **September 20 — **[**Qwen-Image-2.1**](https://qwen.ai/blog?id=qwen-image-2.1)**:** open-sourced image generation and editing, native transparency, and up to ten reference images. **7B** describes its visual-generation component, not necessarily the whole system. Useful territory for product imagery and design workflows.
### Open-weight

| Release | Date | Reported release | Caveat |
| --- | --- | --- | --- |
| [Naive-N0.5-Flash](https://naive.ai/en/research/) | Sep. 27 | MIT MoE; **309B** / **15.5B** active; native **1M** ctx; no full-attention (SWA+DSA) | API list **$0.10 / $0.40** / cache **$0.01**; NaiveRT peak tok/s NaiveAI-reported |
| [Aikido Altar](https://www.aikido.dev/blog/aikido-altar-open-weight-ai-sovereign-security) | Sep. 21 | Open-weight security prune of GLM-5.3 to **328 GB**; 168/256 experts | On-prem / air-gap pitch; CVE rediscovery bench is Aikido’s internal harness |

### Industry & infrastructure
- **September 28 — **[**AMD–World Labs acquisition agreement**](https://ir.amd.com/news-events/press-releases/detail/1299/amd-to-acquire-world-labs-to-advance-the-future-of-ai-compute)**:** approximately $8.2B, all stock; expected end-2026 close, approvals pending. See the dedicated section above.
### Innovations & embodied

| Release | Date | Reported release | Caveat |
| --- | --- | --- | --- |
| [Figure Helix 2.5](https://www.figure.ai/news/helix-2-5-zero-shot-30-home-generalization) | Sep. 17 | Zero-shot whole-body behaviors across 30 unseen homes; Index 9%→56% | Vendor eval; three tasks; not commercial GA |
| Tesla Optimus ramp (reported) | Sep. 25 press | Secondary: hundreds/week at Fremont; generalization still weak | No Tesla primary here; The Information via trade press |

### Creative generation
- **September 17 — **[**Suno Studio MIDI update**](https://suno.com/release-notes/studio-improved-midi)**:** improved MIDI/audio workflows and clip controls; in-window product update.
- **September 22/23 — Gemini 3.8 TTS; September 28 — Eleven v4/Turbo:** see the voice section above.
- **September 20 — Qwen-Image-2.1:** see the multimodal release entries above.

| Release | Date | Reported release | Caveat |
| --- | --- | --- | --- |
| [Suno v6 / v6-wild / custom models](https://www.suno.com/blog/introducing-v6) | Sep. 9 — outside window; background | v6 flagship; v6-wild exploration; custom models powered by v6 | Suno-reported quality/control claims; v6 and v6-wild Pro/Premier; custom models up to three |

**Did not ship this window as a standalone model:** GPT-6.1 Astra (expected Oct flagship; secondary reporting ~Sep 28 that it was shelved over internal safety — treat as did-not-ship name hygiene, not a release row).
Also in orbit (outside this window, for context): GPT-6 Astra and Cursor Projects (Sep 16 edition); Gemini 3.8 Live base and GPT-Live-1 / Agents API (Sep 10–15); Claude Fable 5.1; Gemini 3.8 Flash intro pricing with the **Jan 1 2027** cliff still on the calendar.
Dates, prices, parameter counts, and scores are provider-reported unless a linked source names an independent harness.
## Try this week
- **Re-price one real job.** Run something you send to Astra or Fable through GPT-6.1 Sol, Sonnet 5.5, or Opus 5.5. Keep Luna or Flash for volume.
- **Test Grok 4.7 on one coding or agent loop**, and watch the ≥200k cliff ($4 / $12).
- **Time it before you buy Ultrafast.** Pick one latency-sensitive loop and ask whether a 6× rate beats waiting.
- **Move one repo to Codex in the cloud.** Turn on automatic code review or a scheduled Security Cloud scan, then read what comes back.
- **Give a Dot one narrow goal.** Review its scopes, inspect its work, and keep confirmation on send, spend, merge, and publish.
- **Staying on Opus 5?** Read the Opus 5.5 migration notes before flipping.
- **Compare Suno v6, v6-wild, and a custom model** on the same brief — Suno’s claims aren’t a listening test.
- **Read Helix 2.5 as a generalization ask:** zero-shot, new-environment numbers, not demo reels.
- **Calendar:** Gemini 3.8 Flash moves to $1.50 / $7.50 list on Jan 1, 2027.
## Practical implications for business owners and creators
This is not investment advice. It is configuration advice.
1. **Re-quote the mid-tier.** A $2/$10 GPT-6.1 Sol or Sonnet 5.5 lane, a $2/$6 Grok 4.7 lane, or a $4/$20 Opus 5.5 lane changes the math on overnight agents, migrations, and research loops that used to default to $10/$50 flags.
2. **Do not demote Astra or Fable blindly.** OpenAI still points the hardest work at Astra; Anthropic still sells Fable as the top twin. Match model to job risk.
3. **Say the full SKU.** GPT-6 Sol ≠ GPT-6.1 Sol ≠ Astra. There is no GPT-6.1 Astra GA in this window. Grok 4.7 ≠ Grok Bot. Opus 5.5 ≠ Sonnet 5.5 ≠ Fable.
4. **Voice/avatar is an enterprise surface.** Live Avatar is Gemini Enterprise today — useful if you sell support or walkthroughs, not a consumer freebie.
5. **Physical AI is a metrics story.** Helix’s Index gap (9%→56%) is the kind of number worth remembering; Optimus volume without generalization is the cautionary twin.
6. **Open weights span more jobs.** MiMo adds native multimodal agents, Naive targets general workloads, Altar focuses on security, and FLUX 3 Action links video with robot actions. Match the license, hardware needs, and evaluation to the job.
7. **Speed is now a line item.** Ultrafast charges 6× for up to 8× throughput. Pay it where a human is waiting, not where an agent works overnight.
8. **Background agents need an approval surface.** Dots, Codex cloud tasks, team tasks, and MCP-triggered automations all act while you’re away. Review scopes, inspect the work, and keep confirmation gates on consequential actions.
9. **Suno invites a controlled comparison.** Try v6, v6-wild, and a custom model; treat the result as Suno’s claim until you listen and test it yourself.
10. **Ask how safety promises are checked.** For the White House accord and NVIDIA’s partner effort, look for evaluator independence, the scope of testing, findings, and remediation before treating participation as assurance.
Meetup Q&A from [Meetup.com](http://Meetup.com) will be folded in if collected within 48 hours of the session; omitted from this embargo draft.
*Curated by Intelligence.*
