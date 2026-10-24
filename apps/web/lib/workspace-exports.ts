import type { AnalysisOptions, AnalysisReport } from '@flowculus/analysis-engine';
import { exportDrawioXml } from '@flowculus/drawio-adapter';
import {
  createAnalysisSnapshot,
  processModelToEdgesCsv,
  processModelToNodesCsv,
  serializeFlowculusFile,
} from '@flowculus/file-formats';
import { assertConfirmedModel, type ConfirmedProcessModel } from '@flowculus/validation';

import { downloadDataUriFile, downloadTextFile } from '@/lib/browser-file-actions';
import { buildDiagramSvg, rasterizeSvg, svgToDataUri } from '@/lib/diagram-export';
import { safeFileStem } from '@/lib/file-name';
import { getModelCurrency } from '@/lib/format';
import type { Locale, WorkspaceCopy } from '@/lib/i18n';
import { printAnalysisReport } from '@/lib/print-report';
import { downloadAnalysisReportImage } from '@/lib/report-image';
import type { DrawioSource } from '@/lib/workspace-store';

export type WorkspaceExportFormat =
  | 'drawio'
  | 'svg'
  | 'png'
  | 'jpeg'
  | 'pdf'
  | 'report-png'
  | 'report-jpeg'
  | 'flowculus'
  | 'csv';

export interface WorkspaceExportContext {
  /**
   * Only a model that passed the semantic gate (`checkSemanticGate`) can be
   * exported; the function re-checks it, so the gate cannot be bypassed.
   */
  model: ConfirmedProcessModel;
  report: AnalysisReport;
  analysisOptions: AnalysisOptions;
  drawioSource: DrawioSource | null;
  copy: WorkspaceCopy;
  locale: Locale;
  /** A window opened synchronously by the click handler (pop-up blockers). */
  reportWindow?: Window | null;
}

/** Every export Flowculus offers, from the same committed model and report. */
export const exportWorkspace = async (
  format: WorkspaceExportFormat,
  context: WorkspaceExportContext,
): Promise<void> => {
  const { model, report, copy, locale } = context;
  assertConfirmedModel(model);
  const stem = safeFileStem(model.name, 'process');
  const title = model.name || copy.modelName;
  const currency = getModelCurrency(Object.values(model.nodes));

  switch (format) {
    case 'drawio': {
      const xml = await exportDrawioXml(model, context.drawioSource?.xml);
      downloadTextFile(`${stem}.drawio`, xml, 'application/xml');
      return;
    }
    case 'flowculus': {
      const drawioXml = await exportDrawioXml(model, context.drawioSource?.xml);
      downloadTextFile(
        `${stem}.flowculus.json`,
        serializeFlowculusFile({
          schemaVersion: 1,
          model,
          drawioXml,
          analysisOptions: context.analysisOptions,
          analysis: createAnalysisSnapshot(report),
        }),
        'application/json',
      );
      return;
    }
    case 'csv':
      downloadTextFile(`${stem}.nodes.csv`, processModelToNodesCsv(model), 'text/csv');
      downloadTextFile(`${stem}.edges.csv`, processModelToEdgesCsv(model), 'text/csv');
      return;
    case 'svg':
      downloadTextFile(
        `${stem}.svg`,
        buildDiagramSvg(model, report).svg,
        'image/svg+xml',
      );
      return;
    case 'png':
    case 'jpeg':
      downloadDataUriFile(
        `${stem}.${format === 'jpeg' ? 'jpg' : 'png'}`,
        await rasterizeSvg(buildDiagramSvg(model, report), format),
      );
      return;
    case 'pdf':
      printAnalysisReport({
        imageDataUri: svgToDataUri(buildDiagramSvg(model, report).svg),
        title,
        report,
        model,
        copy,
        locale,
        currency,
        targetWindow: context.reportWindow,
      });
      return;
    case 'report-png':
    case 'report-jpeg': {
      const imageFormat = format === 'report-jpeg' ? 'jpeg' : 'png';
      await downloadAnalysisReportImage({
        imageDataUri: await rasterizeSvg(buildDiagramSvg(model, report), 'png', 2),
        filename: `${stem}.report.${imageFormat === 'jpeg' ? 'jpg' : 'png'}`,
        format: imageFormat,
        title,
        report,
        model,
        copy,
        locale,
        currency,
      });
      return;
    }
  }
};
