const { spawnSync } = require('node:child_process');
const { mkdtemp, mkdir, readFile, rm, writeFile } = require('node:fs/promises');
const os = require('node:os');
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
    { category: 'Mobile', scripts: [
      { name: 'Chromium 390x844 smoke', script: 'test:mobile' },
      { name: 'Firefox 390x844 smoke', script: 'test:mobile:firefox' }
    ] },
    { category: 'Accessibility', scripts: [{ name: 'Accessibility scenarios', script: 'test:accessibility' }] }
  ]
};

function runNpmScript(script, jsonPath) {
  console.info(`\n=== Running ${script} ===`);
  const npmCli = process.env.npm_execpath;
  const env = {
    ...process.env,
    CUCUMBER_JSON_PATH: jsonPath,
    TS_NODE_COMPILER_OPTIONS: process.env.TS_NODE_COMPILER_OPTIONS ?? JSON.stringify({
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
      lib: ['ES2022', 'DOM', 'DOM.Iterable']
    })
  };
  const result = npmCli
    ? spawnSync(process.execPath, [npmCli, 'run', script], { stdio: 'inherit', env })
    : spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', script], {
        stdio: 'inherit',
        env,
        shell: process.platform === 'win32'
      });

  if (result.error) {
    console.error(`Could not start ${script}: ${result.error.message}`);
    return 1;
  }
  return result.status ?? 1;
}

