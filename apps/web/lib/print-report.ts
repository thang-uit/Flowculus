import type { AnalysisReport } from '@flowculus/analysis-engine';

import type { Locale, WorkspaceCopy } from '@/lib/i18n';
import { localizeAnalysisMessage } from '@/lib/localize-analysis';

interface PrintAnalysisReportOptions {
  imageDataUri: string;
  title: string;
  report: AnalysisReport;
  copy: WorkspaceCopy;
  locale: Locale;
  currency?: string;
  targetWindow?: Window | null;
}

const formatNumber = (value: number | null, suffix = '', emptyValue = 'N/A') =>
  value == null ? emptyValue : `${Number(value.toFixed(2))}${suffix}`;

const appendTextList = (
  document: Document,
  parent: HTMLElement,
  headingText: string,
  values: string[],
  emptyText: string,
  className = '',
) => {
  const section = document.createElement('section');
  const heading = document.createElement('h2');
  heading.textContent = headingText;
  const list = document.createElement('ul');

  if (values.length === 0) {
    const item = document.createElement('li');
    item.textContent = emptyText;
    list.append(item);
  } else {
    values.forEach((value) => {
      const item = document.createElement('li');
      item.textContent = value;
      if (className) item.className = className;
      list.append(item);
    });
  }

  section.append(heading, list);
  parent.append(section);
};

/**
 * Creates a print-ready analysis report. The browser's print dialog can save
 * this report as a PDF without a server-side renderer or a large dependency.
 */
