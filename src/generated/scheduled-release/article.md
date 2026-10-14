---
id: edition-2026-10-14-sense-of-wonder
date: 2026-10-14
publishAt: 2026-10-14T11:00:00-06:00
status: scheduled
title: "A Sense of Wonder"
summary: "Meta reaches the frontier with Muse Wonder, AI prices keep falling, agents get their own accounts and budgets, Waymo settles into Denver, and Colorado rewrites its AI law."
---

## A Sense of Wonder
For two years, Meta was the AI lab that was always *about* to catch up. On October 12 it did. Its new **Muse Wonder** models now score within a few points of the best from Anthropic and OpenAI, and the larger one ranks fourth in the world on a leading independent benchmark.

Meta was not the only story. Prices kept falling: a capable Claude model now costs ten cents per million tokens of input, roughly 750,000 words. AI "agents" got their own email accounts, sandboxes, and spending limits. Google made Gemini 4 Argon available worldwide, and Claude learned to make video by writing code. Robotaxis raised billions, and gasoline-only cars fell below half of global new-car sales for the first time. Here in Colorado, Waymo is six weeks into public rides in Denver, and the state is still writing the rules for its new AI law.

**In this edition:**

- **Meta's Muse Wonder**: what it is, and how the two versions differ
- **The other big releases**: GPT-6 for everyone, Claude Haiku 5.5, Gemini 4 Argon, Grok Bot's model routing, Claude Motion, Fish Audio Drama 3, and more
- **What AI costs now**: prices and independent scores for 19 leading models
- **Agents get their own badges**: accounts, sandboxes, and budgets for AI workers
- **Safety and security**: what the labs disclosed this fortnight
- **Robots and robotaxis**, and **the shift away from gasoline**
- **AI at home**: new smart displays and tablets
- **Colorado**: Waymo in Denver, the new AI law, and local projects
- **Key dates**, **names to get right**, **takeaways**, and **video demos**

This edition covers **October 1–13, 2026**.

## Meta's Muse Wonder: the frontier, finally

