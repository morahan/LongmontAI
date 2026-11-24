---
id: edition-2026-11-25-chatbot-to-teammate
date: 2026-11-25
publishAt: 2026-11-25T11:30:00-07:00
status: scheduled
title: "From chatbot to teammate"
summary: "AI tools are being sold as teammates that take a task from start to finish. This fortnight shows why that only works if someone still checks the result."
---

## From chatbot to teammate

A few years ago, using AI meant asking a chatbot a question and doing the work yourself. Then came copilots, which helped with each step while you stayed in charge. This fortnight, more companies pitched the next step: an AI **teammate** that takes a task from start to finish while people set the direction and check the result.

You could see that pitch everywhere between November 11 and November 25. AI tools learned to join team chats and video calls. New models were sold on how much work they finish, not just how well they answer. And the same skills that make an agent useful also showed up on the other side: Google's threat researchers described attackers running AI agents end to end, and California sued OpenAI over agents it says escaped a testing environment.

The thread running through all of it: **handing AI a whole task works only if someone still checks the work.** The tools got more capable this fortnight. They did not get less in need of review.

**In this edition:**

- **New this fortnight: the release board**: GPT-6.2 Astra and Sol, Gemini 4 Neon and Hydrogen, Qwen4-Max, Grok Bot 1.0, Claude Meetings, Genie 4 for developers, and Claude Ship
- **From answers to ownership**: what "AI teammate" means, and what OpenAI's own safety report says to watch for
- **Claude Ship: AI that reviews, fixes, and approves code**: Anthropic's take on letting a teammate sign off, under rules people write
- **Google's middle model scores near the top**: Gemini 4 Neon by the numbers, and why it sits near the efficient frontier on cost per task
- **Models are learning to read molecules**: OpenAI's MedChemBench
- **Xhigh effort beat max effort**: why the priciest setting can score lower
- **Security: patches become attacks faster**, and attackers bring agents
- **California sues OpenAI**
- **How the world feels about AI**: Gallup's 37-country survey
- **Money: Anthropic goes public**, and a chart about billionaires and poverty
- **Space: Starship came home**
- **Colorado**: Boulder County caps data centers
- **Takeaways**, **one clip to end on**, and **the slides**: the ten-slide briefing and "Who checks the work?", each with a PDF to download and share

This edition covers **November 11–25, 2026** (America/Denver).

> **Evidence note:** Model launches, benchmark scores, and prices come from the companies that made them unless we name an independent source. When a company compares itself with a rival, the rival's numbers are the company's reading, not ours. A lawsuit is a set of allegations until a court rules. Posts on X are linked so you can see them; they are people's own claims, not primary sources.

![Longmont AI branded cover for the November 25 briefing: "From chatbot to teammate." Brand layout, not a product screenshot.](/weekly-screenshots/2026.11.25/slide-01-teammate-cover.png)

## New this fortnight: the release board

Here is what shipped between November 11 and November 25. Prices are the vendors' list prices per million tokens (input / output). A token is a small chunk of text, roughly three-quarters of a word. An API (application programming interface) is how developers plug a model into their own software.

| Date | Release | Company | What it's for | List price |
| --- | --- | --- | --- | --- |
| Nov 11 | Grok Bot 1.0 | xAI (publishing as SpaceXSI) | AI teammates shared across a team | subscription |
| Nov 12 | Gemini 4 Hydrogen | Google | Fast, everyday coding and agent work | $1.50 / $7.50 |
| Nov 12 | Claude Meetings (beta) | Anthropic | Claude joins Google Meet calls as a visible participant | Team and Enterprise plans |
| Nov 16 | Qwen4-Max | Alibaba | Flagship model; not open weights | $1.50 / $4.50 (per eWeek) |
| Nov 17 | **GPT-6.2 Astra** | OpenAI | Hardest professional and science work | $8 / $40 |
| Nov 17 | GPT-6.2 Sol | OpenAI | Everyday work | $2 / $10 |
| Nov 18 | **Gemini 4 Neon** | Google | Between Carbon and Hydrogen: complex work, faster | $3 / $15 |
| Nov 19 | Genie 4 in the Gemini API | Google | Interactive generated worlds for developers | paid API tier |
| Nov 23 | Claude Ship (Code Review GA; PR Steward and Claude Approvals in beta) | Anthropic | Agents that review, fix, and approve code changes on GitHub | billed by tokens; Team and Enterprise plans |

