import AxeBuilder from '@axe-core/playwright';
import type { Page } from 'playwright';

export interface AccessibilityViolation {
  id: string;
  impact: string | null;
  description: string;
  help: string;
  helpUrl: string;
  nodes: Array<{
    target: string[];
    failureSummary: string | null;
  }>;
}

export interface AccessibilityReport {
  page: string;
  url: string;
  violationCount: number;
  violations: AccessibilityViolation[];
}

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/**
 * Runs the configured WCAG axe rules against the current page.
 * @param page Active Playwright page to scan.
 * @param pageName Human-readable page name included in logs and report output.
 * @returns The scan results, including every violation and affected node.
 */
export async function scanPageAccessibility(page: Page, pageName: string): Promise<AccessibilityReport> {
  if (!pageName.trim()) {
    throw new Error('A page name is required when generating an accessibility report.');
  }

  const results = await new AxeBuilder({ page })
    .withTags(WCAG_TAGS)
    .analyze();

  const report: AccessibilityReport = {
    page: pageName,
    url: page.url(),
    violationCount: results.violations.length,
    violations: results.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact ?? null,
      description: violation.description,
      help: violation.help,
      helpUrl: violation.helpUrl,
      nodes: violation.nodes.map((node) => ({
        target: node.target.map(String),
        failureSummary: node.failureSummary ?? null
      }))
    }))
  };

  console.info(`[a11y] ${report.page}: ${report.violationCount} violation(s)`);
  // Keep the complete axe findings in JSON for analysis without treating them as test failures.
  console.info(`[a11y] Violation details (JSON):\n${JSON.stringify(report.violations, null, 2)}`);

  return report;
}
