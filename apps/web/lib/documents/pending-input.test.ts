import { afterEach, describe, expect, it, vi } from 'vitest';
import { commitPendingInput } from './pending-input';
import { useNoticeStore } from '../ui/notice-store';
const setup = (invalid: boolean) => {
  class Input {
    focus = vi.fn();
    blur = vi.fn();
    closest = () => null;
    getClientRects = () => [{}];
  }
  const field = new Input();
  vi.stubGlobal('HTMLInputElement', Input);
  vi.stubGlobal('HTMLTextAreaElement', class {});
  vi.stubGlobal('document', {
    activeElement: field,
    querySelectorAll: () => (invalid ? [field] : []),
  });
  return field;
};
afterEach(() => {
  vi.unstubAllGlobals();
  useNoticeStore.setState({ notices: [] });
});
describe('manual save input boundary', () => {
  it('commits the active field before capturing a file save', () => {
    const field = setup(false);
    expect(commitPendingInput()).toBe(true);
    expect(field.blur).toHaveBeenCalledOnce();
  });
  it('keeps invalid text focused and reports that it must be corrected', () => {
    const field = setup(true);
    expect(commitPendingInput()).toBe(false);
    expect(field.focus).toHaveBeenCalledOnce();
    expect(useNoticeStore.getState().notices[0]?.tone).toBe('error');
  });
});