**GPT-6.2 Astra and Sol (November 17).** OpenAI says both models get better results while using fewer output tokens, and that Astra's slides, spreadsheets, and documents "read less like AI." Astra's token prices are 20% lower than GPT-6 Astra's. Both are in ChatGPT Work and Codex for paid plans and in the API ([OpenAI](https://openai.com/index/introducing-gpt-6-2-astra-sol/)).

**Gemini 4 Neon and Hydrogen (November 12 and 18).** Google now has a ladder of Gemini 4 models: Carbon for the deepest work, Neon in the middle, and Hydrogen for speed. Hydrogen also powers parts of Google Search ([Google, Hydrogen](https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-gemini-4-hydrogen/); [Google, Neon](https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-gemini-4-neon/)). More on Neon below.

**Qwen4-Max (November 16).** Alibaba's new flagship has 2.4 trillion parameters, of which 71 billion are active for each token, and a one-million-token context window. Unlike many Qwen models, this one is hosted only. Alibaba says smaller Qwen4 models with open weights will follow "soon" ([Alibaba](https://www.alibabagroup.com/en-US/document-2060139246777270272); price per [eWeek](https://www.eweek.com/news/alibaba-qwen4-max-features-pricing/)).

**Genie 4 for developers (November 19).** Google's world model, which generates a place you can move through in real time, is now available to paying developers through the Gemini API ([Google](https://blog.google/innovation-and-ai/technology/developers-tools/genie-4-in-gemini-api/)).

## From answers to ownership

![Branded slide: "AI is moving from answers to ownership." Three steps: Chatbots answer questions, Copilots help with each step, Teammates take a task end to end.](/weekly-screenshots/2026.11.25/slide-02-chatbot-to-teammate.png)

The three-step picture above comes from a slide in a Grok Bot workshop that xAI, which now publishes as SpaceXSI, posted on October 29: **chatbots** answer questions while people do the work; **copilots** help while people drive every step; **teammates** take a task from start to finish while people set direction and review.

Two launches this fortnight put that idea into products:

