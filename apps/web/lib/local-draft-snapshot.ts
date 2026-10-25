import type { AnalysisOptions } from '@flowculus/analysis-engine';
import type { ProcessModel } from '@flowculus/process-model';
import type { DrawioSource } from '@/lib/workspace-store';

export const LOCAL_DRAFT_VERSION = 2;

export interface LocalDraftSnapshot {
  /** Absent only on drafts saved before the empty-workspace migration. */
  draftVersion?: typeof LOCAL_DRAFT_VERSION;
  model: ProcessModel;
  /** Original draw.io source retained for semantic-preserving export. */
  drawioSource?: DrawioSource | null;
  /** Legacy iframe drafts may keep geometry only inside the editor XML. */
  drawioXml?: string;
  modelName: string;
  analysisOptions?: AnalysisOptions;
  updatedAt: number;
}
