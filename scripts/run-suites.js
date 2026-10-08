const { spawnSync } = require('node:child_process');
const { mkdir, writeFile } = require('node:fs/promises');
const path = require('node:path');

const REPORT_GROUPS = {
  crossbrowser: [
    { category: 'Cross Browser', scripts: [
      { name: 'Chromium', script: 'test:web:crossbrowser:chromium' },
      { name: 'Firefox', script: 'test:web:crossbrowser:firefox' }
    ] }
  ],
  all: [
    { category: 'API', scripts: [{ name: 'API scenarios', script: 'test:api' }] },
    { category: 'Web', scripts: [{ name: 'Chromium Web scenarios', script: 'test:web' }] },
    { category: 'Cross Browser', scripts: [
      { name: 'Chromium', script: 'test:web:crossbrowser:chromium' },
      { name: 'Firefox', script: 'test:web:crossbrowser:firefox' }
    ] },
    { category: 'Mobile', scripts: [{ name: 'Chromium 390x844 smoke', script: 'test:mobile' }] },
    { category: 'Accessibility', scripts: [{ name: 'Accessibility scenarios', script: 'test:accessibility' }] }
  ]
};

function runNpmScript(script) {
  console.info(`\n=== Running ${script} ===`);
  const npmCli = process.env.npm_execpath;
  const result = npmCli
    ? spawnSync(process.execPath, [npmCli, 'run', script], { stdio: 'inherit', env: process.env })
    : spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', script], {
        stdio: 'inherit',
        env: process.env,
        shell: process.platform === 'win32'
      });

  if (result.error) {
    console.error(`Could not start ${script}: ${result.error.message}`);
    return 1;
  }
  return result.status ?? 1;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

async function writeSummary(mode, startedAt, groups) {
  const reportsDirectory = path.resolve(process.cwd(), 'reports');
  await mkdir(reportsDirectory, { recursive: true });
  const finishedAt = new Date();
  const results = groups.flatMap((group) => group.results);
  const failedCount = results.filter((result) => result.exitCode !== 0).length;
  const summary = {
    mode,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    status: failedCount === 0 ? 'PASSED' : 'FAILED',
    passedRuns: results.length - failedCount,
    failedRuns: failedCount,
    groups
  };
  const htmlPath = path.join(reportsDirectory, 'final-consolidated-report.html');

  const rows = groups.map((group) => {
    const groupFailed = group.results.some((result) => result.exitCode !== 0);
    const groupStatus = groupFailed ? 'FAILED' : 'PASSED';
    const groupDuration = group.results.reduce((total, result) => total + result.durationMs, 0);
    const runDetails = group.results
      .map((result) => `${escapeHtml(result.name)}: ${escapeHtml(result.status)}`)
      .join('<br>');
    return `<tr><td>${escapeHtml(group.category)}</td><td>${runDetails}</td><td>${groupStatus}</td><td>${(groupDuration / 1000).toFixed(1)}s</td></tr>`;
  }).join('\n');
  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Final test report</title>
<style>body{font:16px system-ui,sans-serif;margin:2rem;color:#222}table{border-collapse:collapse;width:100%}th,td{border:1px solid #bbb;padding:.65rem;text-align:left}th{background:#eee}.status{font-weight:700}</style></head>
<body><h1>${mode === 'all' ? 'Final Consolidated Test Report' : 'Cross-Browser Test Report'}</h1>
<p>Overall status: <strong class="status">${summary.status}</strong> · ${summary.passedRuns} runs passed · ${summary.failedRuns} runs failed</p>
<p>Started ${escapeHtml(summary.startedAt)}; finished ${escapeHtml(summary.finishedAt)}</p>
<table><thead><tr><th>Category</th><th>Run details</th><th>Status</th><th>Duration</th></tr></thead><tbody>${rows}</tbody></table>
<p>Detailed Cucumber results: <a href="cucumber-report.html">cucumber-report.html</a></p>
</body></html>\n`;
  await writeFile(htmlPath, html, 'utf8');
  console.info(`\nConsolidated report: ${htmlPath}`);
}

async function main() {
  const mode = process.argv[2];
  const reportGroups = REPORT_GROUPS[mode];
  if (!reportGroups) {
    throw new Error(`Usage: node scripts/run-suites.js <${Object.keys(REPORT_GROUPS).join('|')}>`);
  }

  const startedAt = new Date();
  const groups = [];
  for (const group of reportGroups) {
    const results = [];
    for (const run of group.scripts) {
      const start = Date.now();
      const exitCode = runNpmScript(run.script);
      results.push({
        name: run.name,
        script: run.script,
        status: exitCode === 0 ? 'PASSED' : 'FAILED',
        exitCode,
        durationMs: Date.now() - start
      });
    }
    groups.push({ category: group.category, results });
  }

  await writeSummary(mode, startedAt, groups);
  if (groups.some((group) => group.results.some(({ exitCode }) => exitCode !== 0))) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