async function readScenarioResults(jsonPath) {
  const reportText = await readFile(jsonPath, 'utf8');
  const features = JSON.parse(reportText);
  if (!Array.isArray(features)) {
    throw new TypeError(`Cucumber JSON report at ${jsonPath} did not contain a feature array.`);
  }

  return features.flatMap((feature) =>
    (feature.elements ?? [])
      .filter((element) => element.type === 'scenario' || element.keyword === 'Scenario')
      .map((element) => {
        const steps = (element.steps ?? []).map((step) => ({
          keyword: step.keyword ?? '',
          name: step.name ?? '',
          status: step.result?.status ?? 'undefined',
          durationMs: Number(step.result?.duration ?? 0) / 1_000_000,
          error: step.result?.error_message ?? ''
        }));
        const failures = steps.filter(({ status }) =>
          ['failed', 'ambiguous', 'undefined', 'pending'].includes(status)
        );
        const status = failures.length > 0
          ? 'FAILED'
          : steps.length > 0 && steps.every(({ status: stepStatus }) => stepStatus === 'skipped')
            ? 'SKIPPED'
            : steps.some(({ status: stepStatus }) => stepStatus === 'passed')
              ? 'PASSED'
              : 'NO RESULT';

        return {
          feature: feature.name || feature.uri || 'Unnamed feature',
          uri: feature.uri ?? '',
          name: element.name || 'Unnamed scenario',
          line: element.line,
          status,
          durationMs: steps.reduce((total, step) => total + step.durationMs, 0),
          steps,
          failures
        };
      })
  );
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function countScenarios(scenarios) {
  return scenarios.reduce((counts, scenario) => {
    const key = scenario.status.toLowerCase().replace(' ', '');
    counts[key] = (counts[key] ?? 0) + 1;
    counts.total += 1;
    return counts;
  }, { total: 0, passed: 0, failed: 0, skipped: 0, noresult: 0 });
}

function renderScenario(run, scenario) {
  const statusClass = scenario.status.toLowerCase().replace(' ', '-');
  const steps = scenario.steps.map((step) => {
    const stepStatus = step.status.toLowerCase();
    const timing = step.durationMs > 0 ? `${(step.durationMs / 1000).toFixed(2)}s` : '';
    return `<li class="step">
      <span class="badge ${escapeHtml(stepStatus)}">${escapeHtml(step.status)}</span>
      <span class="step-name">${escapeHtml(`${step.keyword}${step.keyword && step.name ? ' ' : ''}${step.name}`)}</span>
      <span class="duration">${escapeHtml(timing)}</span>
      ${step.error ? `<pre class="error">${escapeHtml(step.error)}</pre>` : ''}
    </li>`;
  }).join('\n');
  const location = scenario.uri
    ? `${scenario.uri}${scenario.line ? `:${scenario.line}` : ''}`
    : scenario.feature;
  const failedStep = scenario.failures[0];

  return `<details class="case ${statusClass}" data-search="${escapeHtml(
    `${run.category} ${run.name} ${scenario.feature} ${scenario.name} ${location}`.toLowerCase()
  )}">
    <summary>
      <span class="badge ${statusClass}">${escapeHtml(scenario.status)}</span>
      <span class="case-title">${escapeHtml(scenario.name)}</span>
      <span class="case-meta">${escapeHtml(run.category)} · ${escapeHtml(run.name)} · ${(scenario.durationMs / 1000).toFixed(2)}s</span>
    </summary>
    <div class="case-content">
      <p class="feature-location"><strong>Feature:</strong> ${escapeHtml(scenario.feature)} · ${escapeHtml(location)}</p>
      ${failedStep ? `<p class="failure-summary"><strong>Failure:</strong> ${escapeHtml(failedStep.name)} — ${escapeHtml(failedStep.error || failedStep.status)}</p>` : ''}
      <ol class="steps">${steps || '<li>No step results were provided by Cucumber.</li>'}</ol>
    </div>
  </details>`;
}

async function writeSummary(mode, startedAt, groups) {
  const reportsDirectory = path.resolve(process.cwd(), 'reports');
  await mkdir(reportsDirectory, { recursive: true });
  const finishedAt = new Date();
  const results = groups.flatMap((group) => group.results);
  const failedCount = results.filter((result) => result.exitCode !== 0).length;
  const scenarios = results.flatMap((result) => result.scenarios);
  const scenarioCounts = countScenarios(scenarios);
  const suiteDurationMs = results.reduce((total, result) => total + result.durationMs, 0);
  const summary = {
    mode,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    status: failedCount === 0 ? 'PASSED' : 'FAILED',
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    suiteDurationMs,
    scenarioCounts,
    failedRuns: failedCount,
    groups
  };
  const htmlPath = path.join(reportsDirectory, 'final-consolidated-report.html');

  const rows = groups.map((group) => {
    const groupFailed = group.results.some((result) => result.exitCode !== 0);
    const groupStatus = groupFailed ? 'FAILED' : 'PASSED';
    const groupDuration = group.results.reduce((total, result) => total + result.durationMs, 0);
    const runDetails = group.results
      .map((result) => {
        const counts = countScenarios(result.scenarios);
        return `${escapeHtml(result.name)}: ${escapeHtml(result.status)} — ${counts.passed} passed, ${counts.failed} failed, ${counts.skipped} skipped`;
      })
      .join('<br>');
    const categoryCounts = countScenarios(group.results.flatMap((result) => result.scenarios));
    const countCells = group.results.length === 0
      ? '<td colspan="5">No test execution was recorded.</td>'
      : `<td>${categoryCounts.total}</td><td>${categoryCounts.passed}</td><td>${categoryCounts.failed}</td><td>${categoryCounts.skipped}</td><td>${categoryCounts.noresult}</td>`;
    return `<tr>
      <td>${escapeHtml(group.category)}</td>
      <td>${runDetails}</td>
      ${countCells}
      <td>${groupStatus}</td>
      <td>${(groupDuration / 1000).toFixed(1)}s</td>
    </tr>`;
  }).join('\n');
  const trendBars = groups.map((group) => {
    const counts = countScenarios(group.results.flatMap((result) => result.scenarios));
    const passedWidth = counts.total ? counts.passed / counts.total * 100 : 0;
    const failedWidth = counts.total ? counts.failed / counts.total * 100 : 0;
    const skippedWidth = counts.total ? counts.skipped / counts.total * 100 : 0;
    const noResultWidth = counts.total ? counts.noresult / counts.total * 100 : 0;
    return `<div class="trend-row">
      <span>${escapeHtml(group.category)}</span>
      <div class="bar" role="img" aria-label="${escapeHtml(`${group.category}: ${counts.passed} passed, ${counts.failed} failed, ${counts.skipped} skipped, ${counts.noresult} no result`)}">
        <i class="passed-bar" style="width:${passedWidth}%"></i><i class="failed-bar" style="width:${failedWidth}%"></i><i class="skipped-bar" style="width:${skippedWidth}%"></i><i class="noresult-bar" style="width:${noResultWidth}%"></i>
      </div>
      <span>${counts.passed} passed · ${counts.failed} failed · ${counts.skipped} skipped · ${counts.noresult} no result · ${counts.total} total</span>
    </div>`;
  }).join('\n');
  const caseDetails = groups.map((group) =>
    group.results.map((run) => {
      const runCounts = countScenarios(run.scenarios);
      const runStatus = run.exitCode === 0 ? 'PASSED' : 'FAILED';
      const missingData = run.reportError
        ? `<p class="failure-summary"><strong>Report data error:</strong> ${escapeHtml(run.reportError)}</p>`
        : run.scenarios.length === 0
          ? `<p class="failure-summary">No scenarios were found in this run's Cucumber JSON output.</p>`
          : '';
      const runScenarios = run.scenarios.map((scenario) =>
        renderScenario({ category: group.category, name: run.name }, scenario)
      ).join('\n');
      return `<section class="run-section">
        <h3>${escapeHtml(group.category)} — ${escapeHtml(run.name)} <span class="badge ${runStatus.toLowerCase()}">${runStatus}</span></h3>
        <p class="run-summary">${runCounts.total} scenarios · ${runCounts.passed} passed · ${runCounts.failed} failed · ${runCounts.skipped} skipped · ${runCounts.noresult} no result · ${(run.durationMs / 1000).toFixed(1)}s execution time</p>
        ${missingData}
        ${runScenarios}
      </section>`;
    }).join('\n')
  ).join('\n');
  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Final ${mode === 'all' ? 'consolidated' : 'cross-browser'} test report</title>
<style>
:root{color-scheme:light;--ink:#172033;--muted:#667085;--line:#e4e7ec;--surface:#fff;--canvas:#f5f7fb;--green:#16803c;--red:#bd2525;--amber:#9a6700;--blue:#175cd3}
*{box-sizing:border-box}body{font:14px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;margin:0;background:var(--canvas);color:var(--ink)}
main{max-width:1440px;margin:auto;padding:28px}.hero,.panel{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:22px;margin-bottom:20px}
h1{margin:0 0 6px;font-size:28px}.muted,.run-summary,.feature-location,.case-meta{color:var(--muted)}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-top:18px}.card{padding:14px;border:1px solid var(--line);border-radius:9px}.card strong{display:block;font-size:22px}
table{border-collapse:collapse;width:100%;margin-top:10px}th,td{border-bottom:1px solid var(--line);padding:11px 9px;text-align:left;vertical-align:top}th{background:#f9fafb}
.badge{display:inline-block;border-radius:999px;padding:2px 9px;font-size:11px;font-weight:750;letter-spacing:.03em;background:#eaecf0;color:#344054}.passed{background:#dcfae6;color:#067647}.failed{background:#fee4e2;color:#b42318}.skipped{background:#fef0c7;color:#93370d}.no-result,.undefined,.ambiguous,.pending{background:#fef0c7;color:#93370d}
.trend-row{display:grid;grid-template-columns:150px minmax(120px,1fr) minmax(220px,auto);gap:14px;align-items:center;padding:8px 0}.bar{height:12px;display:flex;overflow:hidden;background:#eaecf0;border-radius:8px}.bar i{height:100%}.passed-bar{background:#12b76a}.failed-bar{background:#f04438}.skipped-bar{background:#fdb022}.noresult-bar{background:#98a2b3}
.toolbar{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.toolbar input{flex:1;min-width:240px;padding:10px 12px;border:1px solid #cfd4dc;border-radius:8px;font:inherit}.toolbar label{color:var(--muted)}
.run-section{border-top:1px solid var(--line);padding-top:16px;margin-top:18px}.run-section h3{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.case{border:1px solid var(--line);border-radius:8px;background:white;margin:8px 0}.case summary{display:flex;align-items:center;gap:10px;flex-wrap:wrap;cursor:pointer;padding:11px 13px;list-style:none}.case summary::-webkit-details-marker{display:none}.case-title{font-weight:650;flex:1;min-width:240px}.case-meta{font-size:12px}.case-content{padding:2px 14px 14px;border-top:1px solid var(--line)}.steps{padding-left:25px}.step{padding:7px 0;border-bottom:1px solid #f0f1f3}.step-name{margin-left:8px}.duration{float:right;color:var(--muted);font-size:12px}.error,.failure-summary{white-space:pre-wrap;overflow-wrap:anywhere;background:#fff1f0;color:#912018;padding:10px;border-radius:6px;font:12px/1.45 ui-monospace,Consolas,monospace}.failure-summary{font-family:inherit}
@media(max-width:700px){main{padding:12px}.trend-row{grid-template-columns:1fr;gap:4px}.case-meta{width:100%}table{font-size:12px}}
</style></head>
<body><main>
<header class="hero"><h1>${mode === 'all' ? 'Final Consolidated Test Report' : 'Cross-Browser Test Report'}</h1>
<div class="muted">Overall status: <span class="badge ${summary.status.toLowerCase()}">${summary.status}</span> · Started ${escapeHtml(summary.startedAt)} · Finished ${escapeHtml(summary.finishedAt)}</div>
<div class="cards">
  <div class="card">Scenarios<strong>${scenarioCounts.total}</strong></div>
  <div class="card">Passed<strong>${scenarioCounts.passed}</strong></div>
  <div class="card">Failed<strong>${scenarioCounts.failed}</strong></div>
  <div class="card">Skipped<strong>${scenarioCounts.skipped}</strong></div>
  <div class="card">No result<strong>${scenarioCounts.noresult}</strong></div>
  <div class="card">Execution time<strong>${(summary.durationMs / 1000).toFixed(1)}s</strong><span class="muted">Suite total ${(suiteDurationMs / 1000).toFixed(1)}s</span></div>
</div></header>
<section class="panel"><h2>Suite summary</h2><table><thead><tr><th>Category</th><th>Runs and result counts</th><th>Scenarios</th><th>Passed</th><th>Failed</th><th>Skipped</th><th>No result</th><th>Status</th><th>Execution</th></tr></thead><tbody>${rows}</tbody></table></section>
<section class="panel"><h2>Pass/fail distribution by suite</h2><p class="muted">Bars show scenario outcomes for each suite in this execution.</p>${trendBars}</section>
<section class="panel"><div class="toolbar"><h2>Scenario and step details</h2><label for="case-filter">Filter</label><input id="case-filter" type="search" placeholder="Search suite, feature, scenario, or file"></div>
${caseDetails}</section>
</main>
<script>
const filter=document.querySelector('#case-filter');
filter.addEventListener('input',()=>{const query=filter.value.trim().toLowerCase();for(const item of document.querySelectorAll('.case'))item.hidden=!item.dataset.search.includes(query)});
</script>
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
  const tempDirectory = await mkdtemp(path.join(os.tmpdir(), 'parabank-cucumber-report-'));
  const groups = [];
  try {
    let runIndex = 0;
    for (const group of reportGroups) {
      const results = [];
      for (const run of group.scripts) {
        runIndex += 1;
        const start = Date.now();
        const jsonPath = path.join(tempDirectory, `run-${runIndex}.json`);
        let exitCode = runNpmScript(run.script, jsonPath);
        let scenarios = [];
        let reportError;
        try {
          scenarios = await readScenarioResults(jsonPath);
          if (scenarios.length === 0) {
            throw new Error('Cucumber JSON contained no scenarios for this run.');
          }
        } catch (error) {
          reportError = error instanceof Error ? error.message : String(error);
          console.error(`Could not read scenario results for ${run.script}: ${reportError}`);
          exitCode = 1;
        }
        if (scenarios.some((scenario) => scenario.status === 'FAILED' || scenario.status === 'NO RESULT')) {
          exitCode = 1;
        }
        results.push({
          name: run.name,
          script: run.script,
          status: exitCode === 0 ? 'PASSED' : 'FAILED',
          exitCode,
          durationMs: Date.now() - start,
          scenarios,
          reportError
        });
      }
      groups.push({ category: group.category, results });
    }

    await writeSummary(mode, startedAt, groups);
  } finally {
    await rm(tempDirectory, { recursive: true, force: true });
  }

  if (groups.some((group) => group.results.some(({ exitCode }) => exitCode !== 0))) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
