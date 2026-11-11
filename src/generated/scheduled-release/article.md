---
id: edition-2026-11-11-promised-weights-gated-agents
date: 2026-11-11
publishAt: 2026-11-11T11:30:00-07:00
status: scheduled
title: "Promised weights, gated agents"
summary: "Anthropic shipped Claude Fable 5.2 and kept Mythos 5.2 behind an application, Google opened Gemini 4 Carbon to paying users, Meta and Mistral pushed prices and open weights, Moonshot kept its weights promise while Tencent's and Thinking Machines' were still pending, agents gained checkpoints and better memory, and Colorado's AI rules were still being finished."
---

## Promised weights, gated agents

Last edition ended with a promise: Moonshot said it would publish the full weights of its Kimi K3.1 Pro model by November 4. Did it? This fortnight we can check. (Weights are the downloadable file that holds a model's learned settings. If you have the file, you can run the model yourself.)

The answer is yes for Moonshot, not yet for two others. Tencent said on November 4 that it would release weights "in the coming days," and Thinking Machines said on November 5 that it intends to release weights "next week." As of November 10, neither file had shipped. Meanwhile the biggest new models arrived with gates attached: Anthropic released Claude Fable 5.2 to everyone but kept its twin, Mythos 5.2, for approved organizations, and Google opened Gemini 4 Carbon to paying users two weeks after giving it only to security teams. The leash on AI agents, the rules for what an agent may touch and when it must stop, kept showing up as a product feature you can switch on.

The thread running through all of it: **promises kept versus promises still pending**, and **gates and leashes as product features**. A promise is an announcement. A file you can download, a setting you can switch on, or a number someone else measured is something you can check.

**In this edition:**

- **New this fortnight: the release board**: Claude Fable 5.2 and Mythos 5.2, Gemini 4 Carbon, Meta's Muse Ember, ChatGPT Images 2.6, Mistral Large 4's open weights, and a Grok 4.8 promise
- **Weights: promised vs. shipped**: Kimi K3.1 Pro, Tencent Hy4, and Thinking Machines' Inkling 2 Small
- **The cost of a token vs. the cost of a task**: effort settings, per-task prices, message threads, and complaints about xAI's Grok Bot
- **Agents get checkpoints**: Claude Enterprise inference hooks, AWS desktops for agents, OpenAI's GPT-6 Cyber, and a study of who really makes the call
- **Agents that remember, and "dream"**: Anthropic's research on agent memory, and what it might mean for Claude Duet
- **Robotaxis: more cities, still-sealed paperwork**: Tesla in San Antonio, Waymo in Los Angeles and San Diego, and a confidentiality request to NHTSA
- **Humanoids and robots: orders, listings, a 24-hour store shift, and a fooled camera**
- **Colorado**: AI rules still pending, a Denver permit checker, and Boulder County's data-center hearing
- **Links and videos**, **names that are easy to mix up**, **key dates**, and **takeaways**

This edition covers **October 29–November 11, 2026** (America/Denver).

> **Evidence note:** Model, agent, robot, and city announcements come from the companies themselves, and benchmark scores, prices, and trial results are vendor-reported unless we name an independent source. A demo is not proof of production reliability. Posts on X are linked so you can watch them; they are people's own claims and test runs, not primary sources. Statements that something had "not shipped" describe what was public on November 10, and they can change quickly.

![Cover slide for the November 11 briefing: "Promised weights, gated agents."](/weekly-screenshots/2026.11.11/slide-01-cover.png)

## New this fortnight: the release board

![Slide: "New this fortnight." Cards for Claude Fable 5.2, Gemini 4 Carbon, Muse Ember, and Mistral Large 4's open weights.](/weekly-screenshots/2026.11.11/slide-02-release-board.png)

Here is what the big labs and the open-weight crowd shipped between October 29 and November 10. Prices are the vendors' list prices per million tokens (input / output). "Open weights" means you can download the model file.

| Date | Model | Company | Open weights? | What it's for | List price |
| --- | --- | --- | --- | --- | --- |
| Oct 29 | Mistral Large 4 | Mistral | **Yes** (modified MIT) | Coding, security, general work | $0.70 / $2.10 |
| Nov 4 | ChatGPT Images 2.6, GPT-Image-2.6 Sunburst and Flare | OpenAI | No | Images, GIFs, SVG drawings | per image |
| Nov 4 | Kimi K3.1 Pro (weights) | Moonshot | **Yes** (custom license) | Coding and long agent work | see below |
| Nov 4 | Hy4 | Tencent | Promised, not yet | General, agents | $0.90 / $2.70 |
| Nov 5 | Inkling 2 Small | Thinking Machines | Promised, not yet | Long workflows, images | hosted only |
| Nov 5 | GPT-6 Cyber | OpenAI | No; approved customers only | Security research | restricted |
| Nov 5 | Gemini Omni 1.2 Flash | Google | No | Short video clips | $0.07 per second |
| Nov 9 | **Claude Fable 5.2** | Anthropic | No | Hardest technical work | $8 / $40 |
| Nov 9 | Claude Mythos 5.2 | Anthropic | No; approved organizations only | Security and biology research | $8 / $40 |
| Nov 9 | Muse Ember | Meta | No | Cheap, repeated agent steps | $0.10 / $0.50 |
| Nov 10 | Gemini 4 Carbon (wide release) | Google | No | Hardest technical work | $2 / $10 intro, then $4 / $20 |
| Nov 10 | MiniMax H3-Image (weights) | MiniMax | **Yes** (custom license) | Image generation | free download |

### Claude Fable 5.2 and Mythos 5.2: one model, two gates

**What happened:** On November 9, [Anthropic released Claude Fable 5.2 and Claude Mythos 5.2](https://www.anthropic.com/claude-fable-and-mythos-5-2), the upgrades to its top-tier models from September's 5.1 versions. Anthropic says the two are **the same underlying model**. Fable comes with strong cybersecurity and biology safeguards, so anyone on a paid Claude plan or the API can use it. Mythos is the less-restricted version, and organizations doing security or biomedical research must apply for it through Anthropic's verification programs. That is a gate you can see.

**The numbers, all Anthropic-reported:**

- **Price:** $8 per million input tokens and $40 per million output tokens, down from $10 and $50 for Fable 5.1, according to [Anthropic's Fable page](https://www.anthropic.com/claude/fable). An optional fast mode generates up to 2.5 times faster for $16 and $80.
- **Speed:** outputs up to 30% faster than the 5.1 models.
- **Benchmarks:** on FrontierCode 2.0, a test of whether a repository's maintainers would accept the model's code change, Anthropic reports **49.1%** at its highest effort setting, against 45.5% for Claude Opus 5.5, 42.8% for GPT-6 Astra, and 41.1% for Gemini 4 Carbon. Anthropic picked the tests and ran most of them, so treat it as the vendor's view. In its own table, Gemini 4 Carbon beats Fable 5.2 on one business-workflow test (53.9% vs. 51.4% on AutomationBench).
- **Claims from testing:** Anthropic says the models helped design three working electronic devices, solved two open physics problems about black holes, and formalized the proof of Fermat's Last Theorem in 30 hours. These are company accounts; the details are in its [system card](https://www.anthropic.com/claude-fable-and-mythos-5-2).

**Fine print worth knowing:** Anthropic itself says most coding and knowledge work should **start with Claude Opus 5.5** and move up to Fable only when needed. The [developer documentation](https://platform.claude.com/docs/en/models/fable-5-2/overview) says Fable 5.2 requires 30-day data retention and isn't available under zero data retention unless Anthropic expressly authorizes it, which matters if your contracts promise customers their data isn't stored. [CNBC](https://www.cnbc.com/2026/11/09/anthropic-claude-fable-5-2-mythos-5-2.html) notes this is Anthropic's first frontier release since CEO Dario Amodei called in September for slowing AI development, and that it comes as the company prepares for a possible IPO.

### Gemini 4 Carbon: from security teams to paying users

**What happened:** Google [announced Gemini 4 Carbon on October 28](https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-gemini-4-carbon/) and gave it first only to cybersecurity defenders in its Fairwind Program. On November 10, it [made Carbon available](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-4-carbon-now-available/) to all paying developers and businesses through the Gemini API and Gemini for business, and to Google AI Ultra subscribers in the Gemini app, AI Mode in Search, and Antigravity, Google's agent coding tool. Google says Gemini 4 Argon is still the better pick for most work, and that Carbon is for the hardest problems and uses more tokens to think them through. [Google's own post on X](https://x.com/Google/status/2120186185423159331) has a short launch video.

- **Price:** an introductory $2 per million input tokens and $10 per million output through November 30, 2026, then $4 and $20.
- **Benchmarks, Google-reported:** Google says Carbon ranks first on CursorBench 4.0, Perplexity's WANDR, and Zapier's AutomationBench at less than half the cost per task of the next-best outside model. Those tests are run by other companies, but Google chose which results to highlight.
- **New tool:** a preview of "/swarm" in Antigravity, which turns one prompt into a team of coordinated agents.

[The Verge](https://www.theverge.com/ai-artificial-intelligence/1030787/google-gemini-4-carbon-public-rollout) points out the catch we keep coming back to: a cheaper price per token does not guarantee a cheaper job, because models use different numbers of tokens for the same task.

### Muse Ember: Meta's cheap worker model

**What happened:** On November 9, [Meta introduced Muse Ember](https://research.meta.ai/blog/muse-ember), its smallest and cheapest Muse model, built for the small steps agents repeat all day: tool calls, coding subtasks, routing, pulling data out of documents. Alexandr Wang, who leads Meta Superintelligence Labs, [announced it on X](https://x.com/alexandr_wang/status/2119853374158032950) with a cost chart.

- **Price:** $0.10 per million input tokens and $0.50 per million output, with higher rates for requests over 200,000 input tokens, per [Meta's developer documentation](https://dev.meta.ai/docs/muse-ember) (VentureBeat lists them as $0.30 and $1.50). It reads text, images, audio, video, and PDFs.
- **Independent check:** [VentureBeat reports](https://venturebeat.com/technology/metas-proprietary-muse-ember-nearly-matches-claude-haiku-5-5-at-1-3-the-estimated-per-task-cost) that in Artificial Analysis's launch testing, Ember scored 36 on that firm's Intelligence Index, the same rounded score as Claude Haiku 5.5, at about **14 cents per task versus 41 cents** for Haiku.
- **Not open weights.** Ember is a hosted, proprietary model. [TechCrunch](https://techcrunch.com/2026/11/09/meta-releases-muse-ember-a-new-lightweight-model-for-agent-execution/) describes Meta's open-weight Muse model as Glimmer, an open twin of Muse Spark released in August.

Meta's pitch is the pattern to remember: a big model plans, and a cheap model does the volume.

### ChatGPT Images 2.6

On November 4, OpenAI [released ChatGPT Images 2.6](https://openai.com/products/release-notes/) for all ChatGPT users, including the free tier, plus two developer models: GPT-Image-2.6 Flare for speed and Sunburst for quality. New tricks include short animated GIFs, SVG drawings (images that scale without blurring), and saved reference images so the same person or character looks consistent across chats. OpenAI says images generate about 50% faster.

### Open weights this fortnight

- **Mistral Large 4 (Oct 29).** Mistral [released the weights](https://mistral.ai/news/mistral-large-4-oss/) of its 1-trillion-parameter model, nicknamed "Le Chonk," after a three-week public preview. It was trained in Europe, and Mistral pitches it for coding and defensive security. The license is a modified MIT: free to use, modify, and sell products with, except that businesses offering the model as a hosted service need a separate commercial license. Mistral reports 41% on Terminal-Bench 4.0 and 19.7% on FrontierCode 2.0 (vendor-reported; different test setups from other vendors' numbers). The API price is $0.70 / $2.10.
- **Kimi K3.1 Pro (Nov 4).** The promise kept; details in the next section.
- **MiniMax H3-Image (weights posted Nov 10).** MiniMax's [Hugging Face page](https://huggingface.co/MiniMaxAI/MiniMax-H3-Image) was created November 3 and had its model files and a custom license added on November 10. MiniMax [says](https://www.minimax.io/blog/minimax-h3-image) it makes 4K images in about 10 seconds. That is the company's claim, so read the license before using it.
- **Quiet from the usual names.** As of November 10, the Hugging Face pages for DeepSeek, Alibaba's Qwen team, and Zhipu (GLM) showed no new flagship weights in this window; their latest big releases came in October or earlier. Microsoft, Amazon, and Apple did not release a major new model in the window either.

### A promise to watch: Grok 4.8

xAI has not released Grok 4.8. Early on November 10, Elon Musk [posted on X](https://x.com/elonmusk/status/2120088070443655190) that pretraining is done, the model is now in reinforcement learning (a later training step that rewards better answers), and the team rewrote its training and serving software from scratch in C and C++. [TeslaNorth reports](https://teslanorth.com/2026/11/10/grok-4-8-coming-this-week-rebuild/) that Musk also said a limited rollout to Grok Bot users would come later this week, and, asked how it compares with Claude Opus 5.5, called it "not as good." That is a plan, not a release.

**Takeaway:** look at three things on every new model card: who can actually use it, what a finished job costs, and who ran the tests.

## Weights: promised vs. shipped

![Slide: "Promised vs. shipped." Cards for Kimi K3.1 Pro (weights published November 4), Tencent Hy4 (weights promised "in the coming days"), and Inkling 2 Small (weights promised "next week").](/weekly-screenshots/2026.11.11/slide-03-promised-vs-shipped.png)

An announcement tells you what a company intends. A file on Hugging Face (the main public site for sharing models) tells you what it did.

### Kimi K3.1 Pro: the promise was kept

**What happened:** Moonshot published the full open weights of [Kimi K3.1 Pro on Hugging Face](https://huggingface.co/moonshotai/Kimi-K3.1-Pro), announcing it on November 4, the date it had promised. The model card lists a **2.8 trillion-parameter** mixture-of-experts design with **104 billion active** per token and a context window of 1,048,576 tokens. The weights are stored in 96 files totaling about **1.56 terabytes**, according to [alfw.ai](https://alfw.ai/article/kimi-k31-pro-weights-156tb/), and [ArtificialWatch](https://artificialwatch.com/wire/kimi-k3-1-pro-open-weights-out) also reports the release. (A mixture of experts splits the model into specialist parts and uses only a few per token. Total parameters set how much memory you need; active parameters set the speed.)

**Free to download is not the same as easy to run.** At about 1.56 TB, the files are far larger than the memory of an ordinary office computer. One hardware guide estimated that running it would need roughly 861 GB to 1,509 GB of graphics memory depending on compression; those are estimates, not measurements.

**The license.** The weights come under the "Kimi K3.1-Pro License," and the [license text is on Hugging Face](https://huggingface.co/moonshotai/Kimi-K3.1-Pro/blob/main/LICENSE). It is a permissive, MIT-style grant with conditions. In plain English, and not legal advice:

- You may use, copy, modify, fine-tune, and redistribute the model.
- If you run a "Model as a Service" business (giving others API-style access in a way that lets them control inputs, parameters, or training data) **and** your group's revenue is over **$20 million** across any 12 months, you need a separate agreement with Moonshot before commercial use.
- If a commercial product using the model has more than **100 million monthly users** or more than **$20 million in monthly revenue**, it must prominently display "Kimi K3.1-Pro."
- Those two conditions do not apply to **internal use** (use that doesn't make the model or its outputs available to third parties) or to use through Moonshot's own products or certified inference partners.

The license is not one of the standard open-source licenses, so read it yourself before you build a business on it. Mistral's new license has a similar hosted-service condition, so this is becoming a pattern.

**Moonshot's scores are Moonshot's.** The model card includes a benchmark table. For example, Moonshot reports **65.7** on Terminal-Bench 4.0 (using its "max" reasoning setting and the Claude Code harness) against **66.4** for Claude Opus 5.5. Those are vendor-reported numbers on a task set the vendor chose; wait for independent testers before treating them as a ranking.

### Tencent Hy4: announced, weights not yet seen

On November 4, [Tencent announced Hy4](https://www.tencent.com/tencent-launches-hy4-joining-the-ranks-of-the-worlds-leading-open-source-ai-models/) under a headline that says it joins "the world's leading open-source AI models." The body of the release says Tencent Hy "plans to release model weights and system cards in the coming days." Hy4 is available now through Tencent's own products and its API, including third-party platforms such as OpenRouter. Tencent lists its prices at about **$0.90 per million input tokens, $2.70 per million output tokens, and $0.045 per million cached input tokens**, and says Hy4 Flash, a cheaper version, is "scheduled for release soon."

**As of November 10:** [Tencent's Hugging Face page](https://huggingface.co/tencent) listed only the older **Hy4-preview** checkpoints (from August 28), not the full Hy4. Its newest uploads were other projects. In other words, six days after "the coming days," the weights had not shipped. Tencent's headline describes its plan; the file would be the proof.

Tencent's own benchmark and blind-evaluation results (for example, a financial-task evaluation Tencent ran with partners) are vendor-reported, so they are left out here.

### Thinking Machines' Inkling 2 Small: closed for now, weights promised

On November 5, [Thinking Machines introduced Inkling 2 Small](https://thinkingmachines.ai/news/inkling-2-small/), a 594-billion-parameter model (17 billion active) that accepts images. At launch it ran on the company's Tinker platform with **closed weights**. The company wrote that it intends to make the full weights available under an **Apache 2.0** license "next week after the completion of external safety testing and red-teaming." "Next week" means November 9–13, so the weights could arrive around the time this edition publishes. As of November 10, [its news page](https://thinkingmachines.ai/news/) showed no later post, and its Hugging Face page still listed only the earlier Inkling and Inkling-Small models.

**Why it matters for Longmont:** three headlines, three different amounts of proof. One model you can download now, two you can only rent until the promise is kept. Plan around files that exist.

**Takeaway:** "Open weights" is a claim you can verify in three steps. Is the file there? What does the license say? Will it fit on hardware you can buy?

## The cost of a token vs. the cost of a task

![Slide: "Token vs. task." Cards for effort settings that multiply the bill, a cheap worker model priced per task, and usage plans that run out faster than expected.](/weekly-screenshots/2026.11.11/slide-04-token-vs-task.png)

A **token** is a word or piece of a word, and it is how most AI vendors bill. A **task** is what you actually want done, and a task can take many thousands of tokens, many tries, and some waiting. A price per token is a unit price. A price per task is the bill.

**What happened:**

- **Vendors started selling on cost per task.** Anthropic says Fable 5.2 at its "High" effort setting matches Opus 5.5's best FrontierCode score for roughly half the cost per task. Google says Gemini 4 Carbon leads three outside benchmarks at less than half the cost per task of its nearest rival. Meta compares Muse Ember to Claude Haiku 5.5 on cost per task, and Artificial Analysis's figures put Ember at about 14 cents per task. All but the last are vendor claims, but the shift in what they advertise is real.
- **Effort settings multiply the bill.** "Effort" is a dial that tells a model how long to think. A [post on X by EnvolDev](https://x.com/EnvolDev/status/2118742203371573615) (with video) ran the same prompt on Claude Opus 5.5 at four effort settings to make a 25-second film: $26.01 and about 2 hours 17 minutes at High, $84.93 at Max, and **$681.91 and nearly 11 hours** at Ultra. That is one person's single run, not a benchmark, but it shows why "which setting?" belongs in every budget.
- **Same prompt, four tools, four bills.** A [post by Lummox](https://x.com/Lummox_eth/status/2119027995239194880) (with video) asked four AI workflows to build a 3D lighthouse scene: Kimi K3.1 cost about $12 and 3 minutes, GPT-6 Astra $40, a Blender MCP workflow $67, and Claude Code $102 and 28 minutes. The poster judged the cheapest result the least cinematic. Again one run, the poster's own numbers and taste.
- **Faster, not cheaper: Anthropic's message threads.** Anthropic put [message threads into public beta](https://claude.com/resources/articles/message-threads) in its Messages API. Instead of resending the whole conversation every turn, an agent sends only what is new. For requests of 500,000 to 1 million tokens, **Anthropic reports** a median drop in time to first token of about **35%** (with threads on by default for most Claude Code users). Anthropic says token usage stays the same, because Claude still reads the full conversation each turn, and standard rates apply. A thread expires five minutes after its last request. This is a latency win, not a price cut.
- **A per-second price: Gemini Omni 1.2 Flash.** On November 5, Google made [Gemini Omni 1.2 Flash](https://blog.google/innovation-and-ai/technology/developers-tools/introducing-gemini-omni-1-2-flash/) generally available. It makes video clips up to 15 seconds and lets you edit them turn by turn. Google says it cut the price by **30%** from Omni 1.1, to **$0.07 per second of 720p video**. Our arithmetic: a maximum-length 15-second clip is about **$1.05**, before any retries. Outputs carry an imperceptible SynthID watermark.
- **Tencent's price list.** Besides Hy4's per-token prices above, Tencent says Hy4 is **50% off on Tencent Cloud TokenHub through December 31, 2026**, and that its WorkBuddy and CodeBuddy tools are free November 4–15.
- **A task with a price tag.** Thinking Machines' Inkling 2 Small post describes a [4.5-hour, $426 autonomous fine-tuning run](https://thinkingmachines.ai/news/inkling-2-small/). That is the company's own demo of a single task, not a typical cost.
- **Usage limits bite: xAI's Grok Bot.** [TeslaNorth reported on November 8](https://teslanorth.com/2026/11/08/grok-bot-usage-limits-musk/) that subscribers to **xAI's Grok Bot** (xAI's always-on agent product) are complaining that agent work uses up plan allowances fast. It says Elon Musk posted that fixes for "improved token efficiency and smarter behavior are underway," and that he said on November 1 that serving costs were "unsustainably high relative to revenue." One subscriber's post said a $200 plan went from about seven days to about 14 hours. That figure is unverified, and these are reported anecdotes, not measurements.
- **The other side: a "60 bots, one budget" workshop.** A [post by gatsby](https://x.com/0xg4tsby/status/2116153564066193809) shares a roughly hour-long workshop video by a person described as a SpaceXAI engineer who runs more than 60 Grok Bots like a small company: a chief of staff bot, three manager bots, and dozens of workers. The claim is that many bots don't have to mean many times the bill if each bot reads only what its job needs. That is a promotional post and the claim is unverified, but the principle (give each agent only the context it needs) matches what vendors say about cost.

**Why it matters for Longmont:** budget by the task. Run one real job end to end at the effort setting you'd actually use, count retries, and multiply. Lower prices and lower latency help, but an agent that works for hours on a high setting can still use up a plan.

**Takeaway:** ask "what does one finished job cost, at what setting, and how long does it take?" before "what does a million tokens cost?"

## Agents get checkpoints

![Slide: "Agents get checkpoints." Cards for a check before each tool call, an isolated desktop for the agent, a measured scope test, and a study of analysts following an agent's lean.](/weekly-screenshots/2026.11.11/slide-05-agents-get-checkpoints.png)

Last edition's lesson was agents that ask first. This fortnight the same idea reached the admin and infrastructure layers: a **checkpoint** is a place where a rule runs before the agent can act.

**What happened:**

- **Claude Enterprise inference hooks (Nov 5).** In its [Claude Enterprise security updates](https://claude.com/resources/articles/claude-enterprise-security-updates), Anthropic made **inference hooks** generally available: prompt hooks and **pre-tool-call hooks** that check a tool call before it runs. Anthropic lists a security center, centralized management, and other controls as beta, and says the endpoint-detection sensors it is adding run in detection mode (they report; they don't block). These features are for Claude Enterprise customers.
- **AWS desktops for agents (Nov 3).** AWS said [WorkSpaces for AI agents now supports Linux and Windows 11 cloud desktops](https://aws.amazon.com/about-aws/whats-new/2026/11/workspaces-ai-agents-linux-windows-11/), in addition to Windows Server, with network isolation, IAM access control, and compliance boundaries. AWS says the Linux option gives an agent full root access inside its own desktop. Think of it as a separate computer where the agent can work without touching yours.
- **OpenAI's GPT-6 Cyber (Nov 5).** [OpenAI introduced GPT-6 Cyber](https://openai.com/index/introducing-gpt-6-cyber), a security model for finding and validating exploitable software flaws. It is not a general product: initially it is available through the API and Codex to a select group of approved Daybreak Red customers, and OpenAI says it will expand access to all Daybreak Red customers soon. All of the numbers below are **OpenAI-reported**:
  - **Scope test:** in an evaluation where easy-to-exploit services sit next to the real target, OpenAI says the model avoided exploiting out-of-scope services in **99.93%** of tests without its deployment prompt (up from 94.49% for GPT-5.6 Cyber) and **100%** with it.
  - **Capability:** **48.5%** on ExploitGym versus 32.1% for GPT-5.6 Cyber; OpenAI researchers report developing 948 Linux privilege-escalation exploits and identifying 81 previously unknown high-severity Firefox vulnerabilities, with Mozilla landing fixes for many.
  - **Risk label:** OpenAI classifies the model as **Critical** in cybersecurity under its Preparedness Framework, and still recommends sandboxing, action review, and human oversight for high-risk workflows.
- **Gated models are the same idea at the model level.** GPT-6 Cyber, Claude Mythos 5.2, and Gemini 4 Carbon's first two weeks all followed one pattern: the most capable security models go first, or only, to vetted organizations.

**Measured by whom?** A 99.93% scope score is a test OpenAI designed, on its own model. It is useful because it is a number someone can try to reproduce, but it is not an independent audit, and a model that is very capable and mostly in scope can still do harm in the rare miss.

### A checkpoint for people, too: who really made the call?

Published October 27, two days before this edition's window, an [Anthropic study on how agents shape experts' judgment calls](https://www.anthropic.com/research/agents-judgment-calls) shows why people need checkpoints as well. Fifty professional data analysts did a realistic analysis with Claude Code. On each of four choices that had two reasonable answers, a coin flip secretly decided which way the analyst's agent would lean, and the agent was told to argue honestly for that side.

- Analysts went with the agent's lean **86%** of the time; if the agent made no difference, you'd expect about 50%.
- Afterward, **77%** explained their choices using the agent's own arguments, sometimes word for word, but only **15%** credited the agent.
- Analysts who used the agent made far fewer serious errors (3 of 50) than the small, less experienced group who chose to work without it (6 of 11), so this is not a case against using AI.

The limits are real and Anthropic lists them: the agents' leanings were deliberately strengthened, and it was one task, in one field, with one model. Alex Tamkin, one of the authors, [summarizes it on X](https://x.com/AlexTamkin/status/2115190541688398184) with a short video.

**Why it matters for Longmont:** you may not buy GPT-6 Cyber, but the checklist transfers. When you choose any agent tool, ask: Does a rule run before each action? Does the agent work in a separate space? Is there a number for staying in scope, and who measured it? And for your own team: on the decisions that are judgment calls, write down your view before you ask the agent.

**Takeaway:** a leash you can switch on and test beats a promise that the agent will behave, and the person signing off should know which calls were really theirs.

## Agents that remember, and "dream"

![Slide: "Agents that remember." Cards for writing notes worth keeping, "dreaming" to check notes against the record, and an expectation, not an announcement, about Claude Duet.](/weekly-screenshots/2026.11.11/slide-06-agent-memory.png)

Most chatbots forget everything when a conversation ends. **Agent memory** is what an agent keeps between sessions: notes it writes to a folder or file and reads next time. It is different from the model's training, from what it learns inside one chat, and from "compaction," where an agent summarizes a long conversation so it can keep going.

**What happened:** On November 6, Anthropic published [The components of agent memory](https://www.anthropic.com/research/components-of-agent-memory), a research post on how Claude decides what to remember and how it cleans up its notes. The headline idea is **dreaming**: between tasks, the agent rereads its logs and transcripts, fixes mistakes in its notes, merges duplicates, and builds better summaries. The term comes from an analogy to sleep, when the brain is thought to replay and sort recent experiences, and it builds on "sleep-time compute," an idea from researchers at Letta and UC Berkeley.

**What Anthropic found in its own tests** (company-reported, on tasks Anthropic chose):

- **Save what you can't see again.** Playing the video game Pokémon Red, an older model, Claude Sonnet 3.7, wrote 413 memory files in 225 folders and earned one badge. Claude Fable 5 wrote nine files in two folders plus one "dashboard" file and earned four badges by the same point. The better model saved plans and tested rules, not things it could read off the screen every turn.
- **Tell the agent what memory is for, not exactly how to use it.** A fixed rule such as "record only failures" cut much of the benefit for the stronger models. Older models did better when told to read their notes before answering.
- **Dreaming fixes wrong notes.** In one game run, Claude wrote down a landmark on the wrong side of a mountain and kept falling off the same ledge. When dreaming checked the note against the actual transcript, it corrected the note, and Claude got through. The run with the uncorrected note never did.
- **Dreaming can build a wiki.** Working over a company's internal documents (about 350,000 files), agents built linked wiki pages across 128 dreaming sessions. Using the wiki alone, scores on 25 test questions rose from 13% to 48%. With search plus the wiki, they reached 61%, compared with 53% for search alone, and used about 20,000 fewer tokens per question. On questions about a merger that required combining several documents, Claude scored 87% with the wiki versus 73% with search alone.
- **It can go wrong.** On one task the wiki grew larger than the documents it summarized, which is no summary at all. And notes loaded into every session cost tokens and can carry a wrong fact everywhere, so the always-loaded layer has to stay small. Anthropic says Claude Code loads only the first 200 lines or 25 KB of its memory index file.

**Claude Duet: expectation, not announcement.** [Claude Duet](https://claude.com/product/claude-duet) is Anthropic's proactive work agent, opened as a research preview in late October for US Pro, Max, and Ultra subscribers through a waitlist. It runs on Claude Opus 5.5, keeps working in the cloud while you're away, and uses your Claude memory. The memory post mentions Duet once, as an example of an assistant that benefits from memories organized around the person it's helping, and says dreaming "can be tuned" toward a goal like that. **We expect dreaming will likely show up in Claude Duet.** That is our expectation, not an announcement: as of November 10, Anthropic had not said that Duet uses or will use dreaming.

**Why it matters for Longmont:** memory makes agents more useful and makes their mistakes stickier. The good news is that this kind of memory is usually plain files you can open, read, and correct.

**Takeaway:** write down what you can't see again, check notes against the record, and keep the always-loaded list short. That works for agents and for teams.

## Robotaxis: more cities, still-sealed paperwork

![Slide: "More cities, sealed paperwork." Cards for Tesla's San Antonio launch, Waymo's Los Angeles and San Diego expansion, and a confidentiality request to NHTSA.](/weekly-screenshots/2026.11.11/slide-07-cities-and-sealed-paper.png)

**What happened:**

- **Tesla, San Antonio (Nov 9).** Tesla began robotaxi service in San Antonio at 5 a.m. local time on Monday, November 9, announcing it on X, according to [TechCrunch](https://techcrunch.com/2026/11/09/tesla-expands-robotaxi-service-to-san-antonio/). TechCrunch notes Tesla gave no detail on hours, vehicle type, or whether safety monitors ride along. It also reports tracker counts of more than 400 registered vehicles in Austin and "a handful to a few dozen" in other cities (tracker data, not Tesla's numbers).
- **Waymo, Los Angeles and San Diego (Nov 3).** Per the [Los Angeles Times](https://www.latimes.com/business/story/2026-11-03/waymo-expands-to-torrance-manhattan-beach-other-corners-of-la-county), Waymo added Torrance, El Segundo, and Manhattan Beach in LA (still no LAX) and extended San Diego north to La Jolla. The Times also reviewed NHTSA crash data and reports that Waymo crashes in LA County tripled last year, about 80% of them with no apparent injury, while Waymo says its per-million-mile crash rate has fallen each year since 2023. More cars mean more crashes counted even if the rate falls, so a count is not a rate.
- **The sealed paperwork.** [Electrek reported on November 5](https://electrek.co/2026/11/05/tesla-cybercab-nhtsa-sworn-answers-confidential/) that Tesla's October 30 answer to NHTSA's special order about its Cybercab (the two-seat car with no steering wheel or pedals) asked that the **entire response be kept confidential**. The public docket, Electrek says, holds a one-page cover letter, a placeholder, and a first-responder plan. As of November 10, there was no report that NHTSA had ruled on the confidentiality request. This item rests on Electrek's reporting, and Electrek is an opinionated outlet, so treat it as one outlet's account.

**Why it matters:** an announcement that a city is open says nothing about how many cars exist, who is watching, or how often they fail. The documents that would show it are the ones that matter, and here some are sealed.

**Takeaway:** ask for fleet size, supervision, and the data behind the safety claim, not just the city list.

## Humanoids and robots: orders, listings, a store shift, and a fooled camera

![Slide: "Orders, listings, and a 24-hour store shift." Cards for Agility's Nasdaq listing and conditional orders, and AGIBOT's six-robot store trial.](/weekly-screenshots/2026.11.11/slide-08-orders-listings-store-shift.png)

**What happened:**

- **Agility Robotics goes public (Nov 5).** Agility began trading on Nasdaq as AGLT, and its [press release](https://investors.agilityrobotics.com/news-releases/news-release-details/agility-becomes-first-us-publicly-listed-pure-play-humanoid) cites ">$300 million in committed multi-year orders for Digit 5, subject to contractual milestones, product features and specifications." Read the second half: the orders are conditional. Agility also reports 65,000+ hours of operation, and says Digit is deployed with customers including GXO, Schaeffler, and Toyota Motor Manufacturing Canada. Digit 5 early access is planned for the first half of 2027, with general availability targeted for the end of 2027. This is a company press release with forward-looking-statement caveats.
- **AGIBOT's 24-hour store shift (Nov 2–3, reported Nov 8).** In a [company press release](https://www.globenewswire.com/news-release/2026/11/08/3398006/0/en/six-agibot-g2-robots-complete-1-730-tasks-in-24-hour-shanghai-convenience-store-trial.html), AGIBOT says six G2 wheeled humanoids ran a 24-hour trial at an operating convenience store in Shanghai's Xuhui District and completed **1,730 tasks** (including 683 customer interactions, 147 coffee orders, and 277 shelf inspections or restocks). AGIBOT says **four of the six robots passed its final performance assessment**.
- **A fooled camera (Nov 6).** Robocurve, a public benefit corporation that studies physical AI, published [a study of "perceptual attacks" on robots](https://robocurve.org/robospoof/), to be presented as a late-breaking result at the CoRL robotics conference. Five frontier models (Claude Fable 5.1, Claude Opus 5.5, GPT-6 Astra, GPT-6.1 Sol, and Gemini 4 Argon) controlled a pair of robot arms and were given unsafe instructions, such as stabbing a baby doll or pouring water into a plugged-in toaster. (Every bottle, cup, and pot was empty, and the outlet was unpowered.) With clear camera footage, models attempted the unsafe task in 81 of 300 trials. With **blurred** footage, 263 of 300. With footage **doctored** to make the objects look harmless, 291 of 300. An AI judge scored the attempts, and this has not been peer-reviewed. Robocurve's [post on X](https://x.com/robocurve/status/2118791723606593694) includes a short video.

**Reading the robot numbers.** The store trial is real information and still a demo: one store, 24 hours, an assessment run by the company, two of six robots that did not pass, and no independent audit or failure-rate data published. The Agility orders show buyer interest but are not shipments. The Robocurve study is a warning about something different: a model's safety refusal is only as good as what its camera shows it.

**Why it matters for Longmont:** if a vendor offers a robot pilot, ask what "passed" means, who judged it, what happened to the robots that failed, and what the robot does when its camera is dirty or blocked.

**Takeaway:** orders are intentions, trials are samples, and reliability comes from months of independent data, including bad-camera days.

## Colorado: rules pending, buildings and permits moving

![Slide: "Rules pending, permits moving." Cards for Colorado's pending AI rules, Denver's permit intake assistant, and Boulder County's data-center hearing.](/weekly-screenshots/2026.11.11/slide-09-colorado-pending.png)

**What happened:**

- **The rules are not final.** On its [AI page](https://coag.gov/ai/), the Colorado Attorney General's office, as of November 10, still showed the rulemaking record (proposed rules filed August 11, an interim draft October 6, a regulatory analysis October 21, a public hearing and written-comment deadline October 26) and no final adopted rules. The office says it will consider all written comments in drafting the final set. Both laws, the **ADMT Act** (SB 26-189) and the **Chatbot Safety Act** (HB 26-1263), take effect **January 1, 2027**, and the ADMT Act requires rules to be in place before then. Check the page for updates.
- **Denver's permit checker (Nov 5).** The city launched [StartSmart: Application Intake Assistant](https://denvergov.org/Government/Agencies-Departments-Offices/Agencies-Departments-Offices-Directory/Community-Planning-and-Development/CPD-News-and-Events/CPD-News/2026/New-permit-intake-tool), built with vendor CivCheck, which uses AI to check applications for site development plans and building permits for completeness. Staff still make the final decisions, and the city expects more application types in 2027. The city gave no time-saving figure beyond "potential."
- **Boulder County and data centers (Tue Nov 10).** County commissioners held a [public hearing at 1 p.m. on November 10](https://bouldercounty.gov/property-and-land/land-use/planning/land-use-code-update/dc-26-0003/) on draft land-use rules that would allow new data centers only up to **75 kilowatts** of IT power, which the county compares to the average daily energy use of 2.5 homes; anything larger would not be allowed. The [Colorado Sun](https://coloradosun.com/2026/11/09/boulder-county-data-center-rules-against-growth/) contrasted that with Colorado Springs at about 50 megawatts and a Larimer County vote on a 30-megawatt limit in January. A county moratorium on data-center applications has been in place since June 2. The county notes the rules cover **unincorporated** Boulder County, not cities such as Longmont. No outcome had been posted by the afternoon of November 10.

**Why it matters for Longmont:** if you use AI to help make decisions about people, or run a chatbot on your website, the rules you will have to follow are still being written. The city example shows the pattern regulators like: AI helps with checking, people decide. Not legal advice.

**Takeaway:** start with an inventory of where you use AI on decisions about people and where a chatbot talks to the public.

## One more thing: an AI-run wet lab

*Peer-reviewed, and honest about its limits.* On November 4, Nature published [an AI-native experimental laboratory for biomolecular operations (AutoDNA)](https://www.nature.com/articles/s41586-026-11228-6) from a team including Shanghai Jiao Tong University. The system orchestrates more than 20 types of lab instruments across more than 11,000 steps, with human intervention limited to restocking. The authors tested it on four applications, such as matching expert-optimized DNA-synthesis yields. That is four demonstrations in one lab, not proof that any lab can hand over its work.

## Close and ask

![Closing slide: three things to try this week, beside the Longmont AI parrot.](/weekly-screenshots/2026.11.11/slide-10-close-ask.png)

Three things to try this week:

1. **Read one license file yourself.** Open the Kimi K3.1-Pro or Mistral Large 4 license and find the revenue, hosted-service, and "internal use" lines.
2. **Price one real task.** Run one job end to end at the effort setting you'd really use, count the retries, and write down the cost and the time.
3. **Write your checkpoints.** List what your agents may do on their own, what must wait for a person, and which judgment calls you'll make before you ask.

Bring one result to the meetup.

## Links and videos

Posts on X that go with this edition. They are people's own claims, demos, and single test runs, not independent evidence.

- **Google, Gemini 4 Carbon launch (video, Nov 10).** [Google's post](https://x.com/Google/status/2120186185423159331) announcing Carbon's wider release, with a short clip.
- **Alexandr Wang, Muse Ember (image, Nov 9).** [Meta's AI chief announces Muse Ember](https://x.com/alexandr_wang/status/2119853374158032950) with a chart comparing intelligence per dollar against Haiku and Luna.
- **Alex Tamkin, agents and expert judgment (video, Oct 27).** [An Anthropic researcher explains the 50-analyst study](https://x.com/AlexTamkin/status/2115190541688398184) on how agents sway judgment calls.
- **gatsby, "60 Grok Bots like a company" (video, Oct 30).** [A roughly one-hour workshop](https://x.com/0xg4tsby/status/2116153564066193809) on running a chief-of-staff bot, manager bots, and dozens of worker bots on one budget. Promotional; claims unverified.
- **Aarush Yadav, Subvocal glasses (video, Oct 30).** [A Y Combinator startup's launch](https://x.com/AarushYadav47/status/2116198463847408066): glasses that it says read silent mouthing through non-contact sensing and turn it into text at more than 200 words a minute. The company says it raised $1.3 million and opened pre-orders; the speed claim is the company's.
- **Lummox, four AI tools build a lighthouse (video, Nov 7).** [Same prompt, four workflows](https://x.com/Lummox_eth/status/2119027995239194880), with the poster's costs and times, from Kimi K3.1 at about $12 to Claude Code at about $102.
- **Robocurve, fooled robot cameras (video, Nov 6).** [Robots controlled by frontier models](https://x.com/robocurve/status/2118791723606593694) attempt unsafe tasks when their camera footage is blurred or doctored.
- **EnvolDev, Claude Opus 5.5 effort settings (video, Nov 6).** [One prompt at four effort settings](https://x.com/EnvolDev/status/2118742203371573615), from about $26 at High to about $682 at Ultra for a 25-second film.

## Names that are easy to mix up

- **Claude Fable 5.2** (available to paid users and developers) and **Claude Mythos 5.2** (approved organizations only) are the same underlying model with different safeguards. Neither is **Claude Opus 5.5**, which Anthropic still recommends as the everyday default.
- **Claude Duet** (Anthropic's proactive agent app) is not the regular **Claude** app, and **dreaming** (cleaning up memory between tasks) is not **compaction** (summarizing a long chat so it can continue).
- **Gemini 4 Carbon** (Google's strongest, for the hardest work) is not **Gemini 4 Argon** (Google's recommended default), and neither is **Gemini Omni 1.2 Flash** (video generation).
- **Muse Ember** (Meta, hosted and proprietary) is not **Muse Glimmer** (Meta's open-weight model) or **Muse Spark** and **Muse Wonder** (larger hosted models).
- **Mistral Large 4** (open weights Oct 29) is not **Mistral Small 4**.
- **Kimi K3.1 Pro** (new weights, Nov 4) is not **Kimi K3** (an earlier model, post-trained into K3.1 Pro).
- **Tencent Hy4** (announced Nov 4, hosted) is not **Hy4-preview** (the older checkpoint you can download).
- **Inkling 2 Small** (closed at launch, weights promised) is not **Inkling** or **Inkling-Small**, which are earlier models.
- **Grok 4.8** (in training, not released) is not **Grok 4.7** (the current model), and neither is **xAI's Grok Bot** (xAI's agent product, not a model).
- **GPT-6 Cyber** (access-restricted) is not **GPT-6 Astra** or **GPT-5.6 Cyber**.
- **ArtificialWatch** is a different organization from **Artificial Analysis**.
- **Tesla's Robotaxi** (no one in the driver's seat) is not **Cybercab** (a two-seat vehicle with no wheel or pedals).
- **Agility Robotics** (Digit, AGLT) is not **AGIBOT** (G2), and neither is **Robocurve** (a research group, not a robot maker).
- **ADMT Act** (SB 26-189) and **Chatbot Safety Act** (HB 26-1263) are two Colorado laws, not one "AI Act."
- **Boulder County's** data-center rules cover unincorporated areas, not the **City of Longmont**.
- **Longmont AI** (this meetup) is not the City of Longmont's Technology Policy Advisory Board.

## Key dates

| Date | What |
| --- | --- |
| Oct 27 | Anthropic study on agents and expert judgment (just before this window) |
| Oct 28 | Google announces Gemini 4 Carbon for security teams only |
| Oct 29 | Mistral Large 4 open weights |
| Nov 2 | Anthropic message threads (public beta); AGIBOT store trial starts (China time) |
| Nov 3 | Waymo Los Angeles and San Diego expansion; AWS WorkSpaces for AI agents adds Linux and Windows 11; AGIBOT trial ends |
| Nov 4 | Kimi K3.1 Pro weights published; Tencent announces Hy4; ChatGPT Images 2.6; Nature publishes AutoDNA |
| Nov 5 | GPT-6 Cyber; Gemini Omni 1.2 Flash; Claude Enterprise inference hooks; Inkling 2 Small; Agility lists on Nasdaq; Denver StartSmart; Cybercab docket reported |
| Nov 6 | Anthropic agent-memory research; Robocurve perceptual-attack study |
| Nov 8 | Reports of xAI Grok Bot usage-limit complaints; AGIBOT trial results released |
| Nov 9 | Claude Fable 5.2 and Mythos 5.2; Meta Muse Ember; Tesla robotaxi service begins in San Antonio |
| Nov 10 | Gemini 4 Carbon opens to paying users; MiniMax H3-Image weights posted; Musk says Grok 4.8 is in reinforcement learning; Boulder County data-center hearing (outcome not yet posted) |
| Nov 11 | Longmont AI meetup, 12:00–2:15 p.m. |
| Nov 15 | Tencent's free WorkBuddy and CodeBuddy period ends |
| Nov 30 | Gemini 4 Carbon's introductory price ends |
| Dec 31 | Tencent's 50% TokenHub discount on Hy4 ends |
| Jan 1, 2027 | Colorado ADMT and Chatbot Safety Acts take effect |

## Takeaways

1. **A promise is not a file.** Check that the weights exist before you plan around them. Hy4, Inkling 2 Small, and Grok 4.8 are all still promises.
2. **Read the license.** "Open" comes with conditions, and both Kimi's and Mistral's depend on whether you resell access.
3. **Check the gate.** The strongest new models arrive in tiers: some for everyone, some for approved organizations only.
4. **Price the task, not the token.** Effort settings can multiply a bill many times over; the bill is what a finished job costs.
5. **Agents need checkpoints, and so do people.** A rule that runs before each action beats a promise of good behavior, and make your own call before the agent argues its side.
6. **Memory is a file you can check.** Good agent memory keeps what can't be seen again and gets corrected against the record.
7. **An expansion is not a safety record.** Ask for fleet size, supervision, and data.
8. **Orders and demos are not reliability.** Conditional orders, a one-store trial, and a study of fooled cameras are early signals.
9. **Colorado's AI rules are still being finished.** Make your inventory now.

## About our sources

This edition draws on primary pages from Anthropic (the Fable and Mythos 5.2 announcement, developer documentation, the agent-memory and expert-judgment research, and Claude Duet's product page), Google, Meta, OpenAI, Mistral, MiniMax, Moonshot AI (Hugging Face model card and license), Tencent (announcement and Hugging Face page), Thinking Machines, AWS, Agility Robotics, AGIBOT (company press release), Robocurve, the City and County of Denver, Boulder County, the Colorado Attorney General, and Nature, plus Elon Musk's own post on X. Reporting from CNBC, The Verge, VentureBeat (for Artificial Analysis's launch figures on Muse Ember), TechCrunch, the Los Angeles Times, Electrek, TeslaNorth, alfw.ai, ArtificialWatch, and the Colorado Sun fills in launches, independent figures, reported filings, usage complaints, hardware estimates, and county hearings. Benchmark scores, prices, trial results, and order figures from companies are vendor-reported, and we say so. Posts on X are linked for viewing and are not used as evidence for factual claims. Usage anecdotes and single test runs are reported, not measured. The Cybercab confidentiality item rests on Electrek's reporting.

## The briefing in ten slides

{{slideshow:promised-weights-gated-agents}}

[Download the ten-slide briefing (PDF)](/documents/2026.11.11/promised-weights-gated-agents-briefing.pdf)

## The fortnight in charts

Thirty slides of charts and talk slides we saved between editions, each with one takeaway. Every slide names where the chart came from and what kind of evidence it is: a vendor's own numbers, a survey, an outside analysis, or one person's post.

![Cover slide: The fortnight in charts.](/weekly-screenshots/2026.11.11/fortnight-in-charts-01-cover.jpg)
![Fable 5.2 tops most rows of Anthropic's table. Anthropic's benchmark table comparing Claude Fable 5.2 with Fable 5.1, Opus 5.5 and GPT-6 Astra.](/weekly-screenshots/2026.11.11/fortnight-in-charts-02-fable-5-2-benchmark-table.jpg)
![More effort is not always more score. FrontierCode 2.0 score against cost per task for five models at several effort settings.](/weekly-screenshots/2026.11.11/fortnight-in-charts-03-frontiercode-accuracy-vs-cost.jpg)
![Kimi K3.1 Pro sits about five weeks behind the US frontier. Intelligence index over twelve months, with Kimi K3.1 Pro about five weeks behind the fitted US frontier trend.](/weekly-screenshots/2026.11.11/fortnight-in-charts-04-kimi-five-weeks-behind-frontier.jpg)
![On expert work, the best model scores 12%. GDPx leaderboard led by Claude Opus 5.5 at 12%, beside a radar chart of model scores by domain.](/weekly-screenshots/2026.11.11/fortnight-in-charts-05-gdpx-leaderboard.jpg)
![Everyday tasks: about 83%, with less waiting. LifeEval chart of average reward against minutes per attempt for five GPT models.](/weekly-screenshots/2026.11.11/fortnight-in-charts-06-lifeval-everyday-tasks.jpg)
![The price of a given score keeps falling. Cost per task to reach a 25% or 75% score on four benchmarks, falling with each model release.](/weekly-screenshots/2026.11.11/fortnight-in-charts-07-cost-of-benchmark-scores.jpg)
![Meta says Muse now remembers better. Two Meta bar charts: an active memory eval at 90% against 76%, and a personal superintelligence index at 47% against 38%.](/weekly-screenshots/2026.11.11/fortnight-in-charts-08-meta-active-memory-eval.jpg)
![From copy and paste to always-on agents. Talk slide showing four stages of how developers work with AI, ending in always-on agents.](/weekly-screenshots/2026.11.11/fortnight-in-charts-09-talk-how-developers-work-with-ai.jpg)
![The agent runs on a server and works on its own computer. Talk slide showing apps and channels, a server that runs the agent, and the agent's own computer.](/weekly-screenshots/2026.11.11/fortnight-in-charts-10-talk-three-parts-of-the-system.jpg)
![Seven things can wake an agent. Talk slide listing seven wake-up sources feeding a router, a queue and an "anything worth saying?" check.](/weekly-screenshots/2026.11.11/fortnight-in-charts-11-talk-what-wakes-the-agent.jpg)
![The database is the truth. Notifications only nudge.. Talk slide with four steps after you hit send: sending, the turn, watching and ordering.](/weekly-screenshots/2026.11.11/fortnight-in-charts-12-talk-when-you-hit-send.jpg)
![The agent's computer sleeps when idle. Talk slide showing the agent's virtual machine, and what happens when it goes to sleep and wakes up.](/weekly-screenshots/2026.11.11/fortnight-in-charts-13-talk-the-agents-computer.jpg)
![Dreaming rewrites memory between sessions. Two Anthropic diagrams of dreaming: building memory representations, and writing to the injected context.](/weekly-screenshots/2026.11.11/fortnight-in-charts-14-dreaming-memory-representations.jpg)
![One team's rule: fix it fast. Slide text: agents fix every error hit by a user and verify their own work with no human in the loop.](/weekly-screenshots/2026.11.11/fortnight-in-charts-15-agents-fix-it-fast-rule.jpg)
![Software flaws arrive at four times last year's pace. A chart of new CVEs published per day rising to 593, beside a chart of PHP running 69.3% of websites.](/weekly-screenshots/2026.11.11/fortnight-in-charts-16-cve-publication-pace.jpg)
![DeepSeek edged OpenAI in a simulated attack. Objectives completed in a simulated network attack by tokens used, for six models.](/weekly-screenshots/2026.11.11/fortnight-in-charts-17-simulated-network-attack-objectives.jpg)
![METR saw more evidence than the public did. METR table of AI R&D evidence types, marking what was shared with METR and what is in the public report.](/weekly-screenshots/2026.11.11/fortnight-in-charts-18-metr-evidence-shared.jpg)
![Anthropic plans $518 billion of compute spending. Headline: Anthropic plans to spend $518 billion on cloud and data centers.](/weekly-screenshots/2026.11.11/fortnight-in-charts-19-anthropic-518-billion-compute-plan.jpg)
![Anthropic holds $125 billion in net cash. Net cash bar chart: Anthropic $125.4bn, Alphabet $140.0bn, Meta minus $1.2bn.](/weekly-screenshots/2026.11.11/fortnight-in-charts-20-net-cash-anthropic-alphabet-meta.jpg)
![Anthropic's AI bill now tops its payroll. Three figures: 250x internal Claude usage, over 90% of new code written by Claude, 5,300 employees.](/weekly-screenshots/2026.11.11/fortnight-in-charts-21-anthropic-ai-bill-tops-payroll.jpg)
![$1 of chips becomes $17.80 of AI revenue. A flow from $1 of Nvidia cost of goods to Nvidia, SpaceXAI, Anthropic and customer value.](/weekly-screenshots/2026.11.11/fortnight-in-charts-22-nvidia-dollar-flow-model.jpg)
![Apple is sitting out the spending race. Big Tech capital spending indexed to Q1 2023 and as a share of sales, with Apple flat.](/weekly-screenshots/2026.11.11/fortnight-in-charts-23-big-tech-capex-apple.jpg)
![GPU rental prices are going up. Table of GPU hourly rental prices before and after a November 15 increase.](/weekly-screenshots/2026.11.11/fortnight-in-charts-24-gpu-rental-price-changes.jpg)
![Space hardware: $17 billion a year, six times the builders. Private investment in space hardware without SpaceX, beside the number of companies building satellites each year.](/weekly-screenshots/2026.11.11/fortnight-in-charts-25-space-hardware-investment.jpg)
![Three in ten US workers use AI every week. Gallup lines for US employees using AI at work daily and a few times a week, Q2 2025 to Q2 2026.](/weekly-screenshots/2026.11.11/fortnight-in-charts-26-gallup-ai-use-at-work.jpg)
![Americans rank near the bottom on AI optimism. Table of the top five and bottom five countries by share expecting AI to mostly help.](/weekly-screenshots/2026.11.11/fortnight-in-charts-27-ai-optimism-by-country.jpg)
![Same tool, two outcomes in class. Illustration of grades splitting into two groups, with a study inset: practice up 48%, exam down 17%.](/weekly-screenshots/2026.11.11/fortnight-in-charts-28-grades-in-the-age-of-ai.jpg)
![Tesla reports 6 million miles per major collision on FSD. Post listing Tesla's reported miles per major collision with and without FSD (Supervised).](/weekly-screenshots/2026.11.11/fortnight-in-charts-29-tesla-fsd-miles-per-collision.jpg)
![Closing slide: three questions for any chart.](/weekly-screenshots/2026.11.11/fortnight-in-charts-30-three-questions.jpg)

[Download the fortnight in charts (PDF)](/documents/2026.11.11/fortnight-in-charts.pdf)
