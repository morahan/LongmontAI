# Weekly Model Watch update

This is the runbook for the agent that refreshes [Model Watch](https://longmontai.com/model-watch) once a week. A scheduled task on MSFM6 starts it every Tuesday at 6:00 am Mountain. A person can run it the same way at any time. Read [Model Catalog Updates](model-updates.md) first; its rules win if this page disagrees.

## Why it runs weekly

Model Watch, Star Text and the Timeline all read one reviewed ledger, `content/models/catalog.json`. Three things go stale without a weekly pass:

- **New releases are missing.** Nothing enters the ledger without a reviewed entry.
- **Reviews lapse.** An entry whose `reviewedAt` is more than 30 days old is held, even if the model is still current.
- **The snapshot is dated.** `src/data/modelCatalog.generated.ts` records the day it was generated. Ages, the "new" flag and the 45- and 60-day windows are computed from that day. `just update-models --check` fails the day after generation.

The 1023 Digital weekly email also reads the ledger to find new models, so an entry added here on Tuesday can appear in Wednesday's email.

## The goal

After the run, the ledger lists every model and tool release from the last 14 days that Model Watch should carry, each checked against its primary source, and the generated snapshot is dated today and pushed to `main`.

## Steps

1. **Work in your own worktree.** Other agents often have uncommitted work in `/Users/msfm6/Coding/LongmontAI`, so do not edit that checkout. From it, run:

   ```sh
   git fetch origin
   git worktree add -b model-watch/weekly ../LongmontAI-model-watch origin/main
   cd ../LongmontAI-model-watch && ln -s ../LongmontAI/node_modules node_modules
   ```

   If `package-lock.json` differs from the main checkout's, run `npm ci --ignore-scripts` in the worktree instead of linking. Never stash, reset or commit another agent's work.
2. **Refresh the leads.** Run `just update-models --discover`. It needs the network and writes unreviewed detections. If it fails, note the failure and continue with the existing leads.
3. **Print the worklist.** Run `just update-models-weekly`. It prints:
   - `rereview`: in rotation today, but the review lapses within 7 days.
   - `lapsed`: already held only because the review is older than 30 days.
   - `leaving`: ages out of its window within 7 days. Expected; nothing to do.
   - `leads`: detected names with no ledger entry. Most are old models. Ignore any released more than 60 days ago.
4. **Find this fortnight's releases.** The leads only cover names the detector's patterns already know, so also check each tracked lab's own newsroom or release notes for the last 14 days. The tracked labs are the companies in `scripts/model-watch-sources.mjs` and the providers already in the ledger. Search the web for releases from labs not yet tracked, and treat a search result as a pointer to the primary source, never as the source.
5. **Review each candidate against its primary source.** Open the announcement, release notes or model card on the vendor's own domain and confirm:
   - the exact product name and version,
   - the original release date,
   - who can use it today (plan, API, approved customers, weights promised or published),
   - the category (`base`, `decision`, `world`, `science`, `audio`, `image`, `video`, `tools`).

   Add the entry only when all four are confirmed. Copy the field shape from a neighboring entry. Set `reviewedAt` to today, `sourceUrl` to the primary page, and `supersedes` to the older version's `id` when the new one replaces it. If something cannot be confirmed, leave the model out and name it in your report. Do not guess a date.
6. **Re-review `rereview` and `lapsed` entries.** Reopen each `sourceUrl`. If the page still supports the entry and no newer version replaced it, set `reviewedAt` to today. If a newer version exists, add it with `supersedes`. If the page is gone or no longer supports the entry, leave `reviewedAt` alone and report it.
7. **Regenerate.** Run `just update-models --matrix`. Read the matrix: the new entries are included, superseded ones are held, and nothing you did not touch changed disposition.
8. **Verify.** Run all of these and fix what fails:

   ```sh
   npm run test:models
   npm run test:space-background
   npm run test:content
   npm run lint
   npm run build
   ```

   A test that pins a specific roster name or count may need its expectation updated to the new reviewed fact. Never loosen a test that checks behavior, and never skip one.
9. **Commit and push.** Commit in the worktree, then run `git fetch origin && git rebase origin/main` and `git push origin HEAD:main`. The hooks run on the push; never pass `--no-verify`. Write the commit body as the roster change: Added, Superseded, Aged out, Re-reviewed. If nothing changed in the ledger, still commit the regenerated snapshot as `chore: refresh the Model Watch snapshot`. After the push succeeds, remove the worktree and delete the branch, as the Publication section of `AGENTS.md` requires.
10. **Report.** End with what was added, superseded, aged out and re-reviewed, each new entry's source URL, anything you could not confirm, and whether the push succeeded.

## Limits

- **Sources.** `scripts/update-models.mjs` only accepts `sourceUrl` hosts on its allowlist. Add a host only when it is the vendor's own official domain for a model you are adding, and say so in the commit.
- **Benchmarks.** Do not add or change a benchmark score, a leaderboard rank or a Pareto label. Those need their own evidence and are out of scope here.
- **Other surfaces.** Do not edit articles, scheduled releases, newsletter code, or `src/data/timeline.ts` entries that are hand-written.
- **No invention.** Every name, date and availability line in the ledger comes from a page you opened in this run.
- **Deployment.** Pushing `main` is the whole job. Do not deploy by hand or change any remote setting.
- **When in doubt, hold.** A missing model costs a week. A wrong one is published.
