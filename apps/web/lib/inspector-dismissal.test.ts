import { afterEach, describe, expect, it, vi } from 'vitest';
const commit = vi.hoisted(() => vi.fn());
vi.mock('./documents/pending-input', () => ({ commitPendingInput: commit }));
import { dismissInspectorOnOutsidePointer } from './inspector-dismissal';

const setup = ({ inside = false, portal = false, valid = true } = {}) => {
  class Target {
    closest = () => (portal ? {} : null);
  }
  vi.stubGlobal('Element', Target);
  commit.mockReturnValue(valid);
  const close = vi.fn();
  const preventDefault = vi.fn();
  const event = { target: new Target(), preventDefault } as unknown as PointerEvent;
  const panel = { contains: () => inside } as unknown as HTMLElement;
  return { event, panel, close, preventDefault };
};
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
describe('inspector outside dismissal', () => {
  it('keeps invalid inputs visible to downstream save and export guards', () => {
    const state = setup({ valid: false });
    dismissInspectorOnOutsidePointer(state.event, state.panel, state.close);
    expect(commit).toHaveBeenCalledOnce();
    expect(state.preventDefault).toHaveBeenCalledOnce();
    expect(state.close).not.toHaveBeenCalled();
  });
  it('commits a valid field before hiding its panel', () => {
    const state = setup();
    state.close.mockImplementation(() => expect(commit).toHaveBeenCalledOnce());
    dismissInspectorOnOutsidePointer(state.event, state.panel, state.close);
    expect(state.close).toHaveBeenCalledOnce();
    expect(state.preventDefault).not.toHaveBeenCalled();
  });
  it.each([{ inside: true }, { portal: true }])(
    'keeps in-panel and owned popup interactions active: %j',
    (options) => {
      const state = setup(options);
      dismissInspectorOnOutsidePointer(state.event, state.panel, state.close);
      expect(commit).not.toHaveBeenCalled();
      expect(state.close).not.toHaveBeenCalled();
    },
  );
});
