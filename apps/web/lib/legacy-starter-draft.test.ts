import { describe, expect, it } from 'vitest';
import { isUntouchedLegacyStarter } from './legacy-starter-draft';
import { LEGACY_STARTER_MODEL } from './legacy-starter-model';
import type { LocalDraftSnapshot } from './local-draft-snapshot';

const snapshot = (): LocalDraftSnapshot => ({
  model: structuredClone(LEGACY_STARTER_MODEL),
  modelName: LEGACY_STARTER_MODEL.name,
  analysisOptions: {},
  updatedAt: 100,
});

describe('retired starter draft migration', () => {
  it('recognizes the exact old starter regardless of object key order', () => {
    const draft = snapshot();
    draft.model.nodes = Object.fromEntries(Object.entries(draft.model.nodes).reverse());
    expect(isUntouchedLegacyStarter(draft)).toBe(true);
  });

  it.each([
    [
      'node name',
      (draft: LocalDraftSnapshot) => {
        draft.model.nodes.approve!.label = 'My approval';
      },
    ],
    [
      'node geometry',
      (draft: LocalDraftSnapshot) => {
        draft.model.nodes.approve!.bounds!.x += 10;
      },
    ],
    [
      'task time',
      (draft: LocalDraftSnapshot) => {
        draft.model.nodes.approve!.durationMinutes = 50;
      },
    ],
    [
      'edge probability',
      (draft: LocalDraftSnapshot) => {
        draft.model.edges['edge-review-auto']!.probability = 0.3;
      },
    ],
    [
      'edge routing',
      (draft: LocalDraftSnapshot) => {
        draft.model.edges['edge-review-auto']!.routing = {
          style: 'straight',
          waypoints: [],
        };
      },
    ],
    [
      'model name',
      (draft: LocalDraftSnapshot) => {
        draft.modelName = 'My process';
      },
    ],
    [
      'metadata',
      (draft: LocalDraftSnapshot) => {
        draft.model.metadata = { ...draft.model.metadata, note: 'My process' };
      },
    ],
    [
      'analysis settings',
      (draft: LocalDraftSnapshot) => {
        draft.analysisOptions = { arrivalRatePerHour: 2 };
      },
    ],
    [
      'draw.io source',
      (draft: LocalDraftSnapshot) => {
        draft.drawioXml = '<mxfile />';
      },
    ],
  ] as const)('preserves a draft with changed %s', (_name, change) => {
    const draft = snapshot();
    change(draft);
    expect(isUntouchedLegacyStarter(draft)).toBe(false);
  });
});
