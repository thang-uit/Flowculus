import type { ProcessModel } from '@flowculus/process-model';

/** A fresh workspace has no user-authored shapes or analysis inputs. */
export const INITIAL_PROCESS_MODEL: ProcessModel = {
  schemaVersion: 1,
  id: 'untitled-process',
  name: 'Untitled process',
  nodes: {},
  edges: {},
};