export function printAnalysisReport({
  imageDataUri,
  title,
  report,
  copy,
  locale,
  currency,
  targetWindow,
}: PrintAnalysisReportOptions) {
  const printWindow = targetWindow ?? window.open('', '_blank');
  if (!printWindow) throw new Error('The browser blocked the print preview window.');
  printWindow.opener = null;

  const printDocument = printWindow.document;
  printDocument.title = title;

  const style = printDocument.createElement('style');
  style.textContent = `
    :root { color: #17202a; background: #fff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; padding: 32px; }
    main { max-width: 1080px; margin: 0 auto; }
    h1 { margin: 0; font-size: 24px; letter-spacing: -0.02em; }
    h2 { margin: 0 0 8px; font-size: 14px; }
    .meta { margin: 6px 0 24px; color: #65717d; font-size: 12px; }
    .diagram { display: block; width: 100%; max-height: 520px; object-fit: contain; border: 1px solid #d8dee5; border-radius: 12px; background: #fff; }
    .metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin: 18px 0; }
    .metric { border: 1px solid #d8dee5; border-radius: 10px; padding: 12px; }
    .metric-label { color: #65717d; font-size: 10px; text-transform: uppercase; letter-spacing: .08em; }
    .metric-value { margin-top: 5px; font-size: 18px; font-weight: 700; }
    section { margin-top: 18px; page-break-inside: avoid; }
    .formula { margin: 0; padding: 12px; border-radius: 8px; background: #f3f5f7; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; line-height: 1.7; white-space: pre-wrap; }
    ul { margin: 8px 0 0; padding-left: 20px; color: #46525e; font-size: 11px; line-height: 1.7; }
    .warning { color: #9b6500; }
    .footer { margin-top: 28px; color: #65717d; font-size: 10px; }
    @media (max-width: 720px) { body { padding: 18px; } .metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    @media print { body { padding: 0; } .diagram { max-height: 420px; } }
  `;
  printDocument.head.append(style);

  const main = printDocument.createElement('main');
  const heading = printDocument.createElement('h1');
  heading.textContent = title;
  main.append(heading);

  const meta = printDocument.createElement('p');
  meta.className = 'meta';
  meta.textContent = `${copy.subtitle} / ${copy.workspace}`;
  main.append(meta);

  const image = printDocument.createElement('img');
  image.className = 'diagram';
  image.src = imageDataUri;
  image.alt = title;
  main.append(image);

  const metrics = printDocument.createElement('div');
  metrics.className = 'metrics';
  const metricValues: Array<[string, string]> = [
    [
      copy.cycleTime,
      formatNumber(report.cycleTimeMinutes, ` ${copy.minutes}`, copy.emptyValue),
    ],
    [
      copy.theoreticalTime,
      formatNumber(
        report.theoreticalCycleTimeMinutes,
        ` ${copy.minutes}`,
        copy.emptyValue,
      ),
    ],
    [
      copy.cte,
      formatNumber(
        report.cycleTimeEfficiency == null ? null : report.cycleTimeEfficiency * 100,
        '%',
        copy.emptyValue,
      ),
    ],
    [
      copy.cost,
      report.costPerExecution == null
        ? copy.emptyValue
        : `${currency ? `${currency} ` : ''}${formatNumber(report.costPerExecution, '', copy.emptyValue)}`,
    ],
  ];

  metricValues.forEach(([label, value]) => {
    const card = printDocument.createElement('div');
    card.className = 'metric';
    const cardLabel = printDocument.createElement('div');
    cardLabel.className = 'metric-label';
    cardLabel.textContent = label;
    const cardValue = printDocument.createElement('div');
    cardValue.className = 'metric-value';
    cardValue.textContent = value;
    card.append(cardLabel, cardValue);
    metrics.append(card);
  });
  main.append(metrics);

  const formulaSection = printDocument.createElement('section');
  const formulaHeading = printDocument.createElement('h2');
  formulaHeading.textContent = copy.formula;
  const formula = printDocument.createElement('p');
  formula.className = 'formula';
  formula.textContent = [
    `${copy.cycleFormulaLabel} = ${report.formula}`,
    report.theoreticalFormula
      ? `${copy.theoreticalFormulaLabel} = ${report.theoreticalFormula}`
      : '',
    report.costFormula ? `${copy.costFormulaLabel} = ${report.costFormula}` : '',
  ]
    .filter(Boolean)
    .join('\n');
  formulaSection.append(formulaHeading, formula);
  main.append(formulaSection);

  if (report.criticalPath) {
    const criticalPathSection = printDocument.createElement('section');
    const criticalPathHeading = printDocument.createElement('h2');
    criticalPathHeading.textContent = copy.criticalPath;
    const criticalPath = printDocument.createElement('p');
    criticalPath.className = 'formula';
    criticalPath.textContent =
      report.criticalPath.status === 'ready'
        ? `${report.criticalPath.taskLabels.join(' → ') || copy.noActivities}\n${report.criticalPath.formula} ${copy.minutes}`
        : report.criticalPath.reason === 'missing-processing-time'
          ? copy.criticalPathNeedsProcessing
          : copy.criticalPathUnavailable;
    criticalPathSection.append(criticalPathHeading, criticalPath);
    main.append(criticalPathSection);
  }

  if (report.littleLaw || report.queue) {
    const scenarioSection = printDocument.createElement('section');
    const scenarioHeading = printDocument.createElement('h2');
    scenarioHeading.textContent = copy.scenario;
    const scenario = printDocument.createElement('p');
    scenario.className = 'formula';
    const lines: string[] = [];
    if (report.littleLaw) {
      lines.push(
        `${copy.scenarioFormula}: ${formatNumber(report.littleLaw.workInProcess, '', copy.emptyValue)} = ${formatNumber(report.littleLaw.arrivalRatePerHour, '', copy.emptyValue)}/h × ${formatNumber(report.littleLaw.cycleTimeHours, ' h', copy.emptyValue)}`,
      );
    }
    if (report.queue) {
      lines.push(
        `${copy.queueModel} ${report.queue.model}: ${report.queue.formula}`,
        `${copy.queueUtilization}: ${formatNumber(report.queue.utilization == null ? null : report.queue.utilization * 100, '%', copy.emptyValue)}`,
        `${copy.averageQueue}: ${formatNumber(report.queue.averageQueueLength, '', copy.emptyValue)}`,
        `${copy.averageWait}: ${formatNumber(report.queue.averageWaitingHours, ' h', copy.emptyValue)}`,
        `${copy.averageSystem}: ${formatNumber(report.queue.averageSystemHours, ' h', copy.emptyValue)}`,
      );
    }
    scenario.textContent = lines.join('\n');
    scenarioSection.append(scenarioHeading, scenario);
    main.append(scenarioSection);
  }

  appendTextList(
    printDocument,
    main,
    copy.assumptions,
    report.assumptions.map((item) => localizeAnalysisMessage(item, locale)),
    copy.noAssumptions,
  );
  appendTextList(
    printDocument,
    main,
    copy.warnings,
    report.warnings.map((item) => localizeAnalysisMessage(item, locale)),
    copy.noWarnings,
    'warning',
  );

  const footer = printDocument.createElement('p');
  footer.className = 'footer';
  footer.textContent = 'Flowculus';
  main.append(footer);
  printDocument.body.replaceChildren(main);

  const print = () => {
    printWindow.focus();
    printWindow.print();
  };
  if (image.complete) printWindow.setTimeout(print, 80);
  else {
    image.addEventListener('load', print, { once: true });
    image.addEventListener('error', print, { once: true });
  }
}
