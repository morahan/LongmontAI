#!/usr/bin/env bash
set -euo pipefail
umask 077

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

# Keep Vite and its lifecycle in one process. Select an OS-assigned port;
# strictPort and an instance-specific probe fail closed if it is taken meanwhile.
exec node --input-type=module <<'NODE'
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer as createPortProbe } from 'node:net';
import { createServer } from 'vite';

const token = randomUUID();
const readinessPath = `/__mobile_audit_ready_${token}`;
let server;
let audit;
let stopping = false;

async function cleanup() {
  if (audit?.pid) {
    try { process.kill(-audit.pid, 'SIGTERM'); } catch (error) {
      if (error.code !== 'ESRCH') throw error;
    }
  }
  await server?.close();
}

for (const [signal, status] of [['SIGINT', 130], ['SIGTERM', 143]]) {
  process.once(signal, async () => {
    stopping = true;
    try { await cleanup(); } finally { process.exit(status); }
  });
}

const startupDeadline = setTimeout(() => {
  console.error('Mobile audit server did not become ready within 30 seconds.');
  process.kill(process.pid, 'SIGTERM');
}, 30_000);

try {
  // Vite treats port 0 as its default port, so obtain an explicit candidate.
  const probe = createPortProbe();
  await new Promise((resolve, reject) => {
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', resolve);
  });
  const port = probe.address().port;
  await new Promise((resolve, reject) => probe.close(error => error ? reject(error) : resolve()));
  server = await createServer({
    server: { host: '127.0.0.1', port, strictPort: true, open: false },
    plugins: [{
      name: 'mobile-audit-readiness',
      configureServer(vite) {
        vite.middlewares.use((request, response, next) => {
          if (request.url !== readinessPath) return next();
          response.setHeader('Content-Type', 'text/plain');
          response.end(token);
        });
      },
    }],
  });
  await server.listen();
  const address = server.httpServer?.address();
  if (!address || typeof address === 'string') throw new Error('Vite has no TCP listener');
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const response = await fetch(`${baseUrl}${readinessPath}`, { signal: AbortSignal.timeout(5_000) });
  if (!response.ok || await response.text() !== token) {
    throw new Error('Mobile audit readiness did not match its own Vite instance');
  }
  clearTimeout(startupDeadline);
  console.log(`Mobile audit server ready: ${baseUrl}`);
  const status = await new Promise((resolve, reject) => {
    audit = spawn('npm', ['run', 'audit:mobile'], {
      stdio: 'inherit',
      detached: true,
      env: { ...process.env, MOBILE_AUDIT_BASE_URL: baseUrl },
    });
    audit.once('error', reject);
    audit.once('exit', (code) => resolve(code ?? 1));
  });
  process.exitCode = status;
} catch (error) {
  console.error('Mobile audit failed:', error);
  process.exitCode = 1;
} finally {
  clearTimeout(startupDeadline);
  if (!stopping) await cleanup();
}
NODE
