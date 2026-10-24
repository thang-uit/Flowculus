import type { AnalysisReport } from '@flowculus/analysis-engine';
import type { ProcessModel } from '@flowculus/process-model';

import type { Locale, WorkspaceCopy } from '@/lib/i18n';
import { buildReportContent } from '@/lib/report-content';

interface PrintAnalysisReportOptions {
  imageDataUri: string;
  title: string;
  report: AnalysisReport;
  model: ProcessModel;
  copy: WorkspaceCopy;
  locale: Locale;
  currency?: string;
  targetWindow?: Window | null;
}

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
  model,
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
    .metric-quality { margin-top: 4px; color: #65717d; font-size: 10px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td { border-bottom: 1px solid #e3e8ee; padding: 5px 6px; text-align: left; vertical-align: top; }
    th { color: #65717d; font-size: 10px; text-transform: uppercase; letter-spacing: .06em; }
    .error { color: #b42318; }
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

  const content = buildReportContent({ report, model, copy, locale, currency });

  const metrics = printDocument.createElement('div');
  metrics.className = 'metrics';
  content.metrics.forEach(({ label, value, quality }) => {
    const card = printDocument.createElement('div');
    card.className = 'metric';
    const cardLabel = printDocument.createElement('div');
    cardLabel.className = 'metric-label';
    cardLabel.textContent = label;
    const cardValue = printDocument.createElement('div');
    cardValue.className = 'metric-value';
    cardValue.textContent = value;
    const cardQuality = printDocument.createElement('div');
    cardQuality.className = 'metric-quality';
    cardQuality.textContent = quality;
    card.append(cardLabel, cardValue, cardQuality);
    metrics.append(card);
  });
  main.append(metrics);

  const formulaSection = printDocument.createElement('section');
  const formulaHeading = printDocument.createElement('h2');
  formulaHeading.textContent = `${copy.formula} · ${content.quality}`;
  const formula = printDocument.createElement('p');
  formula.className = 'formula';
  formula.textContent = content.formulaLines.join('\n');
  formulaSection.append(formulaHeading, formula);
  main.append(formulaSection);

  if (content.activities.length > 0) {
    const tableCopy = copy.quality.activityTable;
    const section = printDocument.createElement('section');
    const tableHeading = printDocument.createElement('h2');
    tableHeading.textContent = tableCopy.title;
    const table = printDocument.createElement('table');
    const head = printDocument.createElement('tr');
    [
      tableCopy.activity,
      tableCopy.cycleTime,
      tableCopy.source,
      tableCopy.processing,
      tableCopy.waiting,
    ].forEach((text) => {
      const cell = printDocument.createElement('th');
      cell.textContent = text;
      head.append(cell);
    });
    table.append(head);
    content.activities.forEach((row) => {
      const tr = printDocument.createElement('tr');
      [row.label, row.cycleTime, row.source, row.processing, row.waiting].forEach(
        (text) => {
          const cell = printDocument.createElement('td');
          cell.textContent = text;
          tr.append(cell);
        },
      );
      table.append(tr);
    });
    section.append(tableHeading, table);
    main.append(section);
  }

  appendTextList(
    printDocument,
    main,
    copy.quality.issueGroups.error,
    content.errors,
    copy.quality.noIssues,
    'error',
  );
  appendTextList(
    printDocument,
    main,
    copy.quality.issueGroups.warning,
    content.warnings,
    copy.noWarnings,
    'warning',
  );
  appendTextList(
    printDocument,
    main,
    copy.quality.issueGroups.info,
    content.info,
    copy.noAssumptions,
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
