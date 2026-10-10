# Model Catalog Updates

See the [complete October 10 matrix](model-matrix.md) for all 44 rows and 11 columns, including held and removed phrases. It is a dated reference; `just update-models --matrix --check` calculates the current snapshot report.

Run `just update-models` to regenerate the shared Model Watch and Star Text snapshot from `content/models/catalog.json`. This is deterministic regeneration of reviewed facts, not automatic research. The generated TypeScript artifact is the single active roster for both surfaces. Historical benchmarks and timeline records remain in the archive.

Before changing the ledger, verify the original release date, specific product/version, access status, and category against primary sources. Record the source URL and actual `reviewedAt` date. A patch date applies only to that explicitly versioned tool entry, never to a base model. Pareto labels are editorial selections, not independently proven benchmark results.

An included entry must have been released within 30 UTC calendar days, inclusive. Future releases are held. Older entries require a sourced `frontierException` establishing current leadership in their category, reviewed within 30 days. All included entries require a source review within 30 days. Generation never advances source-review dates. When every entry expires, generation fails and preserves the previous snapshot.

Use `just update-models --as-of 2026-10-10` for an explicit historical snapshot; future dates are rejected. Without it, the current UTC day is used. The site is a dated snapshot, not a clock-driven roster. Deployment must follow successful review and regeneration. `just update-models --check` performs no writes and fails on drift. `just update-models --matrix --check` prints every row, including held and removed phrases, source URLs, release/review dates, access, exceptions, weights and probabilities.

`just update-models --discover` runs the existing source detector separately. Its output consists of unreviewed leads; it does not update the reviewed ledger or claim release verification. Review those leads before modifying `catalog.json`. Discovery and check mode cannot be combined.

Longmont.AI and 1023.Digital are permanent constants with exact 35% and 15% automatic probabilities. They cannot be removed or reweighted through the ledger. The remaining 50% uses the highest applicable weight: frontier 7, Pareto 5, decision/world 3, harness/tool 2, new (30 days) 1.5, base 1. Weights never stack. Category-frontier age exceptions do not automatically grant the frontier priority weight. Integer units and rejection sampling avoid modulo bias. Triple-click cycles only the model/tool alternatives.

After editing the ledger, run:

```sh
just update-models --matrix
npm run test:models
npm run test:space-background
npm run test:content
npm run lint
npm run build
```

Keep the full matrix available through the recipe; its percentages recalculate from the eligible rows without changing either fixed brand share. The ledger includes explicit dispositions for every requested identity and old phrase. No benchmark score is inferred from membership or category. Follow repository security and publication gates before committing and pushing.
