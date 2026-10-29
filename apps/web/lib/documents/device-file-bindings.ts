import { fingerprintText, type DeviceFileBinding } from './device-file-access';
import { readDeviceBindings, storeDeviceBinding } from './device-file-storage';

const bindings = new Map<string, DeviceFileBinding>();
const automatic = new Set<string>();
const revisions = new Map<string, number>();
const bump = (id: string) => revisions.set(id, (revisions.get(id) ?? 0) + 1);
export const getDeviceBinding = (id: string) => bindings.get(id);
export const hasDeviceFile = (id: string) => bindings.has(id);
export const isDeviceAutoSave = (id: string) => automatic.has(id);
export const setDeviceAutoSave = (id: string, enabled: boolean) => {
  if (enabled && bindings.has(id)) automatic.add(id);
  else automatic.delete(id);
};
export function bindDeviceFile(id: string, binding: DeviceFileBinding) {
  bump(id);
  bindings.set(id, binding);
  // Session access remains available if the browser refuses structured-clone storage.
  void storeDeviceBinding(id, binding).catch(() => undefined);
}
export function forgetDeviceFile(id: string) {
  bump(id);
  bindings.delete(id);
  automatic.delete(id);
  void storeDeviceBinding(id, null).catch(() => undefined);
}

/** Hydration cannot replace a newer import/save or resurrect a closed tab. */
export async function restoreDeviceBindings(
  ids: string[],
  savedContent?: ReadonlyMap<string, string | null>,
): Promise<void> {
  const versions = new Map(ids.map((id) => [id, revisions.get(id)]));
  try {
    const saved = await readDeviceBindings(ids);
    for (const [id, binding] of saved) {
      const content = savedContent?.get(id);
      if (
        savedContent &&
        (content == null ||
          binding.contentFingerprint !== (await fingerprintText(content)))
      )
        continue;
      if (!bindings.has(id) && revisions.get(id) === versions.get(id))
        bindings.set(id, binding);
    }
  } catch {
    /* Draft recovery remains independent of optional file-handle storage. */
  }
}
