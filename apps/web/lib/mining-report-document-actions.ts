import type { MiningReportDocumentOptions } from './mining-report-document';
import { buildMiningReportHtml } from './mining-report-document';
import { downloadTextFile } from './browser-file-actions';
import { exportFileName } from './file-name';
import { embeddedReportFont } from './report-font';

export async function downloadMiningReportHtml(options: MiningReportDocumentOptions) {
  const html = buildMiningReportHtml(options).replace(
    '</style>',
    `${await embeddedReportFont()}</style>`,
  );
  downloadTextFile(
    exportFileName(options.result.logName, 'analysis', 'html'),
    html,
    'text/html',
  );
}

export async function printMiningReport(options: MiningReportDocumentOptions) {
  const reportWindow = window.open('', '_blank');
  if (!reportWindow) throw new Error('report-popup-blocked');
  reportWindow.opener = null;
  try {
    const html = buildMiningReportHtml(options).replace(
      '</style>',
      `${await embeddedReportFont()}</style>`,
    );
    if (reportWindow.closed) return;
    reportWindow.document.open();
    reportWindow.document.write(html);
    reportWindow.document.close();
    await reportWindow.document.fonts.ready;
    if (reportWindow.closed) return;
    reportWindow.focus();
    reportWindow.print();
  } catch (reason) {
    reportWindow.close();
    throw reason;
  }
}
