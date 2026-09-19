#!/usr/bin/env node
// Compatibility entry point. Required Model Watch sources failed remains a hard error.
// One producer owns the snapshot and review packets; there is no second scheduled job.
import { main } from './update-content.mjs';

main().catch(() => {
  console.error('Content intake failed; inspect local inputs and source health.');
  process.exitCode = 1;
});
