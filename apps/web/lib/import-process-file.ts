import { isAnalysisOptions, type AnalysisOptions } from '@flowculus/analysis-engine';
import { importBpmnXml } from '@flowculus/bpmn-adapter';
import { importDrawioXml } from '@flowculus/drawio-adapter';
import {
  parseCsvTable,
  parseFlowculusFile,
  parseProcessCsv,
  withAutoLayout,
} from '@flowculus/file-formats';
import type { ProcessModel } from '@flowculus/process-model';
import { validateModelStructure } from '@flowculus/validation';

import type { DrawioSource } from '@/lib/workspace-store';
import { readEventLogFile } from '@/lib/read-event-log-file';
import { isTraceImage, validateTraceFile } from '@/lib/image-trace/file-validation';

export const MAX_IMPORT_FILE_BYTES = 50 * 1024 * 1024;

export type ImportedWorkspaceFile =
  | {
      kind: 'model';
      nativeFile?: File;
      model: ProcessModel;
      drawioSource: DrawioSource | null;
      analysisOptions: AnalysisOptions;
      modelName: string;
    }
  | { kind: 'event-log'; fileName: string; source: string }
  | { kind: 'image'; file: File };

const stripKnownExtension = (filename: string, fallback: string): string => {
  const stem = filename
    .replace(/\.(flowculus\.json|bpmn|drawio|xml|json|csv|tsv|xes)$/i, '')
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

const isProcessEdgeCsv = (source: string): boolean => {
  const firstRow =
    parseCsvTable(
      source.split(/\r?\n/).find((line) => line.trim() && !line.startsWith('#')) ?? '',
    ).rows[0] ?? [];
  const headers = firstRow.map(normalizeHeader);
  return (
    headers.includes('source') &&
    ['target', 'tail', 'destination', 'to'].some((key) => headers.includes(key))
  );
};

const looksLikeXes = (source: string): boolean => /<log[\s>]/.test(source.slice(0, 4096));

/** Older Flowculus files carry geometry only in the embedded draw.io XML. */
const restoreBounds = async (
  model: ProcessModel,
  drawioXml?: string,
  pageIndex = 0,
): Promise<ProcessModel> => {
  if (Object.values(model.nodes).every((node) => node.bounds)) return model;
  if (drawioXml) {
    try {
      const imported = await importDrawioXml(drawioXml, { pageIndex });
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

const drawioSourceFor = async (
  xml: string | undefined,
  pageIndex = 0,
): Promise<DrawioSource | null> => {
  if (!xml?.trim()) return null;
  try {
    const imported = await importDrawioXml(xml, { pageIndex });
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
  signal?: AbortSignal,
): Promise<ImportedWorkspaceFile> => {
  signal?.throwIfAborted();
  const [file] = files;
  if (!file) throw new Error('file-empty');
  assertFileSize(files);
  if (isTraceImage(file) || /\.(png|jpe?g|webp)$/i.test(file.name)) {
    const error = validateTraceFile(file);
    if (error) throw new Error(error);
    return { kind: 'image', file };
  }

  const filename = file.name.toLowerCase();
  if (filename.endsWith('.xlsx')) {
    return {
      kind: 'event-log',
      fileName: file.name,
      source: await readEventLogFile(file, signal),
    };
  }
  const source = await file.text();
  signal?.throwIfAborted();
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
    const validated = validateModelStructure(flowculus.model);
    if (
      !validated.model ||
      validated.diagnostics.some((item) => item.severity === 'error')
    ) {
      throw new Error('invalid-model');
    }
    if (
      flowculus.analysisOptions != null &&
      !isAnalysisOptions(flowculus.analysisOptions)
    ) {
      throw new Error('invalid-analysis-options');
    }
    return {
      kind: 'model',
      nativeFile: file,
      model: await restoreBounds(
        validated.model,
        flowculus.drawioXml,
        flowculus.drawioPageIndex,
      ),
      drawioSource: await drawioSourceFor(flowculus.drawioXml, flowculus.drawioPageIndex),
      analysisOptions: flowculus.analysisOptions ?? {},
      modelName: flowculus.model.name || modelName,
    };
  }

  if (filename.endsWith('.csv') || filename.endsWith('.tsv')) {
    const csvFiles = files.filter((candidate) => /\.(csv|tsv)$/i.test(candidate.name));
    const csvSources = await Promise.all(
      csvFiles.map(async (candidate) => ({
        fileName: candidate.name,
        source: candidate === file ? source : await candidate.text(),
      })),
    );
    signal?.throwIfAborted();
    const nodesFile = csvSources.find((candidate) => isProcessModelCsv(candidate.source));
    if (!nodesFile) {
      if (csvSources.some((candidate) => isProcessEdgeCsv(candidate.source)))
        throw new Error('missing-node-table');
      return { kind: 'event-log', fileName: file.name, source };
    }
    const edgeFiles = csvSources.filter((candidate) =>
      isProcessEdgeCsv(candidate.source),
    );
    const parsed = parseProcessCsv(
      [nodesFile.source, ...edgeFiles.map((candidate) => candidate.source)].join('\n'),
      stripKnownExtension(nodesFile.fileName, fallbackName),
    );
    const validated = validateModelStructure(parsed);
    if (
      !validated.model ||
      validated.diagnostics.some((item) => item.severity === 'error')
    )
      throw new Error('invalid-model-csv');
    return {
      kind: 'model',
      model: withAutoLayout(validated.model),
      drawioSource: null,
      analysisOptions: {},
      modelName: parsed.name,
    };
  }

  if (
    filename.endsWith('.bpmn') ||
    (filename.endsWith('.xml') && /<([\w.-]+:)?definitions[\s>]/.test(source))
  ) {
    const model = importBpmnXml(source, modelName);
    const validated = validateModelStructure(model);
    if (!validated.model || validated.diagnostics.length)
      throw new Error('invalid-model');
    return {
      kind: 'model',
      model: withAutoLayout(validated.model),
      drawioSource: null,
      analysisOptions: {},
      modelName: model.name,
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
