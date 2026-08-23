import { isAnalysisOptions, type AnalysisOptions } from '@flowculus/analysis-engine';
import {
  drawioJsonToProcessModel,
  drawioXmlToProcessModelAsync,
  isDrawioJsonExport,
} from './drawio-model';
import { processModelToDrawioXml } from './drawio-xml';
import { parseFlowculusFile, parseProcessCsv } from '@flowculus/file-formats';
import type { ProcessModel } from '@flowculus/process-model';

export const MAX_IMPORT_FILE_BYTES = 50 * 1024 * 1024;

export interface ImportedProcessFile {
  model: ProcessModel | null;
  xml: string;
  analysisOptions: AnalysisOptions;
  modelName: string;
}

const stripKnownExtension = (filename: string, fallback: string): string => {
  const stem = filename
    .replace(/\.(flowculus\.json|drawio|xml|json|csv)$/i, '')
    .replace(/\.(nodes|edges)$/i, '')
    .trim();
  return stem || fallback;
};

const assertFileSize = (files: File[]): void => {
  if (files.some((file) => file.size > MAX_IMPORT_FILE_BYTES)) {
    throw new Error('file-too-large');
  }
};

/**
 * Reads one Flowculus/draw.io/CSV selection at the browser boundary. Keeping
 * this adapter independent from React lets the file picker and whole-workspace
 * drag/drop path share exactly the same validation and round-trip behaviour.
 */
export const importProcessFiles = async (
  files: File[],
  fallbackName = 'Untitled process',
): Promise<ImportedProcessFile> => {
  const [file] = files;
  if (!file) throw new Error('file-empty');
  assertFileSize(files);

  const source = await file.text();
  const filename = file.name.toLowerCase();
  const modelName = stripKnownExtension(file.name, fallbackName);

  if (filename.endsWith('.flowculus.json')) {
    const parsed = parseFlowculusFile(source);
    if (parsed.analysisOptions != null && !isAnalysisOptions(parsed.analysisOptions)) {
      throw new Error('invalid-analysis-options');
    }
    return {
      model: parsed.model,
      xml: parsed.drawioXml ?? processModelToDrawioXml(parsed.model),
      analysisOptions: parsed.analysisOptions ?? {},
      modelName,
    };
  }

  if (filename.endsWith('.json')) {
    const parsed: unknown = JSON.parse(source);
    if (!isDrawioJsonExport(parsed)) throw new Error('unsupported-json');
    const model = drawioJsonToProcessModel(parsed, modelName);
    return {
      model,
      xml:
        typeof parsed.data === 'string' && parsed.data.trim().length > 0
          ? parsed.data
          : processModelToDrawioXml(model),
      analysisOptions: {},
      modelName,
    };
  }

  if (filename.endsWith('.csv')) {
    const csvSources = await Promise.all(
      files
        .filter((candidate) => candidate.name.toLowerCase().endsWith('.csv'))
        .map((candidate) => candidate.text()),
    );
    const model = parseProcessCsv(csvSources.join('\n'), modelName);
    return {
      model,
      xml: processModelToDrawioXml(model),
      analysisOptions: {},
      modelName,
    };
  }

  if (filename.endsWith('.drawio') || filename.endsWith('.xml')) {
    const model = await drawioXmlToProcessModelAsync(source, modelName);
    return {
      model: model && Object.keys(model.nodes).length > 0 ? model : null,
      xml: source,
      analysisOptions: {},
      modelName,
    };
  }

  throw new Error('unsupported-file');
};
