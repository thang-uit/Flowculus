import { LOCAL_DRAFT_VERSION, type LocalDraftSnapshot } from '@/lib/local-draft-snapshot';
import { LEGACY_STARTER_MODEL } from '@/lib/legacy-starter-model';

/** Compare all persisted fields; property order must not change ownership. */
const sameValue = (left: unknown, right: unknown): boolean => {
  if (left === right) return true;
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object')
    return false;
  if (Array.isArray(left) !== Array.isArray(right)) return false;
  const a = left as Record<string, unknown>;
  const b = right as Record<string, unknown>;
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length &&
    keys.every(
      (key) => Object.prototype.hasOwnProperty.call(b, key) && sameValue(a[key], b[key]),
    )
  );
};

/** A starter marker alone is never proof that a draft is safe to discard. */
export const isUntouchedLegacyStarter = (draft: LocalDraftSnapshot): boolean =>
  draft.draftVersion !== LOCAL_DRAFT_VERSION &&
  draft.modelName === LEGACY_STARTER_MODEL.name &&
  !draft.drawioSource &&
  !draft.drawioXml &&
  Object.keys(draft.analysisOptions ?? {}).length === 0 &&
  sameValue(draft.model, LEGACY_STARTER_MODEL);
