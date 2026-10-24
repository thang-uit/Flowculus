import { isAnalysisOptions, type AnalysisOptions } from '@flowculus/analysis-engine';
import { importDrawioXml } from '@flowculus/drawio-adapter';
import {
  parseCsvTable,
  parseFlowculusFile,
  parseProcessCsv,
  withAutoLayout,
} from '@flowculus/file-formats';
import type { ProcessModel } from '@flowculus/process-model';

import type { DrawioSource } from '@/lib/workspace-store';

export const MAX_IMPORT_FILE_BYTES = 50 * 1024 * 1024;

export type ImportedWorkspaceFile =
  | {
      kind: 'model';
      model: ProcessModel;
      drawioSource: DrawioSource | null;
      analysisOptions: AnalysisOptions;
      modelName: string;
    }
  | { kind: 'event-log'; fileName: string; source: string };

const stripKnownExtension = (filename: string, fallback: string): string => {
  const stem = filename
    .replace(/\.(flowculus\.json|drawio|xml|json|csv|xes)$/i, '')
    .replace(/\.(nodes|edges)$/i, '')
    .trim();
  return stem || fallback;
};

const assertFileSize = (files: File[]): void => {
  if (files.some((file) => file.size > MAX_IMPORT_FILE_BYTES)) {
    throw new Error('file-too-large');
  }
};

const normalizeHeader = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

/** A process-model CSV has a node table (`id` + `label`/`name`); anything else is a log. */
const isProcessModelCsv = (source: string): boolean => {
  const firstRow =
    parseCsvTable(
      source.split(/\r?\n/).find((line) => line.trim() && !line.startsWith('#')) ?? '',
    ).rows[0] ?? [];
  const headers = firstRow.map(normalizeHeader);
  return (
    headers.includes('id') &&
    ['label', 'nodename', 'name'].some((key) => headers.includes(key))
  );
};

const looksLikeXes = (source: string): boolean => /<log[\s>]/.test(source.slice(0, 4096));

/** Older Flowculus files carry geometry only in the embedded draw.io XML. */
const restoreBounds = async (
  model: ProcessModel,
  drawioXml?: string,
): Promise<ProcessModel> => {
  if (Object.values(model.nodes).every((node) => node.bounds)) return model;
  if (drawioXml) {
    try {
      const imported = await importDrawioXml(drawioXml);
      const nodes = Object.fromEntries(
        Object.entries(model.nodes).map(([id, node]) => [
          id,
          node.bounds ? node : { ...node, bounds: imported.model.nodes[id]?.bounds },
        ]),
      );
      return withAutoLayout({ ...model, nodes });
    } catch {
      // Fall through to a deterministic layout.
    }
  }
  return withAutoLayout(model);
};

const drawioSourceFor = async (xml: string | undefined): Promise<DrawioSource | null> => {
  if (!xml?.trim()) return null;
  try {
    const imported = await importDrawioXml(xml);
    return { xml, pages: imported.pages, pageIndex: imported.pageIndex };
  } catch {
    return null;
  }
};

/**
 * Reads one file selection at the browser boundary. Flowculus, draw.io and
 * process CSV files open on the canvas; CSV/JSON/XES event logs open in the
 * process-mining view.
 */
export const importWorkspaceFiles = async (
  files: File[],
  fallbackName = 'Untitled process',
): Promise<ImportedWorkspaceFile> => {
  const [file] = files;
  if (!file) throw new Error('file-empty');
  assertFileSize(files);

  const source = await file.text();
  const filename = file.name.toLowerCase();
  const modelName = stripKnownExtension(file.name, fallbackName);

  if (filename.endsWith('.xes'))
    return { kind: 'event-log', fileName: file.name, source };

  if (filename.endsWith('.json')) {
    const parsed: unknown = JSON.parse(source);
    const isFlowculus =
      parsed != null &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed) &&
      'model' in parsed &&
      'schemaVersion' in parsed;
    if (!isFlowculus) return { kind: 'event-log', fileName: file.name, source };
    const flowculus = parseFlowculusFile(source);
    if (
      flowculus.analysisOptions != null &&
      !isAnalysisOptions(flowculus.analysisOptions)
    ) {
      throw new Error('invalid-analysis-options');
    }
    return {
      kind: 'model',
      model: await restoreBounds(flowculus.model, flowculus.drawioXml),
      drawioSource: await drawioSourceFor(flowculus.drawioXml),
      analysisOptions: flowculus.analysisOptions ?? {},
      modelName: flowculus.model.name || modelName,
    };
  }

  if (filename.endsWith('.csv') || filename.endsWith('.tsv')) {
    const csvFiles = files.filter((candidate) => /\.(csv|tsv)$/i.test(candidate.name));
    if (!isProcessModelCsv(source))
      return { kind: 'event-log', fileName: file.name, source };
    const csvSources = await Promise.all(csvFiles.map((candidate) => candidate.text()));
    return {
      kind: 'model',
      model: withAutoLayout(parseProcessCsv(csvSources.join('\n'), modelName)),
      drawioSource: null,
      analysisOptions: {},
      modelName,
    };
  }

  if (filename.endsWith('.drawio') || filename.endsWith('.xml')) {
    if (looksLikeXes(source)) return { kind: 'event-log', fileName: file.name, source };
    const imported = await importDrawioXml(source, { fallbackName: modelName });
    const name = /^(page|trang)[-\s]?\d+$/i.test(imported.model.name.trim())
      ? modelName
      : imported.model.name;
    return {
      kind: 'model',
      model: withAutoLayout({ ...imported.model, name }),
      drawioSource: { xml: source, pages: imported.pages, pageIndex: imported.pageIndex },
      analysisOptions: {},
      modelName: name,
    };
  }

  throw new Error('unsupported-file');
};