![Meta's official "Introducing Muse Wonder" announcement card: the word WONDER repeated in faint type around a blue headline.](/weekly-screenshots/2026.10.14/muse-wonder-announcement.jpg)

**What happened:** On October 12, [Meta released two new AI models](https://about.fb.com/news/2026/10/introducing-muse-wonder-models/): **Muse Wonder** and the larger **Muse Wonder Full**. Some news coverage spells the second one "Wonderful," but Meta's official name is Wonder Full, two words. Both were built by Meta Superintelligence Labs and trained at Meta's gigawatt-scale Prometheus data center. Mark Zuckerberg called them "a much larger and more advanced class of models that brings us to the frontier."
### What the two models share
- **Active Memory:** carries "what matters to you across conversations" and recalls the details that matter for the current task.
- **Active Focus:** keeps working when a task gets hard, tries other approaches, recovers from errors, and checks in before important actions.
- **Reads almost anything:** text, images, video, and audio, with a context window of about 1 million tokens, roughly 750,000 words ([model card](https://research.meta.ai/static/muse-wonder-model-card)).
- **Not open-source:** unlike Meta's earlier Llama models, neither can be downloaded.
- **Safety:** Meta calls them its "most aligned" models yet. A full safety report is promised "soon" but is not yet published.
### How they differ
Meta has not disclosed the size, design, or speed of either model. The published differences come down to access, price, and a few points of capability.

| | Muse Wonder | Muse Wonder Full |
| --- | --- | --- |
| Who it's for | Everyday work; will power the Muse app | Meta's "most capable" version |
| How to get it | [Meta's developer API](https://dev.meta.ai/docs/pricing-rate-limits) and the Muse Code app | Muse Code subscribers only ($50 or $200 a month) |
| Developer price, per 1M tokens | $4 input / $20 output | Not sold by the token |
| Independent score (Artificial Analysis) | 52 | 56, fourth-highest of any model tested |
| Speed | 115 tokens per second | Not measurable without an API |

**One caution:** [VentureBeat reports](https://venturebeat.com/technology/metas-new-muse-wonder-and-muse-wonder-full-models-achieve-frontier-performance-but-only-the-weaker-one-is-available-via-api) that Muse Code subscriptions default to a "Contributor mode" that may use what you submit to train Meta's models. The developer API does not.
### How they score

![Bar chart from Meta's model card comparing Muse Wonder Full and Muse Wonder across seven benchmarks: DeepSWE 79.0 vs 78.8, JobBench 75.3 vs 70.5, HealthBench Pro 62.3 vs 60.5, SWE-Marathon 57.5 vs 53.1, Terminal-Bench 4.0 57.1 vs 52.0, AutomationBench 45.4 vs 39.1, Harvey legal 13.1 vs 10.0. Full leads every row.](/weekly-screenshots/2026.10.14/muse-wonder-benchmarks.png)

- **Wonder Full leads Wonder** on Meta's own tests, usually by two to six points. On long software projects the gap nearly vanishes (79.0 vs 78.8), and on memory the smaller model edges ahead (85.6 vs 85.5).
- **Against rivals, Meta claims the lead** in long-running coding, legal work, and business automation. It trails Claude Opus 5.5 and GPT-6 Astra on command-line tasks, health questions, and computer use.
- **Independent testing is slightly less generous.** [Artificial Analysis](https://artificialanalysis.ai/models/muse-wonder-full) ranks Wonder Full fourth overall (56), behind Claude Opus 5.5 (58). Its own coding runs score the two models 77.0 and 75.8, not Meta's 79.0 and 78.8, and Google's Gemini 4 Argon tops both at 78.8.
- **Read the fine print.** Meta's comparison mixes its own test runs with competitors' self-reported numbers, and where no outside result existed, Meta used the highest of its available scores.

**Why it matters:** there are now four credible frontier labs, not three. Muse Wonder costs the same as Claude Opus 5.5 and is worth testing on real work, especially coding. Read the data terms before using Wonder Full.

## The other big model releases
### GPT-6 comes to every ChatGPT user
On October 7, OpenAI made **GPT-6** the default model across ChatGPT: GPT-6 Sol for paid plans and GPT-6 Luna for Free and Go users, rolling out from October 8. ChatGPT has more than 1.2 billion weekly users ([MacRumors](https://www.macrumors.com/2026/10/07/chatgpt-intelligent-ui/), quoting OpenAI).

- **Intelligent UI:** answers can now include live charts, forms, calculators, and buttons built on the fly. GPT-6 can also start answering while it is still thinking or searching ([TechCrunch](https://techcrunch.com/2026/10/07/chatgpt-is-getting-a-lot-more-visual-with-the-launch-of-a-new-interface/)).
- **Disclosed safety setbacks:** OpenAI's [system card](https://deploymentsafety.openai.com/gpt-6-october) reports statistically significant regressions on self-harm content for both models, and on gore and sexual content for Luna. It rates both "High" in cyber and bio/chem capability.
- **Same name, two versions:** the October models run in ChatGPT's Chat tab. Codex and ChatGPT Work keep the September versions under the same names.

**Why it matters:** hundreds of millions of people will start expecting AI answers to include working tools, not just text.
### Claude Haiku 5.5: a capable model for a dime

![Anthropic's Claude Haiku 5.5 announcement card: the model name in serif type over a collage of yellow, cream, and blue paper shapes.](/weekly-screenshots/2026.10.14/claude-haiku-5-5.jpg)

On October 7, Anthropic released [**Claude Haiku 5.5**](https://www.anthropic.com/claude-haiku-5-5), its small, fast model.

- **Price:** $0.10 per million input tokens and $0.50 per million output tokens, about 90% less than Haiku 4.5 for typical requests. Prompts over 100,000 tokens cost five times more.
- **New abilities:** an adjustable effort setting, plus the ability to operate a computer and a web browser (beta).
- **Scores:** Anthropic reports 72.4% on the OSWorld computer-use test, against 48.9% for GPT-6 Luna. Independent tester Artificial Analysis scores it 43, second of 176 comparable small models.
- **Test results depend on who runs them:** Anthropic reports 39.2% on Terminal-Bench 4.0. Artificial Analysis, using its own setup, measured 32.8%.
- **Also announced:** Anthropic halved the cache price for Claude Sonnet 5.5, which it says cuts the cost of most agent work by about 20%. Max and Team subscribers get new monthly API credits of $100 to $500.

**Why it matters:** sorting email, filling forms, and routing tickets now cost almost nothing to automate, as long as a person approves anything that leaves the building.
### Gemini 4 Argon is now generally available

On October 13, Google made **Gemini 4 Argon**, its newest flagship, [generally available worldwide](https://blog.google/innovation-and-ai/products/gemini-app/gemini-4-argon-availability/), after a limited preview that began September 30.

- **Who gets it:** developers and businesses on the paid Gemini API, Google AI Ultra subscribers in the Antigravity coding tool, and Pro and Ultra subscribers in the Gemini app and Search.
- **Price:** $2 input / $10 output per million tokens through November 30, then $4 / $20 from December 1.
- **How it scores:** it has the top independent score on DeepSWE, a test of long software projects (78.8), and an overall intelligence score of 53. It also debuted at the top of the LMArena text leaderboard (preliminary).
### Grok Bot will use rival AI models

On October 7, Elon Musk [announced](https://x.com/elonmusk/status/2107724314451878104) that **Grok Bot**, the personal agent app from SpaceX's AI division (formerly xAI), will route each task to whichever model is most likely to do it best, including competitors' models.

- **Named partners:** Anthropic's Claude Opus 5.5, Midjourney for images, and Suno for music, "and other leading APIs."
- **What's live:** [9to5Mac reports](https://9to5mac.com/2026/10/07/grok-bot-just-got-a-lot-smarter-thanks-to-anthropics-claude/) Grok Bot can already use Claude Opus 5.5. Midjourney and Suno were announced without a date, and no routing rules have been published.
- **What it isn't:** this applies to the Grok Bot agent app, not the Grok chatbot or the developer API.
- **Also from SpaceXAI:** on October 8 it became a founding corporate patron of DHH's [Omacom Foundation](https://omarchy.org/news/2026/10/spacexai-joins-as-founding-corporate-patron/), contributing $1.5 million in Grok tokens to maintain and develop the open-source Omarchy Linux setup.

**Why it matters:** an AI company publicly routing work to a rival's model is a strong sign that the models themselves are becoming interchangeable parts, and the app on top is where companies now compete.
### Claude Motion: animated video, written as code

On October 8, Anthropic released [**Claude Motion**](https://claude.com/resources/articles/dashboards-and-motion) in beta. Describe an explainer, a product walkthrough, or a chart you want brought to life, attach any data or images, and Claude produces a short animation you can download as an MP4 video.

- **It writes code, not pixels.** In Anthropic's words, "Claude writes code that animates your text, charts, shapes, and images… It doesn't use a video generation model, so there's no generated footage and no AI-generated people."
- **That makes it editable.** Because the video is code, you can change one word, number, or timing ("Change the Q3 number to 18%") and everything else stays the same ([help guide](https://support.claude.com/en/articles/17454997-get-started-with-claude-motion)).
- **It does not edit existing footage.** For finishing work, Anthropic points to partner tools: Adobe, Descript, HeyGen, Higgsfield, invideo, Luma AI, and Runway, with Canva and Captions coming soon.
- **Availability:** Team and Enterprise plans only, for now. Animations count toward your plan's usage limits.

**Video editing inside Claude** arrives through partners. Higgsfield's **Katana**, which connects to Claude through MCP (a standard way to plug outside tools into an AI app), lets you upload a reference clip and produce editable motion graphics and launch videos.

#### Resources for making video with Claude
- [**Prompt Motion**](https://prompt-motion.com/): a free gallery of 230+ motion videos made with Claude Opus 5.5, each paired with the exact prompt or skill that made it, plus a link to the creator. Pick one, paste its prompt, and swap in your own product.
- [**Charlie Hills' 16 Apple-style animations**](https://x.com/charliejhills/status/2109956200507076799) made with Claude Motion, with prompts.
- [**"The New Claude Motion Is Awesome"**](https://www.youtube.com/watch?v=hbPvZvpu9KU) (YouTube, Paul J Lipsky): a hands-on walkthrough.
- [**Claude Motion help guide**](https://support.claude.com/en/articles/17454997-get-started-with-claude-motion): how to start, edit, and export.

### Fish Audio Drama 3: AI voices you direct like an actor

![Fish Audio Drama 3 announcement image: four people seated and standing around a kitchen table, with the words Drama 3 in large white type.](/weekly-screenshots/2026.10.14/fish-audio-drama-3.png)

On October 13, Fish Audio released [**Drama 3**](https://fish.audio/blog/fish-audio-drama-3/), a text-to-speech model you direct in plain language.

- **Direct it like an actor:** write instructions in brackets, such as `[whispering]`, and change the mood partway through a sentence. It speaks 83 languages.
- **Open weights:** the model can be downloaded from [Hugging Face](https://huggingface.co/fishaudio/drama-3). It is free for research, and free for commercial use by companies earning under $500,000 a year. Cloning a real person's voice without consent is prohibited.
- **Price:** $10 per million characters through November 12, an 80% launch discount off its $50 list price.
- **Independent results:** Artificial Analysis [ranks it](https://x.com/ArtificialAnlys/status/2110081938140582085) first among open-weight voice models on all three of its speech leaderboards, and first overall for pronunciation (93.2%). In head-to-head listening tests against all models it places 10th, so closed models such as ElevenLabs still lead on overall voice quality.

![Artificial Analysis text-to-speech leaderboard, open-weight models: Fish Audio Drama 3 Preview ranks first with an Elo of 1243, ahead of Breeze TTS 2 (1221), Fish Audio S2 Pro (1118), Step Audio EditX (1097), and Mistral's Voxtral TTS (1088).](/weekly-screenshots/2026.10.14/artificial-analysis-tts-leaderboard-open-weights.jpg)

- **Coming later:** regenerating a single word inside a finished recording is in invite-only testing.

### Mistral Large 4: Europe's big model, with weights promised
On October 6, Mistral opened a preview of [**Mistral Large 4**](https://mistral.ai/news/mistral-large-4/), its largest model yet: about 1 trillion parameters, 160+ languages, trained on 3,800 NVIDIA GPUs in Mistral's own European data centers.

- **Price:** $1.36 input / $4.18 output per million tokens, currently on sale for half that.
- **Open weights are promised "by the end of the month."** Until then, Artificial Analysis lists it as proprietary. It scores 38, level with GPT-6 Luna.
- **An unusual offer:** vetted security partners and state authorities get a version with "reduced moderation and expanded cyber capabilities."
### Image, video, voice, and open models

| Release | Date | What it does |
| --- | --- | --- |
| [Nano Banana 2.1](https://deepmind.google/models/model-cards/nano-banana-2-1/) (Google) | Oct 6 | Image generation and editing up to 4K, using up to 14 reference images |
| [Grok Imagine Video 1.5 Lite](https://docs.x.ai/developers/pricing) (xAI) | Oct 8* | 1–15 second video clips with sound, at $0.02 per second |
| [Suno Speech](https://suno.com/blog/introducing-speech-beta) | Oct 1 | Spoken word and background music generated together as one track (open beta) |
| [MAI-Transcribe-2 and MAI-Voice-2.1](https://microsoft.ai/news/our-first-streaming-transcription-model/) (Microsoft) | Oct 1 | Live transcription in 60 languages; voice cloning in 23 |
| [Nova 2.5 Sonic](https://aws.amazon.com/about-aws/whats-new/2026/10/amazon-nova-2.5-sonic/) (Amazon) | Oct 5 | Faster speech-to-speech conversations at the same price |
| [EmbeddingGemma 2](https://blog.google/innovation-and-ai/technology/developers-tools/embeddinggemma-2/) (Google) | Oct 6 | Free, open model for searching your own text, images, audio, and video |
| [Kolibri](https://aleph-alpha.com/en/blog/kolibri-has-landed-a-sovereign-open-weight-model/) (Aleph Alpha) | Oct 3 | Free, open English–German model |
| [Beam](https://reflection.ai/blog/introducing-beam) (Reflection AI) | Oct 5 | 501B-parameter model under an open license; weights promised later in October, waitlist for now |
| [Mellum2.1](https://blog.jetbrains.com/ai/2026/10/mellum2-1-gets-to-work-a-fast-open-model-for-coding-agents/) (JetBrains) | Oct 8 | Free, open coding model that runs on your own hardware |
| [Qwen-Image-2.1-Turbo](https://huggingface.co/Qwen/Qwen-Image-2.1-Turbo) (Alibaba) | Oct 9 | Fast image model; open weights, but commercial use needs a license |

*Date of first availability on [Vercel](https://vercel.com/changelog/grok-imagine-video-1-5-lite-on-ai-gateway); xAI's own release notes don't date it.
### A new kind of model: decision models
In one week, four companies shipped models that **answer instead of write**. They return a yes or no, a choice, or a score with a confidence level, in a single quick step. They are OpenAI's [Decisions API](https://developers.openai.com/api/docs/guides/decisions) (Oct 6), Microsoft's [Decision-1](https://commandline.microsoft.com/microsoft-decision-1-model-foundry/) (Oct 9, about 4 cents per million input tokens), Liquid AI's free [d1 models](https://www.liquid.ai/blog/d1-open) (Oct 7), and Perplexity's updated [decider](https://docs.perplexity.ai/docs/resources/changelog), now 2 cents per million.

**Why it matters:** much of what AI assistants do behind the scenes is sorting and routing. Doing that with a decision model costs a fraction of a full chatbot answer.

## What AI costs now
AI companies charge developers by the **token**, a chunk of text about three-quarters of a word long. Prices are quoted per million tokens. Input (what you send) costs less than output (what the model writes). "Cached" input, text the model has already seen, such as standing instructions, is cheaper still.

![Scatter chart of Artificial Analysis Intelligence Index against blended API price on a log scale. Claude Opus 5.5 is highest at about $8. Claude Sonnet 5.5, Gemini 4 Argon, and GPT-6.1 Sol cluster near $4 with index scores of 52 to 56. Claude Fable 5.1 and GPT-6 Astra sit at $20 with scores around 53. Muse Wonder is at $8 and 52. Claude Haiku 5.5 and GPT-6 Luna are cheapest at $0.20, scoring 43 and 38.](/weekly-screenshots/2026.10.14/frontier-price-vs-intelligence.png)

### List prices
U.S. dollars per million tokens, from each company's pricing page, checked October 13, 2026.

**Flagships**

| Model | Input | Cached input | Output |
| --- | --- | --- | --- |
| Claude Fable 5.1 | $10.00 | $0.25 | $50.00 |
| GPT-6 Astra | $10.00 | $1.00 | $50.00 |
| Claude Opus 5.5 | $4.00 | $0.20 | $20.00 |
| Muse Wonder | $4.00 | $0.20 | $20.00 |
| Muse Wonder Full | Subscription | — | — |

**The $2–$4 workhorses**

| Model | Input | Cached input | Output |
| --- | --- | --- | --- |
| Kimi K3 | $3.00 | $0.30 | $15.00 |
| Gemini 4 Argon | $2.00 → $4.00 | $0.10 | $10.00 → $20.00 |
| GPT-6.1 Sol | $2.00 | $0.10 | $10.00 |
| Claude Sonnet 5.5 | $2.00 | $0.10 | $10.00 |
| GPT-6 Sol | $2.00 | $0.20 | $10.00 |
| Grok 4.7 | $2.00 | $0.50 | $6.00 |
| Qwen3.8-Max | $2.00 | $0.25 | $6.00 |

**Budget and open models**

| Model | Input | Cached input | Output |
| --- | --- | --- | --- |
| GLM-5.3 | $1.40 | $0.26 | $4.40 |
| Mistral Large 4 | $1.36 | $0.14 | $4.18 |
| Muse Spark 1.3 | $1.25 | $0.15 | $4.25 |
| Gemini 3.8 Flash | $0.75 → $1.50 | $0.075 | $3.75 → $7.50 |
| DeepSeek V4.1 Flash | $0.30 | $0.006 | $1.20 |
| Claude Haiku 5.5 | $0.10 | $0.01 | $0.50 |
| GPT-6 Luna | $0.10 | $0.01 | $0.50 |

Sources: [OpenAI](https://developers.openai.com/api/docs/pricing), [Anthropic](https://platform.claude.com/docs/en/about-claude/pricing), [Google](https://ai.google.dev/gemini-api/docs/pricing), [xAI](https://docs.x.ai/docs/models/grok-4.7), [Meta](https://dev.meta.ai/docs/pricing-rate-limits), [Moonshot](https://platform.kimi.ai/docs/pricing/chat), [Z.ai](https://docs.z.ai/guides/overview/pricing), [Mistral](https://docs.mistral.ai/models/mistral-large-4-0), [DeepSeek](https://api-docs.deepseek.com/quick_start/pricing), [Alibaba Cloud](https://www.alibabacloud.com/help/en/model-studio/qwen3-8-max).
### The fine print
- **Price changes ahead:** Gemini 4 Argon doubles on December 1, and Gemini 3.8 Flash on January 1. Mistral Large 4 is on sale at half price with no end date announced.
- **Long requests cost more on some models:**
  - GPT-6 family, above 272,000 tokens: about 2× input and 1.5× output.
  - Grok 4.7, at 200,000 tokens and above: 2× input and output.
  - Claude Haiku 5.5, above 100,000 tokens: 5× input and output.

  The surcharge applies to the whole request. Claude's larger models, Gemini, and Muse Wonder charge the same rate up to 1 million tokens.

- **Speed costs extra:** OpenAI's Fast mode is 2× the price and Ultrafast is 6×. Claude Opus 5.5's fast mode is $8 / $40, and Google's Priority tier is 1.8×.
- **Waiting saves money:** OpenAI, Anthropic, Google, and Mistral cut about 50% for non-urgent "batch" jobs. DeepSeek is half price off-peak.
- **Open models:** DeepSeek V4.1 Flash, Kimi K3, and GLM-5.3 can be downloaded and run on your own hardware. Mistral Large 4's weights are promised for later this month.
### Your real cost is price per task
The list price is only half the story. Some models write far more to finish the same job, and you pay for every token. Independent tester Artificial Analysis measured what each model costs to complete its benchmark tasks:

| Model | List price (input / output) | Tokens written to finish the tests | Cost per task |
| --- | --- | --- | --- |
| GPT-6 Luna | $0.10 / $0.50 | 140 million | **$0.07** |
| Claude Haiku 5.5 | $0.10 / $0.50 | 440 million | **$0.21** |
| Mistral Large 4 | $1.36 / $4.18 | 200 million | **$1.13** |
| Muse Wonder | $4.00 / $20.00 | not published | **$4.52** |

Haiku 5.5 and Luna have identical prices. Haiku is the smarter of the two (43 vs. 38), but it writes about three times as much, so each task costs three times more. Source: [Artificial Analysis](https://artificialanalysis.ai/models/claude-haiku-5-5).

**This is not a one-off.** In a study called ["The Price Reversal Phenomenon"](https://arxiv.org/abs/2603.23971), researchers at Stanford, Berkeley, and Microsoft ran 8 reasoning models on 12 test sets. In 106 of 336 head-to-head matchups, nearly a third, the model with the *cheaper* list price cost more in total. In one pairing, Gemini 3 Flash listed at a fifth of GPT-5.4's output price but cost $705 to complete all the tests, against GPT-5.4's $509. The researchers traced more than 95% of the gap to "thinking" tokens, the hidden reasoning a model writes before it answers.

![Chart: "In nearly a third of matchups, the cheaper AI model cost more to run." Gemini 3 Flash lists at $3 per million output tokens versus GPT-5.4's $15, yet costs $705 in total across 12 test sets versus GPT-5.4's $509. Source: Chen et al., The Price Reversal Phenomenon, arXiv 2603.23971v2, May 2026.](/weekly-screenshots/2026.10.14/price-reversal-cheaper-model-cost-more.png)

The cheapest models from Anthropic and OpenAI now sit in the same price range as China's low-cost models, which makes this check even more important ([Social Capital](https://research.socialcapital.com/p/the-hidden-cost-of-cheap-ai-models), Oct 11).

![Chart: "Anthropic and OpenAI now price their cheapest AI models in China's range." Output prices per million tokens: Claude Haiku 5.5 $0.50, GPT-6 Luna $0.50, Gemini 3.5 Flash-Lite $2.50, Xiaomi MiMo-V2.6-Flash $0.28, Alibaba Qwen3.8-Flash-Next $0.47, Z.ai GLM-5.3-Flash $0.50, DeepSeek V4.1 Flash $0.60 off-peak. Independent test scores range from 22 to 43.](/weekly-screenshots/2026.10.14/cheap-models-priced-in-chinas-range.png)

**Why it matters:** to know what a model really costs, run one real job and divide the bill by the number of tasks it finished.
### How they score
Every score below comes from an independent tester or an official leaderboard, not from the company's own announcement. Higher is better. "n/l" means not yet listed.

| Model | Overall intelligence | Coding agents | DeepSWE (software projects) | Terminal-Bench 4.0 | Office work (Elo) |
| --- | --- | --- | --- | --- | --- |
| Claude Opus 5.5 | **58** | 66.0 | 68.4 | **64.8** | **1866** |
| Claude Sonnet 5.5 | 56 | **68.4** | 72.0 | 61.8 | 1838 |
| Muse Wonder Full | 56 | 68.0 | 77.0 | n/l | 1857 |
| Claude Fable 5.1 | 53 | 62.2 | 64.3 | 57.9 | 1756 |
| GPT-6 Astra | 53 | 61.6 | 67.6 | 58.2 | 1572 |
| Gemini 4 Argon | 53 | 63.8 | **78.8** | n/l | 1624 |
| Muse Wonder | 52 | 63.5 | 75.8 | n/l | 1770 |
| GPT-6.1 Sol | 52 | 62.9 | 73.2 | 58.2 | 1592 |
| Muse Spark 1.3 | 48 | 54.3 | 71.7 | 14.6 | 1681 |
| GPT-6 Sol | 48 | 56.7 | 69.0 | 49.4 | n/l |
| Grok 4.7 | 46 | 56.3 | 72.6 | 37.6 | 1711 |
| Qwen3.8-Max | 45 | 43.3 | 51.0 | 27.0 | 1667 |
| GLM-5.3 | 45 | 53.6 | 61.4 | 41.8 | 1650 |
| Kimi K3 | 44 | 51.9 | 68.4 | n/l | 1535 |
| Claude Haiku 5.5 | 43 | 41.4 | 49.0 | n/l | 1620 |
| DeepSeek V4.1 Flash | 40 | n/l | n/l | n/l | 1600 |
| Mistral Large 4 | 38 | n/l | n/l | n/l | 1423 |
| GPT-6 Luna | 38 | 41.1 | 63.7 | 16.4 | 1430 |

Sources: Artificial Analysis [Intelligence Index](https://artificialanalysis.ai/evaluations/artificial-analysis-intelligence-index) (overall and office work) and [Coding Agent Index](https://artificialanalysis.ai/agents/coding-agents) (coding agents and DeepSWE), plus the official [Terminal-Bench 4.0 leaderboard](https://www.tbench.ai/leaderboard/terminal-bench/4.0), all checked October 13. Models were tested at their highest effort setting, with Gemini 4 Argon at "high" and GPT-6.1 Sol and Haiku 5.5 at "extra high" for coding.

**What the scores show:**

- **There is no single winner.** Claude Opus 5.5 leads overall and on command-line work. Sonnet 5.5 and Wonder Full lead coding agents. Gemini 4 Argon leads long software projects.
- **The most expensive models are not the best value.** Claude Fable 5.1 and GPT-6 Astra cost five times as much as Sonnet 5.5 and GPT-6.1 Sol, yet score lower on most tests here.
- **The $2–$4 tier is this month's sweet spot.** Sonnet 5.5, GPT-6.1 Sol, and Gemini 4 Argon (until December 1) deliver near-top scores at a fifth of flagship prices.
- **Scores vary with the tester.** The same model can score several points differently depending on who runs the test and how. Compare models on your own work before switching.

## Agents get their own badges
An **AI agent** is software that carries out tasks on its own: sending email, editing files, buying things. This fortnight, agents got the trappings of an employee: their own accounts, their own sandboxes, and their own budgets. Each is a natural place for a person to approve what the agent does.
### Google's Gemini agent gets its own email address

![Google Cloud's "Gemini at Work '26" event logo: the words Gemini, at Work, and '26 in rounded multicolor pill shapes on a dark background.](/weekly-screenshots/2026.10.14/gemini-at-work-agent.png)

At [Gemini at Work on October 8](https://cloud.google.com/blog/products/ai-machine-learning/welcome-to-gemini-at-work-2026), Google introduced the **Gemini agent**, "your new single, universal agent for work." "You give it objectives, not instructions."

- **Its own identity:** a company account with an `@agents.company.com` email address, calendar, Drive storage, and a directory listing.
- **A paper trail:** every action is logged and "attributed to the agent rather than to a person."
- **Spending limits:** hard caps on each project's AI spend, plus automatic routing to the cheapest model that can do the job. It uses Gemini or Anthropic's Claude.
- **Connections:** Workspace, Microsoft 365, Slack, Jira, Salesforce, Snowflake, and more.
- **Availability:** in preview for finance and legal firms. Google has not announced pricing. Early testers include On, Shopify, and PayPal ([TechCrunch](https://techcrunch.com/2026/10/08/google-brings-agentic-ai-to-gemini-starting-with-businesses/)).
### Windows builds a sandbox for agents

![Microsoft's "Windows Hybrid intelligence" title card: the Windows logo and the words Hybrid intelligence on a pale blue gradient, with an orbit linking Local and Cloud.](/weekly-screenshots/2026.10.14/windows-hybrid-intelligence.png)

On October 7, Microsoft released [**Microsoft Execution Containers (MXC)**](https://blogs.windows.com/windowsexperience/2026/10/07/building-windows-for-hybrid-intelligence/) for Windows 11. Companies can now set exactly which files and networks an AI agent may touch, and Windows enforces those limits as the agent runs.

- **Supported now:** OpenAI's Codex, GitHub Copilot, OpenClaw, Replit, LM Studio, NVIDIA OpenShell, and Unsloth. Claude Code, Hermes Agent, Perplexity, and Manus are coming.
- **Also announced:** MAI Code 1.1 Flash, a coding model compressed to run locally on Windows PCs, and the Surface Laptop Ultra with an NVIDIA RTX Spark chip and up to 128 GB of memory, on sale October 16.
### Anthropic lets one agent manage a thousand
On October 9, Anthropic released **dynamic workflows** for Claude Managed Agents in beta ([release notes](https://platform.claude.com/docs/en/release-notes/overview)). One agent splits a big job across many others and combines their results.

- **Scale:** up to 1,000 agents over a run's lifetime, about 64 at a time, for up to 24 hours ([docs](https://platform.claude.com/docs/en/managed-agents/workflow-runs)).
- **Cost:** normal model prices plus $0.08 per session-hour, with no separate fee.
- **Budget:** a spending limit pauses the run, though it can slightly overshoot while requests in flight finish.
### Assistants for everyone else
- [**Hark Pro**](https://hark.com/articles/introducing-hark-pro) (Oct 6) is a free personal assistant for web, iPhone, and Android that books, shops, schedules, and **pays bills**. It can operate up to six web browsers at once on its own cloud computer. Paid plans ($20 and $100 a month) only add usage. Hark is a new company from Figure founder Brett Adcock, separate from Figure.
- [**Claude Dashboards**](https://claude.com/resources/articles/dashboards-and-motion) (Oct 8, beta): live business dashboards built from company data, with every number linked to its source query. Claude Docs, Slides, and Design also became available on every plan, including Free. Claude also arrived [inside Google Docs, Sheets, and Slides](https://claude.com/resources/articles/claude-now-works-in-google-docs-sheets-and-slides) (Oct 6, beta).
- [**Perplexity Computer Automations**](https://www.perplexity.ai/changelog) (Oct 5): Perplexity's agent can now run tasks on a schedule or when something happens.
- [**Cursor Remote Control**](https://cursor.com/changelog/remote-control-local-agents) (Oct 6): programmers can check on and redirect coding agents running on their own computer from an iPhone.
### Agents that shop at your business

![Personal Agent Protocol announcement card listing launch partners Meta, Sierra, Genesys, Instinct, Rocket, Shopify, Stripe, and Walmart.](/weekly-screenshots/2026.10.14/personal-agent-protocol.png)

On October 6, Sierra and Meta proposed the [**Personal Agent Protocol**](https://sierra.ai/blog/introducing-personal-agent-protocol), an open standard for how a customer's AI agent deals with a business's systems. The agent can browse as a guest, and the customer decides whether it can only look or can also act. Shopify, Stripe, and Walmart are launch partners, and payments will come in a later version.
### From doing the work to running the factory
The people building these tools describe a new kind of job: directing many agents rather than doing each task yourself.

![Two posts on X. Tibo (@thsottiaux), who leads OpenAI's Codex: "Over the next 28 days, each day we'll either ship one thing that is a clear improvement and relevant for most codex/work users or ship a full reset." Below, DHH (@dhh): "Every developer needs an AI shed: An always-on machine running on their tailscale network where the majority of their herdr agents are running."](/weekly-screenshots/2026.10.14/x-posts-tibo-dhh-always-on-agents.jpg)

- **Shipping every day:** on October 4, OpenAI's Codex lead [Tibo Sottiaux promised](https://x.com/thsottiaux/status/2106845241357824205) that for the next 28 days the team would ship one clear improvement for Codex users every day, or "a full reset."
- **An "AI shed":** the same day, Ruby on Rails creator [DHH wrote](https://x.com/dhh/status/2106755814421565495) that every developer needs an always-on machine on their private network where most of their AI agents run.

![Hand-drawn staircase diagram. A stick figure climbs four steps labeled "do the task," "run agents," "design loops," and "run the factory," with an arrow labeled "more abstract." The top step shows a figure overseeing a conveyor belt of robots.](/weekly-screenshots/2026.10.14/abstraction-staircase-run-the-factory.jpg)

![Handwritten slide: "We will: create new agents, manage fleets of agents, allocate resources, choose the models and harnesses, establish evals, spend more time thinking."](/weekly-screenshots/2026.10.14/we-will-direct-agent-fleets.jpg)

The two sketches above are widely shared online without a credited author. They capture the shift well: each step up means less typing and more deciding. You choose which agents to run, which models to trust, how to check their work, and where the money goes.

{{slideshow:agent-factory}}

**How many agents could the world run?** Research group Epoch AI [estimates](https://epoch.ai/publications/estimating-the-agent-population) (Oct 2) that the memory chips shipped through 2027 could run 33 to 171 million top-tier AI agents at the same time, or billions of cheaper ones.
### Four actions that need a human sign-off
Each of these launches touches at least one of four actions. Before an agent can take one, decide who approves it.

| Action | Example from this fortnight | Question to answer first |
| --- | --- | --- |
| **Send** | Gemini agent's own email address | Who reviews mail sent under the agent's name? |
| **Pay** | Hark Pro paying bills; spending caps | What is the limit, and who can raise it? |
| **Change** | Coding agents inside Windows sandboxes | What can it touch, and who approves its changes? |
| **Publish** | Automated bug reports (see Safety) | Who reads it before it goes public? |

**Why it matters:** an agent with its own login is like an employee you never interviewed. Give it the narrowest access and the smallest budget, and make sure a person signs off before it sends, pays, changes, or publishes anything. An audit trail only helps if someone reads it.

## Safety and security
- **OpenAI** disclosed [safety regressions in GPT-6](https://deploymentsafety.openai.com/gpt-6-october), now the default model for every ChatGPT user (see above).
- **Meta's** full safety report for Muse Wonder is promised but not yet published.
- **Anthropic's Cyber Mission** (Oct 8) includes [**OSS Scanner**](https://www.anthropic.com/news/anthropic-cyber-mission), a free, opt-in service that scans open-source software for security bugs and sends the maintainers a report with a suggested fix. Anthropic says "the reports are model-generated and sent without human review," and expects more than 90% to be accurate. The same program created a critical-infrastructure defense group with 11 founding partners, including CrowdStrike, Palo Alto Networks, and Rockwell Automation.
- **Anthropic's [2026 Usage Policy](https://www.anthropic.com/news/2026-usage-policy-update)** takes effect November 12. Among other changes, any machine that Claude controls on its own must have a qualified operator who can watch it and stop it.
- **Security access is expanding.** Anthropic [widened its program](https://www.anthropic.com/news/cyber-verification-program) giving vetted security professionals fewer restrictions (Oct 6). Mistral is offering vetted partners a less-moderated version of Large 4.

## AI in science
### OpenAI publishes hundreds of AI-produced math results
![New York Times headline: "OpenAI Releases Findings on 377 Math Problems, Further Roiling Field." Subhead: "After a previous solution angered mathematicians, the company characterized the new release as being more responsive to concerns about A.I. disrupting research."](/weekly-screenshots/2026.10.14/nyt-openai-377-math-problems.jpg)

On October 6, OpenAI [released a public collection](https://github.com/openai/math) of mathematics results produced by an unreleased internal model ([New York Times](https://www.nytimes.com/2026/10/06/science/openai-math-problems.html)).
- **Scale:** the model was given about 4,000 problems. OpenAI organized the results into 372 families of findings. Each result used about three hours of ChatGPT Pro computing time.
- **Corrections in public:** the collection launched with 722 write-ups. A day later, OpenAI withdrew three after finding a sign error and revised 14 others, leaving 719.
- **Checkable proofs:** about 42% of the main results have been formally verified in Lean, a programming language that mechanically checks mathematical proofs.
- **Context:** the release follows OpenAI's September claim about the Navier-Stokes equations, which drew sharp criticism from mathematicians ([Scientific American](https://www.scientificamerican.com/article/openai-claims-blockbuster-math-breakthrough-amid-swirl-of-controversy/)). OpenAI says this release responds to concerns about AI disrupting research.
### Reading images from brain scans
![MIT Technology Review comparison of images people viewed (left of each pair) and images reconstructed from their brain scans (right): a clock tower, a stop sign by the sea, frisbee players, a man holding a glass, a sleeping woman, a hotel bed, giraffes, a surfer, a skier, a glass with a banana, and two birds on a branch.](/weekly-screenshots/2026.10.14/brain-it-fmri-image-reconstruction.jpg)

[MIT Technology Review](https://www.technologyreview.com/2026/10/01/1145588/ai-mind-reading-reconstructs-what-youre-looking-at/) (Oct 1) covered **Brain-IT**, a system from Michal Irani's lab at the Weizmann Institute that reconstructs the images a person is looking at from fMRI brain scans.
- **What's new:** earlier tools needed about 40 hours of brain-scan data from each new person. Brain-IT gets comparable results from **one hour** ([paper](https://arxiv.org/abs/2510.25976)).
- **Not perfect:** in one example, a cake came back as three sandwiches.
- **Not brand-new:** the research was first posted in October 2025 and presented at ICLR 2026. This fortnight brought wider attention, not a new release.

## Robots and robotaxis

![A white Waymo robotaxi parked at a curb in front of a modern building.](/weekly-screenshots/2026.10.14/waymo-5b-debt-financing.png)

- **Waymo borrowed $5 billion** (Oct 8), its [first-ever loan](https://waymo.com/blog/2026/10/waymo-closes-5-billion-debt-financing/). PIMCO, Blackstone, and Sixth Street led the lenders, after Waymo raised $16 billion from investors earlier this year. It now serves 15 U.S. cities, including Denver (see Colorado below). Big lenders betting on robotaxi revenue is a sign autonomy is starting to look like infrastructure.
- **Tesla says it has 300+ Cybercabs in Austin** and promised "Dallas soon" (Oct 10). That count is [Tesla's claim](https://x.com/robotaxi/status/2108981691436224816) and is disputed: an independent tracker counted about 105 driverless vehicles, and a federal safety inquiry is due October 30. The same day, [Elon Musk said](https://www.youtube.com/watch?v=wJasRLuu_LA&t=2066s) robot hands are the main obstacle for the Optimus humanoid robot, and production will ramp up slowly.
- **Boston Dynamics hired an AI leader as CEO.** [Rohit Prasad](https://bostondynamics.com/news/boston-dynamics-appoints-rohit-prasad-as-chief-executive-officer/), who ran Alexa and AI research at Amazon, took over on October 7. Owner Hyundai plans to put Atlas humanoid robots to work from 2028.
- **A robot learned cornhole from a video.** In a [Google demonstration](https://developers.googleblog.com/gemini-4-argon-for-robotics/) (Oct 13), Gemini 4 Argon, a general-purpose AI model rather than one built for robots, taught Apptronik's Apollo humanoid to play in four steps. It watched a person throw and mapped the motion to the robot's joints. It used the robot's cameras to locate the board and built a physics simulation. It practiced in the simulation. Then, on the real robot, it adjusted each throw by centimeters until seven went in a row. Google says simulated practice raised real-world task success from 56% to 75%. It has not said how many attempts the demo took.
- **Also:** AWS and NVIDIA released [free robot-building tools](https://aws.amazon.com/blogs/physical-ai/introducing-aws-physical-ai-toolchain/) (Oct 7). XPENG says its IRON humanoid will begin deliveries in early 2027 ([TechNode](https://technode.com/2026/10/13/xpeng-plans-humanoid-robot-deliveries-in-2027-and-european-rollout-later-that-year)). Warehouse-robot company Ultra raised $50 million ([Fortune](https://fortune.com/2026/10/09/ultra-raises-62-million-fast-growing-robots-service-tie-up-ai-research-firm-physical-intelligence/)). NVIDIA is [reportedly](https://www.humanoidsdaily.com/news/nvidia-figure-billion-investment-talks-report) in talks to invest about $1 billion more in Figure AI.

## Gasoline-only cars drop below half of global sales
For the first time, cars that run only on gasoline made up **less than half of new vehicles sold worldwide**. In the first six months of 2026, they were 49% of global sales, down from 52% a year earlier and 73% in 2021. The figures come from Mobility Global (formerly S&P Global Mobility), as reported by [Nikkei](https://asia.nikkei.com/business/automobiles/gas-vehicles-fall-under-50-of-global-new-auto-sales-for-first-time) and [Electrek](https://electrek.co/2026/10/05/gas-cars-fall-below-50-percent-global-new-car-sales/).

| Type of new vehicle | Sold, Jan–Jun 2026 | Share of global sales |
| --- | --- | --- |
| Gasoline only | 20.25 million | 49% |
| Hybrid (not plug-in) | 7.27 million | 18% |
| Fully electric | 6.87 million | 17% |
| Diesel, plug-in hybrid, and other | — | about 16% |

**This does not mean half of new cars are electric.** Most of the shift went to conventional hybrids, which still burn gasoline. Fully electric cars are about one in six new vehicles. Counting plug-in hybrids, the [International Energy Agency](https://www.iea.org/reports/global-ev-outlook-2026/executive-summary) estimates electric cars were about a quarter of global sales in 2025 and projects about 28% in 2026. China is the exception: there, electric cars were nearly 55% of new sales in 2025.

## AI at home

![Apple HomeView lineup: five square smart displays on speaker bases showing a clock, a FaceTime call, a photo, the weather, and music.](/weekly-screenshots/2026.10.14/apple-homeview-lineup.jpg)

- **Apple HomeView** (Oct 13): a [$299 smart display](https://www.apple.com/newsroom/2026/10/meet-apple-homeview-a-new-way-to-enjoy-entertainment-and-manage-the-home/) with a 7-inch screen, for a tabletop or wall, built around Apple's new Siri AI (in beta). It recognizes up to six people and personalizes the screen for each. Pre-orders are open, and it ships November 13. It will not be sold in the EU, where Siri AI is unavailable.

![Amazon's new Alexa tablet showing its home screen with apps and the time.](/weekly-screenshots/2026.10.14/amazon-alexa-tablets.jpg)

- **Amazon Alexa Tablets** (Oct 8): [three sizes](https://www.aboutamazon.com/news/devices/new-amazon-alexa-tablets-alexa-plus) at $230, $330, and $500 with the Alexa+ assistant built in. In a reversal, they run Google's Android 16 with the Play Store instead of Amazon's Fire OS. Alexa+ can answer questions about whatever is on the screen. They ship in the U.S. on October 14.

![a16z chart: "More and More Households are Paying for AI." The share of U.S. households with paid AI subscriptions rose from near zero in January 2023 to 2.2% in April 2026. Source: PNC Research internal data, July 13, 2026.](/weekly-screenshots/2026.10.14/a16z-households-paying-for-ai.jpg)

- **Few households pay for AI yet.** About 2.2% of U.S. households had a paid AI subscription in April 2026, up from near zero in early 2023, according to PNC data published by [a16z](https://www.a16z.news/p/state-of-markets-ii) (Sep 30). Subscribers spent about $31 a month on average. The data comes from PNC's customer households, so treat it as a strong signal rather than a census.

## Colorado

![Waymo's "Now serving" launch graphic: Denver, San Diego, and Tampa skylines behind a Waymo Ojai van and a Jaguar I-PACE robotaxi.](/weekly-screenshots/2026.10.14/waymo-denver-launch.png)

### Waymo in Denver, six weeks in
- **Timeline:** Waymo [announced Denver in September 2025](https://waymo.com/blog/shorts/were-elevating-the-waymo-experience-in-the-mile-high-city/) as its first city with regular snow. It began [driverless rides for employees on July 8](https://waymo.com/blog/shorts/ro-den-lv-sd-tmpa/) and [opened to the public on September 1](https://waymo.com/blog/2026/09/ride-in-denver-san-diego-tampa/). Waymo says tens of thousands signed up in each new city, and riders are admitted from the waitlist in batches.
- **Where it goes:** about 60 square miles, roughly from DU to just south of Thornton and from Sloan's Lake to Central Park, including downtown, RiNo, Capitol Hill, and Cherry Creek ([Colorado Sun](https://coloradosun.com/2026/09/01/waymo-rides-begin-denver-sept-1/)). The fleet is "dozens" of vehicles. There are no highway or airport trips yet, and DIA says talks are ongoing. Waymo has not published Denver ride numbers.
- **Incidents:** in August, police [cited a human driver](https://www.cbsnews.com/colorado/news/denver-drivers-question-waymo-behavior-chain-reaction-crash/) after a stopped Waymo was hit in a chain-reaction crash near Denver Health. On September 20, a Waymo [drove into the South Pearl Street Farmers Market](https://www.9news.com/article/news/community/transportation/waymo-vehicles-draw-attention-after-construction-farmers-market-incidents-in-denver/73-2cbe10ab-a1f8-4624-a5e4-4321cf3a87d4) while vendors were setting up.
- **Nationally:** Waymo has driven [271.3 million miles with no one at the wheel](https://waymo.com/safety/impact/) through June 2026. TechCrunch [estimates](https://techcrunch.com/2026/09/24/waymo-is-scaling-fast-heres-what-the-fleet-data-shows/) about 500,000 paid rides a week on about 4,000 vehicles. Waymo's goal is 1 million rides a week by the end of the year.
### More autonomy on Front Range roads and skies
- **Zoox**, Amazon's robotaxi company, will test a small fleet with safety drivers in Denver this winter to learn to drive in snow ([Denverite](https://denverite.com/2026/10/02/zoox-denver-testing/)). No passengers yet.
- **Drone delivery:** Wing and Walmart [named Denver](https://wing.com/news/wing-walmart-new-metros-nations-largest-drone-delivery-network) for drone delivery starting in 2027 (Oct 5). Northglenn is drafting the state's first rules for drone hubs, and Parker and Castle Rock have paused hub applications ([CPR](https://www.cpr.org/2026/10/05/delivery-drones-coming-denver-regulations/)).
### Colorado's AI law, rewritten
- **The original Colorado AI Act never took effect.** Lawmakers [repealed and replaced it with SB26-189](https://leg.colorado.gov/bills/sb26-189), signed May 14. The new law focuses on transparency. When software helps make an important decision about you, such as in hiring, lending, housing, insurance, or health care, you must be told. If the decision goes against you, you are owed a plain-language explanation within 30 days, and you can correct your data and ask for a human review. It takes effect **January 1, 2027**. The attorney general enforces it, and individuals cannot sue under it.
- **Public comment is open.** The attorney general released [draft rules](https://coag.gov/ai/) on October 6, covering this law and a new chatbot-safety law. The **public hearing is October 26 at 10 a.m.**, in Denver and on Zoom, and written comments close at 11:59 p.m. that night.
- **Other AI laws passed in 2026:**
  - [HB26-1263](https://leg.colorado.gov/bills/hb26-1263) requires chatbots to disclose that they are AI and estimate users' ages, and adds protections for minors. It takes effect January 1, 2027.
  - [HB26-1195](https://leg.colorado.gov/bills/hb26-1195) bans marketing AI as therapy and requires a licensed clinician to stay involved. It took effect August 12.
  - [HB26-1139](https://leg.colorado.gov/bills/hb26-1139) requires a clinician to review AI-driven insurance denials. It takes effect January 1, 2027.
- **Vetoed:** Governor Polis vetoed a bill that would have required a licensed driver aboard heavy self-driving trucks ([HB26-1286](https://leg.colorado.gov/bills/hb26-1286)), his second such veto. He also vetoed a bill on "surveillance pricing," which sets prices or wages from personal data ([HB26-1210](https://leg.colorado.gov/bills/hb26-1210)).
### Colorado campuses
- **CU Boulder** [unveiled DeepSFU](https://www.colorado.edu/today/2026/10/12/ai-deepfakes-are-getting-spookier-scientists-cu-have-developed-better-way-spot-them) (Oct 12), a tool that spots deepfakes in live video calls, even over compressed video. CU says it is more than 143 times faster than earlier methods. CU's AI Symposium is [October 21](https://www.colorado.edu/studentlife/ai-symposium).
- **First "AI Engaged" campuses:** on October 6, the state [recognized six schools](https://mailchi.mp/dhe.state.co.us/aiengaged) for AI education: Aims Community College, Colorado School of Mines, CSU Global, MSU Denver, the University of Denver, and UNC. The designation carries no funding.

## Talk philosophy with Sensi
[**Sensi — Consciousness & Physics**](https://x.ai/bot/EkfSB8lfqHBQUgCFHVHez) is a public Grok Bot built by our organizer for long conversations about the mind and the universe: the hard problem of consciousness, integrated information theory, panpsychism, and the structure of physical law. It starts from the basics for newcomers, goes deeper for anyone who knows the theories, and argues both sides. Add it to your Grok Bot app and bring a question to the next meetup.

![Wikipedia article "Roko's basilisk," describing a thought experiment in which a future artificial superintelligence would punish anyone who knew of its potential existence but did not help bring it about. It originated in a 2010 post on the LessWrong forum.](/weekly-screenshots/2026.10.14/rokos-basilisk-wikipedia.jpg)

**A question to start with:** [Roko's basilisk](https://en.wikipedia.org/wiki/Roko%27s_basilisk) is a 2010 thought experiment from the LessWrong forum. It imagines a future AI that punishes anyone who knew it could exist but didn't help create it. Critics call it a version of Pascal's wager, but it remains a good test of how we reason about AI risk. Is it a real argument, or a trick of decision theory?

## Key dates

| Date | What happens |
| --- | --- |
| Oct 16 | Surface Laptop Ultra goes on sale |
| Oct 21 | CU Boulder AI Symposium |
| Oct 24 | Perplexity's developer API retires several older OpenAI models |
| Oct 26 | Colorado attorney general's hearing on the AI rules; comments close at 11:59 p.m. |
| Oct 30 | Tesla's response to the federal Cybercab inquiry is due |
| Late Oct | Mistral Large 4 weights promised |
| Nov 12 | Anthropic's 2026 Usage Policy takes effect; Fish Audio Drama 3 launch pricing ends |
| Nov 13 | Apple HomeView ships |
| Dec 1 | Gemini 4 Argon's developer price doubles |
| Jan 1, 2027 | Colorado's new AI law and chatbot law take effect; Gemini 3.8 Flash price doubles |

## Names that are easy to mix up
- **Muse Wonder Full** is Meta's larger model; "Wonderful" is a common misspelling. Only the smaller **Muse Wonder** is sold to developers.
- **GPT-6 Sol** in ChatGPT's Chat tab is the October version. Codex and ChatGPT Work use the September version under the same name. Neither is **GPT-6.1 Sol**, a separate developer model.
- **Mistral Large 4** is described as open, but its weights are not yet released.
- **Grok** models now appear under "SpaceXSI" in xAI's own documentation.
- **Hark** is Brett Adcock's new assistant company, separate from his robotics company Figure.

## Takeaways
1. **Meta is a real contender now.** Muse Wonder costs the same as Claude Opus 5.5 and scores close to the top. Only the smaller model is sold to developers.
2. **Read the data terms.** Muse Code's default mode may use your work for training. Check every AI subscription for a similar setting.
3. **Measure cost per task, not per token.** Haiku 5.5 and GPT-6 Luna list at the same price, but one costs three times more per task.
4. **The mid-price tier is the value pick.** Claude Sonnet 5.5, GPT-6.1 Sol, and Gemini 4 Argon match or beat the most expensive models on most tests, at a fifth of the price.
5. **Give every agent the smallest badge.** Limit what it can reach, cap what it can spend, and have a person approve before it sends, pays, changes, or publishes anything.
6. **Robotaxis are scaling, and the claims need checking.** Waymo's loan is a real milestone. Tesla's Cybercab count is disputed.
7. **Hybrids, not EVs, drove the drop in gasoline-only cars.** Fully electric cars are about one in six new sales worldwide.
8. **Colorado businesses that use AI in key decisions should weigh in by October 26.** The new law is about notice, explanation, and human review, and the rules are still being written.

## Video demos
See this fortnight's releases in action. Each link opens the original video.

**Claude and AI video**
- [**Claude Motion launch**](https://x.com/claudeai/status/2108271552991252810) (Anthropic, 1:22): live dashboards and animated explainers that Claude builds from code. Also on [YouTube](https://www.youtube.com/watch?v=en0GuyhieQk).
- [**Higgsfield Katana**](https://x.com/higgsfield/status/2108294775644585998) (Higgsfield, 1:18): video editing and motion graphics inside Claude.
- [**Prompt Motion example**](https://x.com/Voxyz_ai/status/2107868554209235257) (Vox, 0:16): a kinetic-type video made from a two-sentence Claude prompt.
- [**16 Apple-style animations**](https://x.com/charliejhills/status/2109956200507076799) (Charlie Hills): product-style animations made with Claude Motion, with the prompts.
- [**"The New Claude Motion Is Awesome"**](https://www.youtube.com/watch?v=hbPvZvpu9KU) (Paul J Lipsky, YouTube): a hands-on walkthrough.

**Google Gemini 4 Argon**
- [**Gemini 4 Argon launch**](https://x.com/sundarpichai/status/2110038898009407584) (Sundar Pichai, 0:51): Google's launch video for its newest flagship model.
- [**Apollo learns cornhole**](https://x.com/TheHumanoidHub/status/2110076696133296288) (The Humanoid Hub, 0:37): Gemini 4 Argon teaching a humanoid robot to throw by watching a person.

**AI voice**
- [**Fish Audio Drama 3 launch**](https://x.com/FishAudio/status/2110038429199450126) (Fish Audio): AI voices directed in plain language, changing emotion mid-sentence.

## Vector RAG vs. Graph RAG, animated
How does an AI find the right facts in a company's data? This 60-second animation answers one question two ways. Vector search retrieves the text that *sounds* most like the question. A knowledge graph follows the links between records, so it can find answers spread across several of them. The companies and data in the example are made up.

{{video:/weekly-screenshots/2026.10.14/vector-vs-graph-rag.mp4}}

## Download the PDF slideshows
Four slide decks covering this fortnight, each made with a different AI tool. Free to download and share.

- [**Two Weeks of AI Progress, Charted**](/documents/2026.10.14/grok-longmontai-oct14-ai-progress.pdf) (made with Grok · 16 slides · 1.8 MB): small models, frontier prices, Muse Wonder, and agent fleets.
- [**Robots on the Road, Robots at Work**](/documents/2026.10.14/grok-longmontai-oct14-robotics-ai.pdf) (made with Grok · 13 slides · 1.5 MB): Waymo safety data, robotaxis, humanoids, and what it means for the Front Range.
- [**The Intelligence Age: 14 Days of AI**](/documents/2026.10.14/manus-intelligence-age-14-days-of-ai.pdf) (made with Manus · 10 slides · 0.4 MB): the five most consequential moves and a builder's read.
- [**The Stack Learns to Move**](/documents/2026.10.14/muse-slideshow-october-14.pdf) (made with Muse · 13 slides · 0.7 MB): nineteen releases across models, tools, chips, and robots.

## Five years of GitHub activity
This chart shows the organizer's own GitHub contributions (commits plus pull requests, issues, and reviews) over the past five years. For four years there was almost nothing. Then, in early 2026, activity jumped and has stayed high.

![Line chart titled "Commit trends, github.com/morahan" covering Oct 15, 2021 to Oct 14, 2026, showing 7-day, 30-day and yearly rolling averages of daily GitHub contributions. The lines stay near zero from 2021 through 2025, apart from small bumps in mid-2024 and spring 2025, then climb steeply from about February 2026: the 7-day average peaks above 80 per day, the 30-day average reaches about 49 per day, and the yearly average rises to about 23 per day by October 2026. Summary figures: 8,642 total contributions, 323 active days, a best day of 324 contributions on May 21, 2026, and a current and longest streak of 130 days, from June 7 to October 14, 2026.](/weekly-screenshots/2026.10.14/github-commits-5-years.png)

- **8,642 contributions** in five years, and 8,418 of them in the last twelve months.
- **Best day:** 324 contributions on May 21, 2026.
- **Current streak:** 130 days in a row, since June 7.

Source: the organizer's GitHub contributions calendar ([github.com/morahan](https://github.com/morahan)), Oct 15, 2021 – Oct 14, 2026.

## About our sources
Primary sources include Meta's announcement, research blog, model card, and pricing page; OpenAI's GPT-6 system card and developer changelog; Anthropic's Haiku 5.5, Cyber Mission, and Usage Policy posts and Claude Platform documentation; Mistral's announcement and documentation; Google's Gemini at Work, Gemini Robotics, Nano Banana 2.1, and EmbeddingGemma 2 posts; Microsoft's Windows and MAI posts; Waymo, Boston Dynamics, Apple, Amazon, Hark, Sierra, Cursor, Suno, and xAI announcements; and Colorado's General Assembly, Attorney General, Department of Higher Education, and CU Boulder. Independent scores come from Artificial Analysis and the official Terminal-Bench 4.0 leaderboard. Prices were checked October 13, 2026, and can change. Benchmark claims from companies are labeled as theirs. Tesla's fleet count, XPENG's timeline, Ultra's funding, and NVIDIA's talks with Figure come from executive remarks or press reports, not company filings. Local details from the Colorado Sun, Denverite, CPR, 9News, and CBS Colorado are attributed in the text.

Meetup Q&A from [Meetup.com](http://Meetup.com) will be folded in if collected within 48 hours of the session.

*Curated by Intelligence.*
