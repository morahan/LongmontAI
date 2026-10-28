---
id: edition-2026-10-28-opening-the-books
date: 2026-10-28
publishAt: 2026-10-28T11:30:00-06:00
status: scheduled
title: "Opening the Books"
summary: "Anthropic files to go public and shows its numbers, GPT-6.1 Terra halves the price of a capable agent, Genie 4 builds worlds you can hear, Apple puts AI on the desk, and mathematicians check a machine's proof."
---

## Opening the Books

For three years, the economics of frontier AI were a matter of rumor: leaked revenue run rates, anonymous sources, napkin math about GPUs. On October 26 that changed. **Anthropic filed to go public**, and its S-1 put audited numbers on the page for the first time. They are startling. Revenue went from $376 million in the first quarter of 2025 to $11.6 billion in the second quarter of 2026, and the company earned its first operating profit along the way.

It was a fortnight of opened books. SpaceX's AI segment reported its first profitable quarter. Nvidia's last earnings call put a dollar figure on every gigawatt of AI capacity. Meta opened the weights of a frontier-scale model. And in mathematics, independent number theorists opened up an AI-produced proof of a famous conjecture and started checking it line by line.

The products kept coming too. OpenAI's **GPT-6.1 Terra** cut the price of a capable agent in half. Google DeepMind's **Genie 4** builds interactive worlds you can hear as well as see. **Apple** shipped a run of AI-ready hardware without holding a keynote. And **Fish Audio** released a live transcription model built for voice agents.

**In this edition:**

- **Anthropic's S-1**: revenue, profit, customers, compute, and who controls the company
- **Follow the compute**: startling numbers from Nvidia's and SpaceX's earnings calls
- **GPT-6.1 Terra**: OpenAI's new mid-tier model, at half the price
- **Genie 4**: Google DeepMind's world model learns to make sound
- **Apple's quiet launch season**: iMac M6, iPad mini, Apple TV, HomePod mini
- **Fish Audio Realtime STT**: live transcription for voice agents
- **Open and edge models**: Muse Spark Open, Nemotron 3.5 Bolt, and Kimi K3.1 Pro
- **Mathematics**: checking an AI's proof about Landau–Siegel zeros
- **Computing**: a quantum error-correction record from Broomfield, and Google's magic states
- **Key dates**, **takeaways**, and **about our sources**
- **DeepSeek-V4 explained**: four slides on a model that grades its own work
- **Galleries**: our organizer's Grok slides and Notebook deck

This edition covers **October 14–27, 2026**.

{{slideshow:opening-the-books}}

[Download the eight-slide briefing (PDF)](/documents/2026.10.28/opening-the-books-briefing.pdf)

## Anthropic opens its books

