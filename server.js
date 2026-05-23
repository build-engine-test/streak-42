// Custom Next.js production server.
//
// Why this file exists:
//
//   1. `next start -H 0.0.0.0` does not actually bind on 0.0.0.0 in Next.js 16 /
//      turbopack production mode -- Next reports `Network: 0.0.0.0:PORT` in the
//      log but the socket isn't reachable, so Render's port scanner can't see
//      the open port and the deploy times out. Using Next's programmatic API
//      with an explicit `server.listen(port, '0.0.0.0', ...)` bypasses the
//      broken default and binds reliably.
//
//   2. Render free-tier services skip preDeployCommand, so `drizzle-kit push`
//      never runs and the database has no tables -- the first HTTP request
//      crashes the app. We push the schema at startup instead (best-effort,
//      tolerates "no drizzle config" so non-DB apps still boot).
//
// Spawn order: drizzle push (best-effort) -> Next prepare() -> http.listen().
// The whole thing typically completes in ~3-5s.

const { createServer } = require('http');
const { existsSync } = require('fs');
const { spawnSync } = require('child_process');
const path = require('path');
const next = require('next');

const port = parseInt(process.env.PORT || '3000', 10);
const hostname = '0.0.0.0';
const dev = process.env.NODE_ENV !== 'production';

function runDrizzlePushIfConfigured() {
  const drizzleConfigCandidates = ['drizzle.config.ts', 'drizzle.config.js', 'drizzle.config.mjs'];
  const hasConfig = drizzleConfigCandidates.some((name) =>
    existsSync(path.join(process.cwd(), name)),
  );
  if (!hasConfig) {
    console.log('[server.js] no drizzle config; skipping schema push');
    return;
  }
  if (!process.env.DATABASE_URL) {
    console.warn('[server.js] DATABASE_URL not set; skipping schema push');
    return;
  }
  console.log('[server.js] running drizzle-kit push --force...');
  const result = spawnSync('pnpm', ['exec', 'drizzle-kit', 'push', '--force'], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) {
    // Don't crash the dyno -- a schema push failure may be recoverable
    // (already-applied migration, transient DB hiccup). Log and continue;
    // the app itself will surface real DB errors on first request.
    console.warn(`[server.js] drizzle-kit push exited ${result.status}; continuing anyway`);
  } else {
    console.log('[server.js] drizzle-kit push complete');
  }
}

runDrizzlePushIfConfigured();

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    createServer((req, res) => {
      handle(req, res);
    }).listen(port, hostname, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
  })
  .catch((err) => {
    console.error('[server.js] prepare failed:', err);
    process.exit(1);
  });
