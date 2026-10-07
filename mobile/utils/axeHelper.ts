import AxeBuilder from '@axe-core/playwright';
import { appendFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Page } from 'playwright';

export async function scanPageAccessibility(page: Page, pageName: string) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const report = {
    page: pageName,
    url: page.url(),
    violationCount: results.violations.length,
    violations: results.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      description: violation.description,
      helpUrl: violation.helpUrl,
      nodes: violation.nodes.map((node) => ({
        target: node.target,
        failureSummary: node.failureSummary
      }))
    }))
  };

  const reportsDirectory = resolve(process.cwd(), 'reports');
  await mkdir(reportsDirectory, { recursive: true });
  await appendFile(
    resolve(reportsDirectory, 'accessibility-results.jsonl'),
    `${JSON.stringify({ generatedAt: new Date().toISOString(), ...report })}\n`,
    'utf8'
  );
  return report;
}