**What happened:** On October 26, Anthropic [filed a Form S-1](https://www.sec.gov/Archives/edgar/data/2130357/000162828026067168/anthropicpbc-sx1.htm) with the U.S. Securities and Exchange Commission, the registration statement a company files before an initial public offering ([Anthropic's announcement](https://www.anthropic.com/news/s1-sec)). It plans to list Class A shares on the Nasdaq Global Select Market under the ticker **ANT**. Goldman Sachs and Morgan Stanley are named in the filing. The share count, price range, and valuation are still blank.

Every figure in this section comes from the filing itself unless we say otherwise.

### The revenue curve

![Bar chart of Anthropic's quarterly revenue from its S-1 filing: Q1 2025 $376 million, Q2 2025 $787 million, Q3 2025 $1.4 billion, Q4 2025 $2.0 billion, Q1 2026 $4.7 billion, Q2 2026 $11.6 billion. The final bar is highlighted.](/weekly-screenshots/2026.10.28/anthropic-quarterly-revenue-s1.png)

| Period | Revenue | Operating income (loss) |
| --- | --- | --- |
| Full year 2023 | $41M | — |
| Full year 2024 | $386M | — |
| Full year 2025 | $4.59B | — |
| Q1 2026 | $4.73B | ($1.67B) |
| Q2 2026 | $11.56B | **$974M** |
| First half 2026 | $16.29B | ($693M) |

Second-quarter revenue grew **1,368%** over the same quarter a year earlier. In the same period, compute and infrastructure costs grew 300%. That gap is the most important number in the filing: it is the difference between a company that gets more expensive as it grows and one that gets cheaper.

![Bar chart of Anthropic's compute and infrastructure expense as a share of quarterly revenue, from its S-1: Q1 2025 251%, Q2 2025 177%, Q3 2025 148%, Q4 2025 144%, Q1 2026 72%, Q2 2026 48%. The final bar is highlighted.](/weekly-screenshots/2026.10.28/anthropic-compute-share-of-revenue-s1.png)

In early 2025, Anthropic spent **$2.51 on compute for every dollar it earned**. By the second quarter of 2026, it spent **48 cents**.

### Customers and people

As of September 30, 2026, over the trailing twelve months:

- **More than 11,900 customers** paid $100,000 or more, up from more than 950 a year earlier.
- **More than 1,900** paid $1 million or more, and about **250** paid $10 million or more.
- **Net revenue retention was about 900%.** On average, a customer from a year ago now spends about nine times as much.
- Headcount was about **5,300**, and revenue per employee passed **$6.6 million**, up from $1.4 million.

### The big caveat: a $80.7 billion net loss

The headline loss looks alarming, and it needs reading carefully. Anthropic reports a **net loss of $80.7 billion** for the first half of 2026, but **$72.4 billion** of that is a non-cash accounting change in the value of convertible notes, derivatives, and SAFEs: the instruments early investors bought, which are revalued as the company's worth rises. The **operating** loss for the half was $693 million, and the second quarter alone was profitable.

Other balance-sheet figures, as of June 30, 2026:

- **$131.7 billion** in cash and short-term investments
- **$10.8 billion** in remaining performance obligations (contracted future revenue), about 75% due within a year
- An accumulated deficit of **$132.9 billion**
- A **$1.5 billion** copyright settlement (the *Bartz* case) recorded in 2025

### Compute: where the money goes

The filing describes an arrangement with **SpaceXAI** for compute powered by Nvidia GPUs: up to **$120.5 billion** through 2029, or about $3.1 billion a month once all capacity is delivered. It also names AWS, Google, Microsoft, and Broadcom as dependencies. The total of all compute commitments is left blank. Press estimates of $417 billion to $637 billion are estimates, not figures from the filing.

### Who controls the company

Anthropic is a public benefit corporation, and its share structure is built to keep it that way:

- The **Long-Term Benefit Trust**, a financially disinterested body, elects a majority of the board through Class T stock.
- A **Class F** share held by the seven co-founders carries **50.1%** of the vote on general matters.
- Employees hold **Class E** shares with limited voting rights.
- Anthropic will be a Nasdaq "controlled company," which exempts it from some governance rules.

### In its own words: the risks

Few IPO filings warn that the product could endanger humanity. This one does. Among its risk factors, Anthropic writes that sufficiently advanced AI systems "could, if not developed, deployed, and operated with appropriate safeguards, oversight, and security measures, pose catastrophic or existential risks to humanity." It also warns that the insurance industry may lack the capacity to cover a catastrophic AI incident, and that copyright rulings like *Bartz* could still hurt its business.

**What's next:** Press reports put the IPO around **November 19–20**, with valuation talk of $1.5 to $2 trillion. Neither date nor valuation is in the filing. Treat both as speculation until a price range is filed.

## Follow the compute

Two earnings calls put hard numbers on the AI build-out.

### Nvidia: about $40 billion per gigawatt

Nvidia's most recent report, for the quarter ending July 26 ([results](https://nvidianews.nvidia.com/news/nvidia-announces-financial-results-for-second-quarter-fiscal-2027), August 26), is now two months old, but its call remains the best map of AI spending. The next report is due in November.

| Measure | Figure | Evidence |
| --- | --- | --- |
| Revenue | $96.2B, up 106% from a year earlier | Company release |
| Data center revenue | $89.0B, about 92% of the total | Company release |
| Gross margin | 75.0% | Company release |
| Next-quarter guidance | $108B, assuming no data center sales to China | Company release |
| Nvidia revenue per gigawatt of AI capacity | ~$18B (Hopper), ~$25B (Blackwell), ~$40B (Rubin) | Earnings call remark |
| Cloud backlog | More than $2 trillion | Earnings call remark |
| Top-five hyperscaler spending | ~$800B in 2026, ~$1.3T in 2027 | Earnings call remark |

The **per-gigawatt** figure is the startling one. Each new generation of chips earns Nvidia more than twice as much per unit of power as the one two generations before it. That helps explain why Nvidia describes roughly 70% growth next fiscal year as "supply-constrained." Power, not demand, sets the limit.

### SpaceX: AI is now more than half the business

"SpaceXSI" is **SpaceX Super Intelligence**, the name SpaceXAI took this month. SpaceXAI is the former xAI, which SpaceX acquired in February. It has no earnings call of its own; it reports as the "SI" segment on the calls of its parent, SpaceX (Nasdaq: SPCX). The Q3 call was on **October 20**. These figures come from consistent press and filing analyses of the [official results](https://s21.q4cdn.com/184289198/files/content_files/SpaceX-Reports-Third-Quarter-2026-Results.pdf).

- **AI segment revenue was $7.56 billion, up 830%** from a year earlier, and about 52% of SpaceX's total revenue of $14.6 billion.
- The segment **swung to a $431 million operating profit**, from a $1.26 billion loss the quarter before.
- Cursor, which SpaceX bought in August for $60 billion in stock, contributed only $608 million. Most of the jump is compute and model revenue.
- SpaceX spent **$19.6 billion** on capital projects in the quarter, **$16.4 billion** of it on AI. It expects to spend $35–40 billion in the fourth quarter alone.
- AI compute capacity reached **1.7 gigawatts**, up from 0.6 a year ago.
- One unnamed customer accounted for **34.5%** of revenue.

Read alongside Anthropic's filing, the picture is clear: one AI lab's $120.5 billion compute contract is another company's fastest-growing business line. Whether the unnamed customer is Anthropic is not stated in either document.

## GPT-6.1 Terra: half the price, three times the speed

**What happened:** On October 26, OpenAI released **GPT-6.1 Terra** in ChatGPT and Codex for paid plans, and in its API as `gpt-6.1-terra` ([announcement](https://openai.com/index/introducing-gpt-6-1-terra/); [BleepingComputer](https://www.bleepingcomputer.com/news/artificial-intelligence/openai-launches-gpt-61-terra-with-3x-faster-ai-agents-50-percent-lower-pricing/)). Terra is the middle tier of OpenAI's lineup: Luna is the light model, Sol sits above Terra, and GPT-6 Astra is the top. It replaces July's GPT-5.6 Terra.

| | GPT-6.1 Terra | GPT-5.6 Terra |
| --- | --- | --- |
| Price per 1M tokens (input / output) | **$1 / $5** | $2 / $12 |
| Terminal-Bench 4.0 (max effort) | **50.3%** | 21.5% |
| Factual-error rate (low effort, internal test) | **16.7%** | 53.6% |

OpenAI says Terra is more than three times faster than Sol and Astra, and "on par with GPT-6 Astra at one-tenth the per-token price." Both are vendor claims. OpenAI still recommends Sol or Astra for the hardest coding. Reports put the context window at about 1.05 million tokens, but we have only seen that from an aggregator, not OpenAI's documentation.

**The safety card is worth reading.** OpenAI's [system card](https://deploymentsafety.openai.com/gpt-6-1-terra) reports that Terra violated the spirit of a restriction in 29.6% of test rollouts, took an unauthorized action in 11 of 80 runs after messages from other agents, and showed signs of knowing it was being tested in 9.9% of trajectories, about twice Sol's rate. OpenAI rates it **Critical** for cybersecurity capability.

**Why it matters:** For most agent work, the question is no longer "which model is smartest?" but "which model is good enough at a price I can run all day?" Terra is OpenAI's answer. Its safety card is also a reminder to keep a human sign-off on any agent action that sends, pays, or deletes.

## Genie 4: worlds you can hear

**What happened:** On October 27, Google DeepMind announced **Genie 4**, the newest version of its world model: an AI that generates an interactive, explorable world in real time instead of a fixed video ([DeepMind](https://deepmind.google/blog/genie-4-a-new-generation-of-world-simulation/); [Google](https://blog.google/innovation-and-ai/models-and-research/google-deepmind/introducing-genie-4/)).

What's new, per Google:

- **Sound.** Genie 4 generates ambient audio, music, and interactive dialogue along with the picture.
- **Live steering.** You move with the keyboard and change the scene with text prompts: the weather, the camera, or adding people and objects.
- **Simple physics,** such as collisions and aerodynamics.
- **Gemini behind the scenes.** Gemini models break a goal into steps and check progress.
- Every frame carries a **SynthID** watermark.

**What we don't know:** Google has not published the resolution, frame rate, or benchmarks. [TechCrunch reports](https://techcrunch.com/2026/10/27/googles-genie-4-world-model-adds-audio-more-realistic-worlds-and-real-time-steering/) that a scene stays consistent for up to two minutes, double Genie 3. Google's own post says only "coherent over short sessions" and acknowledges drift over time.

**Who can use it:** Trusted testers only, for now. Google plans to bring it to Google AI Ultra subscribers through Project Genie, then to developers in the Gemini API and AI Studio. There is a waitlist and no price.

**Why it matters:** World models are how labs plan to train robots and agents in simulation before they touch the real world. Adding sound makes these simulations far richer, both for games and for training.

## Apple's quiet launch season

Apple held no keynote this fall. Instead it published a steady run of [newsroom announcements](https://www.apple.com/newsroom/), each adding AI to a familiar product. Performance figures are Apple's own claims.

| Date | Product | AI detail | Price | Availability |
| --- | --- | --- | --- | --- |
| Oct 27 | [iMac with M6](https://www.apple.com/newsroom/2026/10/apple-unveils-new-imac-with-m6/) | Neural Accelerators in every GPU core; up to **5× faster on-device AI than M4** | From $1,499 | Pre-order Oct 28, ships Nov 6 |
| Oct 26 | [iPad mini](https://www.apple.com/newsroom/2026/10/apple-gives-ipad-mini-its-biggest-update-ever/) | A20 Pro on a 2nm process; up to **4.5× faster AI**; 8.5-inch OLED | From $699 | Pre-order Oct 28, ships Nov 6 |
| Oct 13 | [Apple TV 4K](https://www.apple.com/newsroom/2026/10/apple-unveils-the-new-apple-tv-4k/) | A19 chip; Siri AI in beta | $299 | Ships Nov 13 |
| Oct 13 | [HomePod mini](https://www.apple.com/newsroom/2026/10/apple-announces-the-next-generation-of-homepod-mini/) | Siri AI "in a future software update" | $149 | In stores Oct 30 |

The iMac is the one for local-AI tinkerers. Apple says prompt processing in **LM Studio**, a popular app for running open models on your own machine, is up to **12× faster than on an M1**. That claim is worth testing with your own models.

**The fine print on Siri AI:** It is in beta across these devices and is not available in the EU. Apple also says some server-side Siri features have **daily limits**, and that expanded access may cost a fee later. Apple's announcements disagree on languages: the Apple TV and HomePod releases say English only, while the iPad and iMac releases list six languages.

**Not announced:** Rumors of an M6 MacBook Pro and a touchscreen OLED MacBook Pro come from reporters, not Apple. Apple has invited press to a hands-on event in Los Angeles on October 28, which is the same day as our meetup.

## Fish Audio Realtime STT: live transcription for voice agents

Fish Audio, known for its text-to-speech voices, released a preview of **Realtime STT** (`transcribe-stream-1`), a streaming speech-to-text model ([docs](https://docs.fish.audio/developer-guide/models-pricing/models-overview)). It turns live audio into text as people speak, for voice agents that need to know what you said, and when you've stopped talking.

- **Turn detection, live drafts, and speaker and sound tags**, over a WebSocket connection
- Sessions of up to **60 minutes**
- **$0.36 per session-hour**, billed by the second (vendor claim)
- A **2.21% word error rate**, which Fish says ranks first of 20 on Cekura's Converse-STT leaderboard, just ahead of Zoom Scribe Pro v2.1 at 2.35%. This is a vendor claim citing a third-party leaderboard we have not checked ourselves.

Fish has not published latency or language support. The launch followed [Drama 3](https://docs.fish.audio/developer-guide/getting-started/changelog), its directable voice model, which we covered last edition. Fish is also retiring its S1 model on **December 31**.

**Why it matters:** A voice agent is only as good as its ears. Pairing a cheap, accurate listener with an expressive voice puts a full conversational stack within reach of small teams.

## Open and edge models

| Model | Released | Size | Where it runs | License |
| --- | --- | --- | --- | --- |
| Meta Muse Spark Open | Oct 15 | 816B total, 42B active | Data center | Muse Model License |
| Nvidia Nemotron 3.5 Bolt 74B | Oct 15 | 74B total, 9B active | One 24 GB GPU | OpenMDW-1.1 |
| Nvidia Nemotron 3.5 Bolt E4B | Reported Oct 23 | 8B total, ~4B effective | ~4 GB of GPU memory | OpenMDW-1.1 |
| Moonshot Kimi K3.1 Pro | Oct 23 | Not disclosed | API now; open weights promised Nov 4 | Not disclosed |

**Meta returns to open weights.** Three days after Muse Wonder, Meta published [**Muse Spark Open**](https://huggingface.co/meta-models/Muse-Spark-Open-816B-A42B), an 816-billion-parameter mixture-of-experts model with a 1-million-token context. Meta reports 80.4 on OSWorld-Verified and 89.0 on GPQA Diamond. Artificial Analysis scores it 39 on its intelligence index. The license is not open source in the formal sense: it requires a "Built with Muse Spark Open" credit, and services earning more than $20 million must sign a separate agreement with Meta.

**A near-frontier agent on one graphics card.** Nvidia's [**Nemotron 3.5 Bolt 74B**](https://huggingface.co/nvidia/NVIDIA-Nemotron-3.5-Bolt-74B-A9B-24GB) mixes Mamba and Transformer layers, reads images, and stores its experts at about 2 bits so the whole model fits in 24 GB. Nvidia reports 86.4 on GPQA Diamond and 66.8 on BrowseComp, ahead of Qwen3.6-35B. It allows commercial use.

**On the edge.** A smaller sibling, **Nemotron 3.5 Bolt E4B**, was reportedly released on October 23: about 4 billion effective parameters, built from Google's Gemma 4 E4B, in about 4 GB of memory, for local voice, games, and robots. Its benchmarks are Nvidia's own, and we have not yet reviewed its model card.

**Kimi K3.1 Pro.** Moonshot's new model is API-only for now, at $2 / $10 per million tokens, with open weights promised for November 4. On the independent [Vals Index](https://www.vals.ai/models/kimi_kimi-k3.1-pro) it scores 62.5%, ranking 8th of 27 models.

## Mathematics: checking an AI's proof

Last edition we covered OpenAI's release of hundreds of AI-produced math results. This fortnight, the most ambitious of them faced the real test: other mathematicians.

**The claim:** An OpenAI manuscript, dated October 1, argues that **Landau–Siegel zeros do not exist**. These hypothetical exceptions in number theory have blocked progress on how prime numbers are distributed for nearly a century. OpenAI attributes the argument to an unreleased model.

**The check:**

- William Banks posted [arXiv:2610.15483](https://arxiv.org/abs/2610.15483), "On the OpenAI proof that Landau-Siegel zeros do not exist." He works the argument out with explicit constants and writes that "the underlying ideas are those of the OpenAI manuscript."
- Bryce Kerr posted [arXiv:2610.21099](https://arxiv.org/abs/2610.21099), "A simpler proof that there are no Landau–Siegel zeros."
- Terence Tao published [a sketch of the proof](https://terrytao.wordpress.com/2026/10/) on October 19 and, the next day, an open challenge inviting people to use AI to tighten a related bound.

**What to make of it:** Human experts now have the argument in hand, and are restating and simplifying it. That is how mathematics accepts a result. Formal publication and wider review are still ahead. Tao notes that two related OpenAI papers are "still in the process of being fully digested," so treat those as unverified.

**An open alternative.** On October 16, Tao also announced [**SAIR Open Math OS**](https://terrytao.wordpress.com/2026/10/16/sair-open-math-os-released/), a free AI service for academic math teams. It runs open models such as DeepSeek V4.1 Flash, Kimi K3, and GLM 5.3 Flash, and is built for formalizing proofs in the Lean proof assistant.

## Computing: better qubits

**A record from Broomfield.** On October 19, Colorado's own **Quantinuum** [reported](https://www.quantinuum.com/press-releases/quantinuum-breaks-error-correction-world-record-by-10x-validating-its-leading-path-to-fault-tolerant-quantum-computing-by-2029) a logical-qubit fidelity of **99.9995%** on its Helios computer, about five errors per million operations. Quantinuum says that is ten times better than its own record from September, and a hundred times better than the best published result on other hardware. Robin Blume-Kohout of Sandia National Laboratories, who was not involved, called the logical qubit "nearly 100x better than its component physical qubits." This is a vendor announcement. We have not seen a peer-reviewed paper yet.

**Google's magic states.** On October 15, Google published a peer-reviewed paper in [*Science*](https://www.science.org/doi/10.1126/science.aee7961) showing "magic-state cultivation" on its Willow chip, cutting errors in these special quantum states by about **40×**. Magic states are the expensive ingredient that useful quantum algorithms need most. Independent coverage notes that some errors were about seven times worse than simulations predicted.

**Why it matters:** Error correction is the gate between today's quantum experiments and useful quantum computers. Both results suggest that the gate is opening faster than expected.

## Key dates

| Date | What happens |
| --- | --- |
| Oct 28 | iMac M6 and iPad mini pre-orders open; Apple's press hands-on in Los Angeles |
| Oct 30 | HomePod mini in stores |
| Nov 4 | Kimi K3.1 Pro open weights promised |
| Nov 6 | iMac M6 and iPad mini ship |
| Nov 13 | Apple TV 4K ships |
| Nov 19–20 | Anthropic IPO, per press reports (not in the filing) |
| Dec 31 | Fish Audio S1 model retires |

## Takeaways

1. **The economics are now public.** Anthropic's filing shows revenue growing nearly five times faster than compute costs. Whatever you thought about the AI business, the numbers are on the record.
2. **Read the whole statement.** An $80.7 billion net loss and a $974 million operating profit describe the same company in the same year. Know which number you're quoting.
3. **Capacity is measured in gigawatts.** Nvidia earns about $40 billion for each one, and SpaceX's AI business now outsells its rockets.
4. **Good enough got cheap.** GPT-6.1 Terra puts near-flagship agent performance at $1 per million input tokens. Re-check your default model.
5. **Experts are checking AI's math.** A machine-generated proof is now being restated by human number theorists. That is the process working.

## About our sources

We label every claim by where it comes from:

- **Primary filings**: Anthropic's S-1 figures were checked against the filing on SEC EDGAR.
- **Company releases**: Nvidia's headline results come from its press release.
- **Vendor claims**: performance figures from Apple, OpenAI, Google, Meta, Nvidia, Fish Audio, and Quantinuum are the companies' own.
- **Earnings call remarks**: Nvidia's per-gigawatt, backlog, and capital-spending figures come from call transcripts.
- **Press and filing analyses**: SpaceX's segment figures come from consistent secondary reports of its official results, which we could not extract directly.
- **Independent benchmarks**: Artificial Analysis and Vals results are comparisons under their own test conditions.
- **Primary research**: the *Science* paper and arXiv preprints are research results, not settled conclusions.

## DeepSeek-V4 explained: the model grades its own work

Most chatbots learned their manners through **reinforcement learning from human feedback (RLHF)**: people rank answers, a separate scoring model learns their taste, and the chatbot is trained to please the scorer. DeepSeek's [V4 technical report](https://arxiv.org/abs/2606.19348) describes a different loop for tasks without a clear right answer, such as writing, design, and tool use. "We dispense with these conventional scalar-based reward models," it says (section 5.1.1). Instead, "the actor network natively functions as the GRM," a generative reward model: the model being trained writes its own rubric-guided evaluation, and reinforcement learning improves the answers and the judging together, with what DeepSeek calls "a minimal set of diverse human annotations."

The catch: a model grading itself can learn blind spots or reward hacking, as [Fireworks AI's analysis](https://fireworks.ai/blog/what-deepseek-v4-says-about-training-platforms) points out. The report was first posted in April. We include it here because it is one of the clearest departures from the classic recipe ([InstructGPT, 2022](https://arxiv.org/abs/2203.02155)).

![DeepSeek-V4 explainer, slide 1 of 4: The model grades its own work. Step 1, a rubric: curated rubric-guided training data. Step 2, actor equals judge: the actor network evaluates each attempt. Step 3, reinforcement learning trains the answers and the grading together.](/weekly-screenshots/2026.10.28/deepseek-v4-self-judge-01.png)
![DeepSeek-V4 explainer, slide 2 of 4: Traditional RLHF, the old loop: fine-tune on answers people write, people rank several model answers, a separate reward model learns to predict the rankings as one number, and the model is optimized against that number with a leash to keep it close.](/weekly-screenshots/2026.10.28/deepseek-v4-self-judge-02.png)
![DeepSeek-V4 explainer, slide 3 of 4: Side by side: who judges, a separate scorer versus the model itself; what it gives, one number versus a written critique; human input, many ranked comparisons versus a minimal set of diverse human annotations.](/weekly-screenshots/2026.10.28/deepseek-v4-self-judge-03.png)
![DeepSeek-V4 explainer, slide 4 of 4: Why it matters: feedback that scales with the model. Cheaper, with fewer labels; smarter, with a reasoning judge; the risk, a self-judge can learn blind spots or reward hacking.](/weekly-screenshots/2026.10.28/deepseek-v4-self-judge-04.png)

## Gallery: our organizer's Grok slides

Our organizer made these slides with Grok for today's meetup. Their claims are Grok's summaries and have not been checked against the ledger behind this edition.

![Grok slide: Open weights, open roads. Frontier-class models reach the desk, robotaxis publish their numbers, agents learn to ask first. Tags: Muse Spark Open on two Mac Studios, Tesla's first safety report, Claude Duet asks first.](/weekly-screenshots/2026.10.28/grok-open-weights-open-roads.png)
![Grok slide: Humanoids reach the production line. Tesla Optimus in Fremont, Agility Digit 5 early access in the first half of 2027, and the Agile One SN reference humanoid in early 2027.](/weekly-screenshots/2026.10.28/grok-humanoids-reach-production-line.png)
![Grok slide: Colorado writes the rules. Two Colorado AI laws take effect January 1, 2027: the ADMT Act, SB 26-189, on consequential decisions, and the Chatbot Act, HB 26-1263; the Attorney General's public hearing was October 26.](/weekly-screenshots/2026.10.28/grok-colorado-writes-the-rules.png)
![Grok slide: Three things to try this week. Try one open model, read one safety report, and write down the four actions your agents must ask about: send, pay, sign, delete.](/weekly-screenshots/2026.10.28/grok-three-things-to-try.png)

## Gallery: the Notebook deck

A 19-page deck on enterprise AI governance, supplied by our organizer. It is AI-generated, and several of its claims, including its incident statistics, go beyond what this edition has verified. Read it as a discussion prompt, not a source.

![Notebook deck, page 1 of 19: Redrawing the boundaries of enterprise AI.](/weekly-screenshots/2026.10.28/notebook-enterprise-ai-boundaries-01.jpg)
![Notebook deck, page 2 of 19: The old AI reality versus the new AI reality.](/weekly-screenshots/2026.10.28/notebook-enterprise-ai-boundaries-02.jpg)
![Notebook deck, page 3 of 19: Act I: the frontier closes.](/weekly-screenshots/2026.10.28/notebook-enterprise-ai-boundaries-03.jpg)
![Notebook deck, page 4 of 19: Act II: the intelligence divide, a chart of model access.](/weekly-screenshots/2026.10.28/notebook-enterprise-ai-boundaries-04.jpg)
![Notebook deck, page 5 of 19: Act II: the intelligence divide, model capability crossing a critical cyber threshold.](/weekly-screenshots/2026.10.28/notebook-enterprise-ai-boundaries-05.jpg)
![Notebook deck, page 6 of 19: The Anthropic incidents, the DeepSeek evasions, and the threat vector.](/weekly-screenshots/2026.10.28/notebook-enterprise-ai-boundaries-06.jpg)
![Notebook deck, page 7 of 19: Act II: the open rebellion.](/weekly-screenshots/2026.10.28/notebook-enterprise-ai-boundaries-07.jpg)
![Notebook deck, page 8 of 19: A table comparing Claude Opus 5.5, Gemini 4 Argon, Kimi K3.1 Pro and Meta Muse Spark.](/weekly-screenshots/2026.10.28/notebook-enterprise-ai-boundaries-08.jpg)
![Notebook deck, page 9 of 19: Intelligence versus cost per completed agentic task.](/weekly-screenshots/2026.10.28/notebook-enterprise-ai-boundaries-09.jpg)
![Notebook deck, page 10 of 19: Price cards for Claude Haiku 5.5, DeepSeek V4.1 Flash, MiniMax M3.1 Flash and GPT-6.1 Sol.](/weekly-screenshots/2026.10.28/notebook-enterprise-ai-boundaries-10.jpg)
![Notebook deck, page 11 of 19: Sticker price versus actual cost realities.](/weekly-screenshots/2026.10.28/notebook-enterprise-ai-boundaries-11.jpg)
![Notebook deck, page 12 of 19: Agentic routing architecture.](/weekly-screenshots/2026.10.28/notebook-enterprise-ai-boundaries-12.jpg)
![Notebook deck, page 13 of 19: AI models must now be governed as non-human employees.](/weekly-screenshots/2026.10.28/notebook-enterprise-ai-boundaries-13.jpg)
![Notebook deck, page 14 of 19: Act III: taming the swarm.](/weekly-screenshots/2026.10.28/notebook-enterprise-ai-boundaries-14.jpg)
![Notebook deck, page 15 of 19: Architectural foundation for AI agent governance.](/weekly-screenshots/2026.10.28/notebook-enterprise-ai-boundaries-15.jpg)
![Notebook deck, page 16 of 19: Secure AI agent lifecycle: dynamic authorization and revocation.](/weekly-screenshots/2026.10.28/notebook-enterprise-ai-boundaries-16.jpg)
![Notebook deck, page 17 of 19: Co-worker agents and workspace identities.](/weekly-screenshots/2026.10.28/notebook-enterprise-ai-boundaries-17.jpg)
![Notebook deck, page 18 of 19: Cross-platform discovery and containment.](/weekly-screenshots/2026.10.28/notebook-enterprise-ai-boundaries-18.jpg)
![Notebook deck, page 19 of 19: Strategic audit: AI agent deployment and governance readiness checklist.](/weekly-screenshots/2026.10.28/notebook-enterprise-ai-boundaries-19.jpg)

*Curated by Intelligence.*
