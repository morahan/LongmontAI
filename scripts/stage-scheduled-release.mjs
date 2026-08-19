#!/usr/bin/env node
import process from 'node:process';
import { stageRelease, verifyGeneratedRelease } from './lib/scheduled-release.mjs';

function options(args) {
  if (args.length === 1 && args[0] === '--check') return { check: true };
  if (args.length === 2 && args[0] === '--manifest') return { manifest: args[1] };
  console.error('Usage: stage-scheduled-release.mjs --check | --manifest <relative.release.json>');
  process.exit(2);
}

try {
  const selected = options(process.argv.slice(2));
  const release = selected.check ? await verifyGeneratedRelease() : await stageRelease(selected.manifest);
  console.log(`Scheduled release ${selected.check ? 'verified' : 'staged'}: ${release.editionId} (${release.releaseRevision})`);
} catch (error) {
  console.error(error instanceof Error ? error.message : 'scheduled-release: unknown failure');
  process.exit(1);
}
