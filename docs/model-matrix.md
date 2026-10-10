# Model Matrix: October 10, 2026

This is the complete reviewed snapshot: 44 rows (two permanent brands and 42 catalog entries), with all 11 matrix columns. For current calculated output, run `just update-models --matrix --check`. This document is a dated reference and is not rewritten by the recipe.

The 17 eligible model/tool entries divide the variable 50% using 76 weight units. The highest applicable weight wins; new means released within 30 days, inclusive, and supplies a 1.5x floor. Frontier and Pareto are editorial priorities; category-frontier age exceptions do not automatically increase weight. Percentages are rounded. Held and removed rows have zero probability. The Longmont.AI URLs on removed rows identify editorial exclusions, not evidence of a model release. See [the update workflow](model-updates.md).

Snapshot: 2026-10-10 (UTC)
| Text | Category | Priority | Released | Reviewed | Access | Exception | Weight | Probability | Disposition | Sources |
|---|---|---|---|---|---|---|---|---|---|---|
| Longmont.AI | fixed | permanent | - | - | - | - | fixed | 35% | permanent | - |
| 1023.Digital | fixed | permanent | - | - | - | - | fixed | 15% | permanent | - |
| Claude Fable 5.1 | base | frontier | 2026-09-01 | 2026-10-10 | API | Still a category frontier in current provider documentation; editorial exception. (2026-10-10) | 7x | 4.6053% | Primary release identity reviewed. | https://www.anthropic.com/claude/fable https://www.anthropic.com/claude/fable |
| GPT-6 Astra | base | frontier | 2026-09-03 | 2026-10-10 | API | Still a category frontier in current provider documentation; editorial exception. (2026-10-10) | 7x | 4.6053% | Primary release identity reviewed. | https://developers.openai.com/api/docs/models/gpt-6-astra https://developers.openai.com/api/docs/models/gpt-6-astra |
| Claude Opus 5.5 | base | frontier | 2026-09-22 | 2026-10-10 | Released | - | 7x | 4.6053% | Primary release identity reviewed. | https://www.anthropic.com/claude-opus-5-5 |
| Grok 4.7 | base | frontier | 2026-09-21 | 2026-10-10 | API | - | 7x | 4.6053% | Primary release identity reviewed. | https://x.ai/news/grok-4-7 |
| Gemini 4 Argon | base | frontier | 2026-09-30 | 2026-10-10 | Restricted Fairwind access | - | 7x | 4.6053% | Primary release identity reviewed. | https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-4-argon/ |
| DeepSeek V4.1 Flash | base | pareto | 2026-09-10 | 2026-10-10 | API and open weights | - | 5x | 3.2895% | Editorial quality/cost candidate; not an independently established benchmark frontier. | https://www.deepseek.com/en/news/deepseek-v4-1-flash/ |
| DeepSeek V4 Pro | base | - | 2026-08-13 | 2026-10-10 | API active; not retired | - | 0x | 0.0000% | hold: Older than 30 days; current category-frontier standing not verified. | https://api-docs.deepseek.com/updates/ |
| GPT-6.1 Sol | base | pareto | 2026-09-29 | 2026-10-10 | Released | - | 5x | 3.2895% | Editorial quality/cost candidate; not an independently established benchmark frontier. | https://openai.com/index/introducing-gpt-6-1-sol/ |
| Claude Sonnet 5.5 | base | pareto | 2026-09-28 | 2026-10-10 | Released | - | 5x | 3.2895% | Editorial quality/cost candidate; not an independently established benchmark frontier. | https://www.anthropic.com/claude-sonnet-5-5 |
| Claude Haiku 5.5 | base | pareto | 2026-10-07 | 2026-10-10 | Released | - | 5x | 3.2895% | Editorial quality/cost candidate; not an independently established benchmark frontier. | https://www.anthropic.com/claude-haiku-5-5 |
| Jev | decision | - | 2026-09-15 | 2026-10-10 | Early access | - | 3x | 1.9737% | Primary release identity reviewed. | https://typesafe.ai/blog/introducing-system-one-models-and-jev |
| Clef | decision | - | 2026-10-01 | 2026-10-10 | Workers AI | - | 3x | 1.9737% | Primary release identity reviewed. | https://developers.cloudflare.com/changelog/post/2026-10-01-clef-workers-ai/ |
| Clef-flash | decision | - | 2026-10-01 | 2026-10-10 | Workers AI | - | 3x | 1.9737% | Primary release identity reviewed. | https://developers.cloudflare.com/changelog/post/2026-10-01-clef-workers-ai/ |
| Clef-omni | decision | - | 2026-10-09 | 2026-10-10 | Released | - | 3x | 1.9737% | Primary release identity reviewed. | https://blog.cloudflare.com/clef-faster-cheaper-multimodal/ |
| Dots | tools | - | 2026-09-29 | 2026-10-10 | Released | - | 2x | 1.3158% | Primary release identity reviewed. | https://openai.com/index/introducing-dots/ |
| Pi 1.1.0 | tools | - | 2026-10-07 | 2026-10-10 | Versioned coding harness release | - | 2x | 1.3158% | Primary release identity reviewed. | https://pi.dev/changelog |
| Hermes Agent 0.21.6 | tools | - | 2026-10-08 | 2026-10-10 | Versioned agent patch; CLI and Cloud, not Desktop | - | 2x | 1.3158% | Primary release identity reviewed. | https://github.com/NousResearch/hermes-agent/releases/tag/v0.21.6 |
| Genie 3 | world | - | 2025-08-05 | 2026-10-10 | Limited access | Still a category frontier in current provider documentation; editorial exception. (2026-10-10) | 3x | 1.9737% | Primary release identity reviewed. | https://deepmind.google/blog/genie-3-a-new-frontier-for-world-models/ https://deepmind.google/models/genie/ |
| Muse | tools | - | 2026-09-08 | 2026-10-10 | Released | - | 0x | 0.0000% | hold: Older than 30 days; current category-frontier standing not verified. | https://about.fb.com/news/2026/09/introducing-muse-personal-ai-agent/ |
| GrokBot | tools | - | 2026-08-11 | 2026-10-10 | Released | - | 0x | 0.0000% | hold: Older than 30 days; current category-frontier standing not verified. | https://x.ai/news/introducing-grok-bot |
| Atlas | world | - | 2026-09-01 | 2026-10-10 | Limited access | - | 0x | 0.0000% | hold: Older than 30 days; current category-frontier standing not verified. | https://www.worldlabs.ai/blog/atlas |
| Marble | world | - | 2025-11-12 | 2026-10-10 | Released | - | 0x | 0.0000% | hold: Older than 30 days; current category-frontier standing not verified. | https://www.worldlabs.ai/blog/marble-world-model |
| GLM-5.3-FLASH | base | - | 2026-08-26 | 2026-10-10 | Released | - | 0x | 0.0000% | hold: Older than 30 days; current category-frontier standing not verified. | https://z.ai/blog/glm-5.3-flash |
| QWEN3.8-FLASH-NEXT | base | - | 2026-08-26 | 2026-10-10 | Released | - | 0x | 0.0000% | hold: Older than 30 days; current category-frontier standing not verified. | https://github.com/QwenLM/Qwen3.8-Flash-Next/blob/main/README.md |
| GRANITE 4.2 | base | - | 2026-08-25 | 2026-10-10 | Released | - | 0x | 0.0000% | hold: Older than 30 days; current category-frontier standing not verified. | https://research.ibm.com/blog/introducing-granite-4-2 |
| GEMINI 3.5 TRANSCRIBE | base | - | 2026-08-26 | 2026-10-10 | Public preview | - | 0x | 0.0000% | hold: Older than 30 days; current category-frontier standing not verified. | https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-5-transcribe/ |
| GEMINI OMNI 1.1 FLASH | base | - | 2026-08-27 | 2026-10-10 | Released | - | 0x | 0.0000% | hold: Older than 30 days; current category-frontier standing not verified. | https://blog.google/innovation-and-ai/technology/developers-tools/build-with-gemini-omni-1-1-flash/ |
| HY4 PREVIEW | base | - | 2026-08-28 | 2026-10-10 | Preview | - | 0x | 0.0000% | hold: Older than 30 days; current category-frontier standing not verified. | https://www.tencent.com/tencent-releases-and-open-sources-tencent-hy4-preview/ |
| SHARED COMPUTER | base | - | - | 2026-10-10 | Excluded | - | 0x | 0.0000% | remove: Non-model slogan or instruction removed by editorial policy. | https://longmont.ai/ |
| APPROVALS ON SEND | base | - | - | 2026-10-10 | Excluded | - | 0x | 0.0000% | remove: Non-model slogan or instruction removed by editorial policy. | https://longmont.ai/ |
| PROMO CLOCK | base | - | - | 2026-10-10 | Excluded | - | 0x | 0.0000% | remove: Non-model slogan or instruction removed by editorial policy. | https://longmont.ai/ |
| CHEAP MULTIMODAL | base | - | - | 2026-10-10 | Excluded | - | 0x | 0.0000% | remove: Non-model slogan or instruction removed by editorial policy. | https://longmont.ai/ |
| VENDOR REPORTED | base | - | - | 2026-10-10 | Excluded | - | 0x | 0.0000% | remove: Non-model slogan or instruction removed by editorial policy. | https://longmont.ai/ |
| OPEN WEIGHTS | base | - | - | 2026-10-10 | Excluded | - | 0x | 0.0000% | remove: Non-model slogan or instruction removed by editorial policy. | https://longmont.ai/ |
| READ THE LICENSE | base | - | - | 2026-10-10 | Excluded | - | 0x | 0.0000% | remove: Non-model slogan or instruction removed by editorial policy. | https://longmont.ai/ |
| AGENTIC SEARCH | base | - | - | 2026-10-10 | Excluded | - | 0x | 0.0000% | remove: Non-model slogan or instruction removed by editorial policy. | https://longmont.ai/ |
| START FROM SCRATCH | base | - | - | 2026-10-10 | Excluded | - | 0x | 0.0000% | remove: Non-model slogan or instruction removed by editorial policy. | https://longmont.ai/ |
| ORIGIN IS A HOST | base | - | - | 2026-10-10 | Excluded | - | 0x | 0.0000% | remove: Non-model slogan or instruction removed by editorial policy. | https://longmont.ai/ |
| WORK KEEPS RUNNING | base | - | - | 2026-10-10 | Excluded | - | 0x | 0.0000% | remove: Non-model slogan or instruction removed by editorial policy. | https://longmont.ai/ |
| DEEPSEEK V5 | base | - | - | 2026-10-10 | Excluded | - | 0x | 0.0000% | remove: Unverified or ambiguous alias; use only the explicit verified identity. | https://longmont.ai/ |
| GPT-6 | base | - | - | 2026-10-10 | Excluded | - | 0x | 0.0000% | remove: Unverified or ambiguous alias; use only the explicit verified identity. | https://longmont.ai/ |
| ASTRA | base | - | - | 2026-10-10 | Excluded | - | 0x | 0.0000% | remove: Unverified or ambiguous alias; use only the explicit verified identity. | https://longmont.ai/ |
