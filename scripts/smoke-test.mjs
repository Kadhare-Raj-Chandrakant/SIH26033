#!/usr/bin/env node

/**
 * ==============================================================================
 * SIH26033 — Post-Deployment Verification Smoke Test
 * ==============================================================================
 *
 * Lightweight, non-destructive probe verifying operational availability
 * across Backend API, AI Service, and Frontend Web application.
 *
 * Usage:
 *   node scripts/smoke-test.mjs
 *   node scripts/smoke-test.mjs --dry-run
 *   BACKEND_URL=https://... FRONTEND_URL=https://... AI_SERVICE_URL=https://... node scripts/smoke-test.mjs
 */

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');

const BACKEND_URL = (process.env.BACKEND_URL || 'http://localhost:4000').replace(/\/$/, '');
const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
const AI_SERVICE_URL = (process.env.AI_SERVICE_URL || 'http://localhost:8080').replace(/\/$/, '');

console.log('============================================================');
console.log('SIH26033 — POST-DEPLOYMENT OPERATIONAL SMOKE TEST');
console.log('============================================================');
console.log(`Backend API  : ${BACKEND_URL}`);
console.log(`AI Service   : ${AI_SERVICE_URL}`);
console.log(`Frontend Web : ${FRONTEND_URL}`);
console.log(`Execution Mode: ${isDryRun ? 'DRY-RUN (Configuration Verification)' : 'LIVE HTTP PROBE'}`);
console.log('------------------------------------------------------------\n');

if (isDryRun) {
  console.log('✓ Dry-run configuration validation succeeded: URLs and environment variables parsed cleanly.');
  console.log('✓ Smoke test readiness verified.');
  process.exit(0);
}

const TIMEOUT_MS = 10000;

async function probeEndpoint(name, url, expectedStatuses = [200], headerCheck = null) {
  const start = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json, text/html, */*',
        'User-Agent': 'SIH26033-SmokeTest/1.0',
        'x-request-id': `smoke-probe-${Date.now()}`,
      },
    });
    const duration = Math.round(performance.now() - start);

    const isExpectedStatus = expectedStatuses.includes(res.status);
    let headerPassed = true;
    let headerDetail = '';

    if (headerCheck) {
      const val = res.headers.get(headerCheck);
      if (!val) {
        headerPassed = false;
        headerDetail = ` (Missing header: ${headerCheck})`;
      } else {
        headerDetail = ` (${headerCheck}: ${val.slice(0, 8)}...)`;
      }
    }

    let bodyPreview = '';
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        const json = await res.json();
        bodyPreview = JSON.stringify(json).slice(0, 60);
      } catch {
        bodyPreview = 'json parse error';
      }
    } else {
      const text = await res.text();
      bodyPreview = `${text.slice(0, 40).replace(/\r?\n/g, ' ')}...`;
    }

    const passed = isExpectedStatus && headerPassed;

    return {
      name,
      url,
      status: res.status,
      passed,
      duration,
      detail: `${bodyPreview}${headerDetail}`,
    };
  } catch (err) {
    const duration = Math.round(performance.now() - start);
    return {
      name,
      url,
      status: 'ERR',
      passed: false,
      duration,
      detail: err.name === 'AbortError' ? `Timeout after ${TIMEOUT_MS}ms` : err.message,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function runSmokeTests() {
  const probes = [
    {
      name: 'Backend Process Liveness',
      url: `${BACKEND_URL}/api/v1/health/liveness`,
      expectedStatuses: [200],
      header: 'x-request-id',
    },
    {
      name: 'Backend Database Readiness',
      url: `${BACKEND_URL}/api/v1/health/readiness`,
      expectedStatuses: [200],
      header: 'x-request-id',
    },
    {
      name: 'Backend Overall Health',
      url: `${BACKEND_URL}/api/v1/health`,
      expectedStatuses: [200],
      header: 'x-request-id',
    },
    {
      name: 'AI Service Liveness',
      url: `${AI_SERVICE_URL}/health`,
      expectedStatuses: [200],
      header: null,
    },
    {
      name: 'AI Service Model Readiness',
      url: `${AI_SERVICE_URL}/ready`,
      expectedStatuses: [200, 503], // 503 is returned if models still warming up
      header: null,
    },
    {
      name: 'Frontend Root Status',
      url: `${FRONTEND_URL}/`,
      expectedStatuses: [200],
      header: null,
    },
  ];

  console.log('Executing operational health probes...\n');
  const results = [];

  for (const probe of probes) {
    process.stdout.write(`• Checking ${probe.name.padEnd(32)}: `);
    const result = await probeEndpoint(probe.name, probe.url, probe.expectedStatuses, probe.header);
    results.push(result);

    if (result.passed) {
      console.log(`✓ [${result.status}] in ${result.duration}ms`);
    } else {
      console.log(`✗ [${result.status}] in ${result.duration}ms -> ${result.detail}`);
    }
  }

  console.log('\n============================================================');
  console.log('SMOKE TEST SUMMARY');
  console.log('============================================================');

  let allPassed = true;
  for (const r of results) {
    const symbol = r.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`${symbol} | ${r.name.padEnd(30)} | ${String(r.status).padEnd(5)} | ${String(r.duration).padStart(4)}ms | ${r.detail}`);
    if (!r.passed) {
      allPassed = false;
    }
  }

  console.log('============================================================');

  if (allPassed) {
    console.log('🎉 ALL OPERATIONAL PROBES PASSED. Platform is healthy and ready for traffic.');
    process.exit(0);
  } else {
    console.error('⚠️ ONE OR MORE OPERATIONAL PROBES FAILED. Review logs and target endpoints.');
    process.exit(1);
  }
}

runSmokeTests();