- **Grok Bot 1.0** (November 11): xAI says its bots can now be shared by a whole team, work inside Slack, Microsoft Teams, and video calls, and offer to take on work nobody assigned. The company also says bots "ask before taking sensitive actions" ([xAI](https://x.ai/news/grok-bot-1-0)).
- **Claude Meetings** (November 12, beta): Anthropic's Claude can join a Google Meet call as a visible participant, answer questions, and write notes and action items, according to [VentureBeat](https://venturebeat.com/technology/anthropic-brings-claude-into-google-meet-to-draft-documents-and-whiteboards-during-your-meetings) and [The Decoder](https://the-decoder.com/claude-meetings-lets-anthropics-ai-join-your-video-calls/).

**Why "review" is the important word.** OpenAI's safety report for GPT-6.2 is unusually direct about a weakness that matters for teammates. It says the new models "were more likely to omit known obstacles when reporting their work": in plain terms, they were more likely to leave out the problems they ran into. OpenAI says its Codex instructions reduce this a lot and that it is investigating the cause. The same report says GPT-6.2 Astra is the first model OpenAI has released that meets its "High" threshold for AI self-improvement, an early-warning level in its safety framework ([OpenAI system card](https://deploymentsafety.openai.com/gpt-6-2-astra-sol)).

If an AI hands you finished work, ask it what went wrong along the way, and check.

## Claude Ship: AI that reviews, fixes, and approves code

![Anthropic diagram of Claude Ship in three rows. Review (Code Review) finds 2 issues in a pull request; Fix (PR Steward, beta) pushes fixes; Review finds 1 more; another fix is pushed; Review finds no issues; Approve (Claude Approvals, beta) approves under team policy, and the change is "Ready to merge." Footnote: "Claude Ship uses AI and may miss bugs, security vulnerabilities, or other issues."](/weekly-screenshots/2026.11.25/claude-ship-review-fix-approve.png)

The previous section ended on "check the work." Two days before this meetup, Anthropic shipped a product that asks the next question: what if an AI does some of the checking too?

On November 23, Anthropic launched **Claude Ship** ([Anthropic](https://claude.com/resources/articles/introducing-claude-ship); [announced on X by @ClaudeDevs](https://x.com/ClaudeDevs/status/2124959436640858475)). It works on **pull requests**: when a programmer changes a shared codebase, they propose the change as a pull request, and teammates review it before it is merged into the main project. That review step is where a lot of team time goes, and with AI writing much more code, it has become the bottleneck.

Anthropic's own pitch: "Open a pull request and get back to building." Claude Ship splits the job into three agents, each with a plain-English job title.

### 1. Review: Claude reads the change and flags problems

![Anthropic example of Code Review on a pull request: a red-flagged comment from Claude on a code change explains that retries can go out back to back against a rate-limited server, because a "Retry-After" header can be a date or missing, turning the wait into zero. It suggests a fix and includes a "Why this was flagged" section with how it verified the problem.](/weekly-screenshots/2026.11.25/claude-ship-code-review-finding.png)

**Code Review**, the one part that is generally available rather than in beta, reads each pull request against the rest of the codebase. Anthropic says it looks at a change "through multiple lenses," double-checks its own findings before posting them, and labels each one as important, a nitpick, or a problem that was already there. Teams pick a quick, standard, or deep review for each repository.

In Anthropic's example above, Claude catches a subtle bug: code meant to wait politely before retrying a busy server would, in some cases, not wait at all. Note the "Why this was flagged" section. The comment shows its reasoning, so a person can check it.

### 2. Fix: Claude works on its own findings

![Anthropic example of PR Steward on a pull request titled "Retry rate-limited requests in the API client." Claude confirms the Code Review finding, says it is fixing the parsing and a test, then reports the commit it pushed, how to undo it, and how to stop it. All checks have passed below.](/weekly-screenshots/2026.11.25/claude-ship-pr-steward-fix.png)

**PR Steward** (beta) picks up from there. It works on failing automated tests, conflicts with other people's changes, and feedback from Code Review or from teammates. After every change it pushes, it leaves a comment saying what it changed and **how to undo it**, as in the example above. Developers can steer it by commenting `@claude`, or stop it with `@claude stop`. Anthropic says PR Steward is designed to leave approving and merging to the team.

### 3. Approve: Claude signs off, but only where people said it may

![Anthropic example of a Claude Approvals policy file, approvals.yml. Most code needs two people, or one when Claude's review passes. Docs changes can be approved by Claude alone when its review passes. Billing code needs two people who aren't the authors, one of them from the payments team.](/weekly-screenshots/2026.11.25/claude-ship-approvals-policy.png)

This is the new and most debated part. **Claude Approvals** (beta) lets Claude give the final sign-off on routine changes. It doesn't decide for itself what counts as routine. Each team writes the rules in a policy file kept with the code. Anthropic says it works "like a smarter CODEOWNERS file," the list many teams already use to say who must review which files.

The example policy above reads almost like plain English:

- **Most code:** two people must approve, or one person if Claude's review passes.
- **Documentation:** Claude can approve on its own if its review passes.
- **Billing code:** two people who didn't write the change, and one of them must be from the payments team. Claude only comments.

![Anthropic example of a documentation pull request, "Fix broken links in the setup guide," that met its policy. Claude Approvals reports "Passing," Claude posts an approving review, and the required Claude Approvals check, Code Review, docs build, and link check all pass.](/weekly-screenshots/2026.11.25/claude-ship-approved-pr.png)

Here is that docs rule in action: a small fix to broken links passed Claude's review and every automated check, so Claude approved it with no human reviewer.

**The safety valve.** Anthropic recommends most customers start Claude Approvals in **observe-only mode**, where it reports what it *would* have decided without blocking or approving anything, before letting it count. Its docs also warn that a policy with no required human can let changes merge without a person ever looking ([Claude Approvals docs](https://code.claude.com/docs/en/approvals)).

### How developers start it

![Terminal window running /ship in Claude Code. The message says /ship started for a pull request, Claude reviews the change, then watches the pull request for up to 7 days in this session, on your usage. Keep this session open, this computer awake, and this branch checked out. "/ship stop" ends the watch.](/weekly-screenshots/2026.11.25/claude-ship-command.png)

A developer using Claude Code can type `/ship` when a change is ready. Claude pushes the change, opens the pull request, reviews it, and keeps working on feedback and failing tests. Whether it can merge depends on that developer's own permissions and the repository's rules ([`/ship` docs](https://code.claude.com/docs/en/ship-command)). Admins can also switch Code Review and PR Steward on for a whole repository, so they run on every pull request.

### Who can use it, and what it costs

- **Plans:** Claude Team and Enterprise, for code hosted on GitHub. It isn't available to organizations using Zero Data Retention, Anthropic's HIPAA configuration, or customer-managed encryption keys.
- **Price:** billed by tokens, so cost depends on how many pull requests a team opens, how big they are, and how deep the reviews go. Admins can set monthly spending limits. Running `/ship` counts as regular Claude Code usage.
- **Credits:** eligible Enterprise organizations can claim at least $10,000 in Claude Ship credits by January 15, 2027.

### What Anthropic claims, and what to watch

Anthropic says its own Claude Code team runs Claude Ship on many of its pull requests, and that from June to September the team's merged pull requests "more than doubled" while the share of changes it had to undo fell by more than 40% ([Anthropic](https://claude.com/resources/articles/introducing-claude-ship)). Those are the company's own numbers about its own team, and nobody outside Anthropic has checked them.

The design is the interesting part for everyone else. Claude Ship doesn't remove the reviewer; it moves the human's job from reading every line to **writing the rules for when a person must read**. That only works if the rules are good. Anthropic's own diagram carries the right footnote: "Claude Ship uses AI and may miss bugs, security vulnerabilities, or other issues."

## Google's middle model scores near the top

![Bar chart in Longmont AI style: Artificial Analysis Intelligence Index, top five models at their highest setting, as of November 23. Claude Fable 5.2 64.6, GPT-6.2 Astra 62.1, Gemini 4 Neon 61.4 (highlighted, third), Gemini 4 Carbon 60.0, Claude Opus 5.5 59.1.](/weekly-screenshots/2026.11.25/slide-03-gemini-neon.png)

Gemini 4 Neon is Google's middle model, priced at $3 per million input tokens and $15 per million output tokens. Google says it scores 61 on the Artificial Analysis Intelligence Index at its highest thinking setting, third overall and "just behind larger, slower models," and that at its default setting it costs 32% less per task than Gemini 4 Carbon ([Google](https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-gemini-4-neon/)). The two models ahead of it on the [Artificial Analysis leaderboard](https://artificialanalysis.ai/leaderboards/models), as of November 23, are Claude Fable 5.2 (64.6) and GPT-6.2 Astra (62.1). Google's own Gemini 4 Carbon (60.0) and Claude Opus 5.5 (59.1) round out the top five.

Here is Google's own comparison table. Rival scores are as Google reported them, and Google says it used each rival's highest available reasoning setting ([Google DeepMind methodology](https://deepmind.google/models/evals-methodology/gemini-4-neon)).

| Benchmark (what it tests) | Gemini 4 Neon | Claude Opus 5.5 | GPT-6.2 Sol |
| --- | --- | --- | --- |
| Artificial Analysis Intelligence Index (overall) | 61 | 59 | 57 |
| Vals Index (professional tasks) | 70.9% | 70.1% | 66.1% |
| Terminal-Bench 4.1 (working in a command line) | 65.2% | 65.8% | 61.5% |
| FrontierCode 2.0 (code a maintainer would merge) | 46.2% | 47.3% | 43.8% |
| AutomationBench (business automation) | 56.3% | 42.5% | 41.3% |
| HLE-Diamond (a 1,000-question set from Humanity's Last Exam) | 71.3% | 67.9% | 64.0% |
| GraphWalks (very long documents) | 95.2% | 66.8% | 80.1% |

Neon doesn't win every row. Opus 5.5 edges it on command-line work and FrontierCode. The point Google is making is about price: near-top scores from a model that isn't its biggest.

### Near the efficient frontier on cost per task

![Artificial Analysis scatter chart, Intelligence Index against cost per task in U.S. dollars on a log scale, 28 of 156 models, with a dotted Pareto line. Longmont AI has circled Gemini 4 Neon (xhigh), which sits just under the Pareto line at an index of about 61 and roughly $6 per task, near GPT-6.2 Astra (max), about 62 at roughly $4. Claude Fable 5.2 (max) is highest at about 65 but costs roughly $27 per task; Claude Opus 5.5 (max) scores about 59 at roughly $10. Footer: highlight added by Longmont AI; chart by Artificial Analysis, captured November 24, 2026.](/weekly-screenshots/2026.11.25/neon-intelligence-vs-cost-per-task.png)

Price per token only tells half the story, because some models write far more tokens than others to finish the same job. Artificial Analysis measures what it actually costs a model to work through its test suite, as an average **cost per task**, and plots that against its Intelligence Index.

The dotted **Pareto line** in the chart is the efficient frontier: the models for which no other model scores higher for less money. Anything on the line is a best buy at its price; anything below it is beaten by something cheaper, smarter, or both.

Gemini 4 Neon (circled) sits **just under that line**. Reading the chart, Neon scores about 61 at roughly $6 per task. That puts it:

- **Close to the frontier, but not on it.** GPT-6.2 Astra at max effort scores slightly higher (about 62) for a bit less (roughly $4 per task).
- **Ahead of Google's own Gemini 4 Carbon** and of **Claude Opus 5.5** (about 59 at roughly $10) on both score and cost.
- **About a quarter of the cost of the top model.** Claude Fable 5.2 leads at about 65, but at roughly $27 per task.

For most everyday work, a few points on an index matter less than a fourfold difference in cost. That is the case for Neon: near-top results without paying for the very top.

Dollar figures here are our readings from Artificial Analysis's log-scale chart, captured November 24, so treat them as approximate. The circle and caption are ours ([Artificial Analysis](https://artificialanalysis.ai/)).

## Models are learning to read molecules

![Bar chart in Longmont AI style: MedChemBench share of credit at xhigh reasoning. GPT-6.2 Astra 84.5%, GPT-6 Astra 83.3%, GPT-6.1 Sol 82.0%, GPT-6.1 Terra 75.1%, GPT-5.6 Sol 58.2%. Source: OpenAI.](/weekly-screenshots/2026.11.25/slide-04-medchembench.png)

On November 20, OpenAI published **MedChemBench**, a test built from 99 problems taken from 117 published papers and patents in medicinal chemistry, the science of designing drug molecules ([OpenAI](https://openai.com/index/introducing-medchembench/)). Models have to read molecule drawings, explain experimental results, pick which compounds to test next, and predict their properties.

At the highest reasoning setting all models shared, GPT-6.2 Astra earned 84.5% of the available credit, compared with 58.2% for GPT-5.6 Sol. The gap is easiest to see in one example: asked to rebuild a molecule that contains an 18-atom ring, GPT-6 Astra got it right in all ten tries, while GPT-5.6 Sol produced a 15-atom ring and GPT-5.6 Luna split the molecule into two pieces. A wrong ring means a different molecule before any chemistry starts.

OpenAI's charts also plot each score against how many tokens the model wrote. On the molecule-rebuilding part, the newest models reach their top scores while writing far fewer tokens than the GPT-5.6 models, the same "more done with less" claim OpenAI made for GPT-6.2.

**The limits OpenAI names.** OpenAI is clear on the limits: only OpenAI models were tested, each answer was a single attempt without tools or lab feedback, the models may have seen the published papers during training, and the results "do not establish whether models can discover new drugs." Astra earned 95.4% of the credit for rebuilding structures but only about half for choosing compounds and predicting numbers, which are the harder parts of real drug discovery.

## Xhigh effort beat max effort

![Line chart in Longmont AI style: Claude Fable 5.2 on FrontierCode 2.0. High effort 45.3% at $6.72 per task, Xhigh 49.1% at $14.19, Max 45.6% at $44.70. Cost axis is log scale.](/weekly-screenshots/2026.11.25/slide-05-max-effort.png)

Many AI tools now let you choose how hard a model "thinks." More thinking costs more. It usually helps, but not always.

Anthropic's launch chart for Claude Fable 5.2 (released November 9, just before this window) shows it on FrontierCode 2.0, a test of whether a model's code changes would be accepted by the people who maintain real open-source projects. At "Xhigh" effort it scored 49.1% at about $14 per task. At "Max" effort it cost about $45 per task, roughly three times more, and scored lower, 45.6% ([Anthropic](https://www.anthropic.com/claude-fable-and-mythos-5-2); per-task costs as read from Anthropic's chart by [Reconscribe](https://reconscribe.com/claude-fable-5-2/)). Anthropic also says Fable 5.2 at High effort roughly matched Opus 5.5's best score for about half the cost per task.

The lesson for anyone paying for AI: start below the top setting, and pay for max only when you've seen it help on your own work.

## Security: patches become attacks faster

![Bar chart in Longmont AI style: exploited zero-day vulnerabilities per month. 2025 average 8, January to August 2026 average 11, August 2026 22. Source: Google Threat Intelligence Group.](/weekly-screenshots/2026.11.25/slide-06-zero-days.png)

A **zero-day** is a software flaw attackers use before the maker has a fix. An **n-day** is a flaw that has already been disclosed, often with a patch available. Google Threat Intelligence Group says zero-day exploitation rose only marginally, from an average of 8 a month in 2025 to 11 a month from January to August 2026, apart from a one-month jump to 22 in August. The bigger change is elsewhere: exploited flaws overall rose from 10.5 a month in 2025 to 18 a month in 2026, and the group says that growth is concentrated in attackers quickly weaponizing n-days, likely with AI tools that compare patches and versions to work out what was fixed ([GTIG, September 30](https://cloud.google.com/blog/topics/threat-intelligence/vulnerability-discovery-and-exploitation-trends-in-the-ai-era)). Only about 1 in 431 disclosed flaws was ever seen being exploited, so a single busy month can swing the count.

On November 16, the same group reported that attackers have moved from asking chatbots for help to running **autonomous, multi-agent attack tools**. One it describes compares software before and after a security patch, works out what the patch fixed, and writes and runs an attack against systems that haven't updated yet ([GTIG AI Threat Tracker](https://cloud.google.com/blog/topics/threat-intelligence/agentic-threat-activity-crosses-a-significant-threshold)).

The model makers are reacting too. OpenAI says GPT-6.2 Astra and Sol are its most capable models yet at cybersecurity tasks, and that it tightened default limits on risky security help ([OpenAI system card](https://deploymentsafety.openai.com/gpt-6-2-astra-sol)). Google says a security version of Neon will go only to vetted defenders.

**For everyone else:** turn on automatic updates. When patches can be turned into attacks automatically, the time between "fix released" and "fix needed" keeps shrinking.

## California sues OpenAI

On November 16, California Attorney General Rob Bonta sued OpenAI. The complaint says AI agents running on experimental OpenAI models launched a two-day cyberattack on Hugging Face, a popular site for sharing AI models, in July 2026, after they should have been contained inside OpenAI's research environment. It calls that attack "one of at least 80 cyber incidents" and accuses OpenAI of testing models it knew were dangerous without proper safeguards, and of misleading the public ([California Attorney General](https://oag.ca.gov/news/press-releases/it%E2%80%99s-golden-state-not-wild-west-attorney-general-bonta-sues-openai-over); [Ars Technica](https://arstechnica.com/tech-policy/2026/11/california-sues-openai-to-stop-public-nuisance-of-out-of-control-ai-agents/)).

These are allegations, and a court has not ruled. The case matters beyond OpenAI because it asks a question every agent maker will face: who is responsible when software that acts on its own causes harm?

## How the world feels about AI

![Bar chart in Longmont AI style: share of AI-aware adults who say AI will mostly help people in their country. China 93%, Vietnam 91%, Singapore 77%, United States 36%, Egypt 35%, Bangladesh 34%. Source: Gallup with Microsoft.](/weekly-screenshots/2026.11.25/slide-07-optimism.png)

The tools are racing ahead, and Americans are among the least convinced. In Gallup's survey with Microsoft of 37 countries, released September 22, 93% of AI-aware adults in China said AI will mostly help people in their country. In the United States it was 36%, third from the bottom, ahead of only Egypt (35%) and Bangladesh (34%) ([Gallup](https://news.gallup.com/poll/714593/optimism-globally-widespread-despite-uneven.aspx)).

Optimism doesn't follow use. In Nigeria, 68% of AI-aware adults expect AI to help, but only 20% have ever used it. Trust is lower still: across the 37 countries, a median of 36% trust AI "completely" or "a lot" to give accurate information. The survey was done between April and July 2026, with about 1,000 people per country, and Gallup plans to cover 140 countries in all.

## Money: Anthropic goes public

On November 19, Anthropic, the maker of Claude, began trading on the Nasdaq stock exchange under the ticker **ANT**. It sold 1.127 billion shares at $83 each, which works out to about $93.5 billion before fees. It also sold about $26 billion of shares privately to AMD, Broadcom, Google, Micron, Microsoft, NVIDIA, and TSMC (Taiwan Semiconductor Manufacturing Company) ([Anthropic](https://www.anthropic.com/news/ipo-close)).

Why it matters if you don't buy stocks: a public company has to report its revenue, losses, and risks every quarter. For the first time, one of the leading frontier AI labs will have to show its numbers in public on a regular schedule.

![Scatter chart in Longmont AI style: billionaires per 10 million people (log scale) against share of people living on under $30 a day, for seven of 64 countries: Nigeria, India, Greece, Israel, France, the Netherlands, Switzerland. Correlation only.](/weekly-screenshots/2026.11.25/slide-09-billionaires-poverty.png)

AI is creating new fortunes fast, which made one chart worth a look. Economist Christopher Clarke of Washington State University compared billionaires per person (from the 2026 Forbes list) with the share of people living on less than $30 a day (from World Bank surveys) in 64 countries. Countries with more billionaires per person tend to have far fewer people under that line. Nigeria has 0.2 billionaires per 10 million people and 99.9% of people below $30 a day; Switzerland has 101 and 6.8% ([Libertis, on Clarke's chart](https://libertis.net/articles/mu2ykzqc/en/where-billionaires-are-common-poverty-is-rare)).

Our slide shows seven of the 64 countries. Two cautions: $30 a day is a prosperity line, not a poverty line in the usual sense, and the chart shows a correlation, not a cause. Rich countries tend to produce both billionaires and broad prosperity. And among the 20 countries where fewer than 20% of people are under the line, the pattern disappears.

## Space: Starship came home

![Bar chart in Longmont AI style: estimated cost to low Earth orbit per kilogram, log scale. Older rockets about $6,000 to $25,000, Falcon 9 about $2,600, Falcon Heavy about $1,500, Starship about $200 as a projection of full cost, and Starship's fuel alone about $2.50, from Musk's target of under $500,000 of propellant for over 200 tons of payload.](/weekly-screenshots/2026.11.25/slide-08-starship-catch.png)

On November 14 at 2:20 PM Mountain time, the upper stage of SpaceX's Starship came back from orbit and was caught by the arms of its launch tower in Texas. It was the first time SpaceX has caught a Starship upper stage. The booster didn't make it: it diverted from its own catch and exploded just before hitting the water offshore in the Gulf of Mexico. The flight, which launched on November 13, also deployed 26 Starlink satellites ([Spaceflight Now](https://spaceflightnow.com/2026/11/13/live-coverage-starship-flight-15-attempts-to-recover-full-vehicle-in-double-launch-pad-catch/); [Aviation Week](https://aviationweek.com/space/operations-safety/starship-flight-15-ends-first-ship-tower-catch)).

Catching and reusing both stages is SpaceX's plan for making orbit far cheaper. Late on November 15, Elon Musk posted that Starship's "propellant cost per flight will drop below $500k and payload will exceed 200 tons." He gave no date. Fuel is only part of a launch's cost: building, refurbishing, and operating the rocket cost much more ([Musk on X](https://x.com/elonmusk/status/2122217639540134337); [Tesla North](https://teslanorth.com/2026/11/16/musk-starship-propellant-cost-500000/)).

**Where "$2 a kilogram" comes from.** You may have seen claims that Starship will reach orbit for about $2 per kilogram. We couldn't find Musk or SpaceX saying that. It appears to come from dividing his post: $500,000 of fuel spread over 200 tons (200,000 kg) of payload is about $2.50 per kilogram. That counts fuel only, for targets with no date. Musk's own all-in goal is "under $100 a kilogram to orbit," which he gave in an interview with investor Ron Baron ([TASS](https://tass.com/economy/2214163)). Even that would be more than 25 times cheaper than Falcon 9 today.

The slide shows cost per kilogram to low Earth orbit using estimates compiled by [Visual Capitalist](https://www.visualcapitalist.com/the-cost-of-space-flight/), plus the fuel-only $2.50 figure for comparison. Both Starship figures are projections, not prices anyone pays today.

## Colorado: Boulder County caps data centers

On November 10, just before this window, Boulder County commissioners voted unanimously to limit data centers in unincorporated parts of the county to 50 kilowatts, roughly enough to power a couple dozen homes. That ends the moratorium the county set this summer and effectively rules out large data centers there. By comparison, a planned AI data center in Weld County is slated to start at more than 25 megawatts ([KUNC](https://www.kunc.org/news/2026-11-12/boulder-county-commissioners-ban-large-scale-data-centers-only-allowing-50-kilowatts-or-less)).

## Names that are easy to mix up

- **Gemini 4 Carbon, Neon, and Hydrogen** are three different Google models, from deepest to fastest. **Genie 4** is Google's world model, not a chatbot.
- **GPT-6.2 Astra** is OpenAI's top model and **GPT-6.2 Sol** its everyday model. **Terra** and **Luna** are older, smaller lines.
- **Claude Fable 5.2** is Anthropic's top public model. **Claude Opus 5.5** is its recommended everyday model. **Claude Meetings** and **Claude Ship** are products built on Claude, not models.
- **Grok Bot** is xAI's AI-teammate app. **Grok** is the model family behind it.

## Key dates

- **November 30**: Gemini 4 Carbon's introductory API price is scheduled to end, according to Google's launch pricing.
- **December 9**: next Longmont AI meetup, at noon.

## Takeaways

1. **AI is being sold as a teammate.** Grok Bot 1.0 and Claude Meetings put AI into team chats and calls.
2. **Teammates still need a reviewer.** OpenAI says its newest models were more likely to leave obstacles out of their reports. Ask what went wrong, and check.
3. **AI is starting to review AI.** Anthropic's Claude Ship can review, fix, and even approve code changes, but only where a team's written policy allows it. The human job shifts to writing good rules.
4. **Xhigh effort beat the max setting on FrontierCode.** On one coding test, Claude Fable 5.2's most expensive setting cost three times more and scored lower.
5. **The middle tier keeps getting stronger.** Gemini 4 Neon posts near-top scores at a mid-tier price and sits just under the cost-per-task efficient frontier.
6. **Attackers have agents too.** Patch quickly and turn on automatic updates.
7. **Americans are skeptical.** Only 36% of AI-aware U.S. adults say AI will mostly help the country.

## One clip to end on

On November 21, the X user [@jaime_srr](https://x.com/jaime_srr/status/2124112545321468279) shared a 73-second clip of someone at a webcam whose hands are tracked in real time. Glowing lines stretch between their fingertips and stay hanging in the air, building up a web of "strings" that they keep adding to with each gesture. The post's caption, translated from Spanish: "What's coming at us. For good and for bad. How much of each, I have no idea." We couldn't confirm who made the demo or what software it uses.

[Watch the clip on X](https://x.com/jaime_srr/status/2124112545321468279)

## The briefing in ten slides

{{slideshow:chatbot-to-teammate}}

[Download the ten-slide briefing (PDF)](/documents/2026.11.25/chatbot-to-teammate-briefing.pdf)

## Who checks the work? In slides

Nine slides on this edition's two late additions: Gemini 4 Neon's place near the cost-per-task frontier, and how Anthropic's Claude Ship reviews, fixes, and approves code. Each slide names its source and what kind of evidence it is: an independent benchmark, or a vendor's own example.

![Cover slide: Who checks the work?](/weekly-screenshots/2026.11.25/who-checks-the-work-01-cover.jpg)
![Gemini 4 Neon sits just under the efficient frontier. Artificial Analysis chart of Intelligence Index against cost per task, with Gemini 4 Neon circled just under the Pareto line.](/weekly-screenshots/2026.11.25/who-checks-the-work-02-neon-intelligence-vs-cost-per-task.jpg)
![Claude Ship: review, fix, approve. Anthropic diagram: Code Review finds issues, PR Steward pushes fixes, and Claude Approvals approves under team policy.](/weekly-screenshots/2026.11.25/who-checks-the-work-03-claude-ship-review-fix-approve.jpg)
![Review: each flag shows its reasoning. Example Code Review comment flagging a retry bug, with its reasoning and how it was verified.](/weekly-screenshots/2026.11.25/who-checks-the-work-04-claude-ship-code-review-finding.jpg)
![Fix: every push says how to undo it. Example PR Steward comments: it confirms a finding, pushes a fix, and explains how to revert it or stop it.](/weekly-screenshots/2026.11.25/who-checks-the-work-05-claude-ship-pr-steward-fix.jpg)
![Approve: people write the rules. Example Claude Approvals policy file with rules for most code, docs, and billing code.](/weekly-screenshots/2026.11.25/who-checks-the-work-06-claude-ship-approvals-policy.jpg)
![A docs fix, approved by Claude. Example pull request fixing broken doc links, approved by Claude Approvals with all checks passing.](/weekly-screenshots/2026.11.25/who-checks-the-work-07-claude-ship-approved-pr.jpg)
![Developers start it with /ship. Terminal running /ship in Claude Code, which reviews a change and watches the pull request.](/weekly-screenshots/2026.11.25/who-checks-the-work-08-claude-ship-command.jpg)
![Closing slide: three questions for any AI teammate.](/weekly-screenshots/2026.11.25/who-checks-the-work-09-three-questions.jpg)

[Download "Who checks the work?" (PDF)](/documents/2026.11.25/who-checks-the-work.pdf)
