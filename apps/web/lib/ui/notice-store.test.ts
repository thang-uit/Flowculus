import { beforeEach, describe, expect, it } from 'vitest';
import { showNotice, useNoticeStore } from './notice-store';
beforeEach(() => useNoticeStore.setState({ notices: [] }));
describe('shared transient notices', () => {
  it('bounds the queue and replaces duplicates with a fresh identity', () => {
    for (let index = 0; index < 5; index++) showNotice(`notice ${index}`);
    expect(useNoticeStore.getState().notices.map((item) => item.message)).toEqual([
      'notice 2',
      'notice 3',
      'notice 4',
    ]);
    const old = useNoticeStore.getState().notices[2].id;
    showNotice('notice 4', 'error');
    const notices = useNoticeStore.getState().notices;
    expect(notices).toHaveLength(3);
    expect(notices[2].id).not.toBe(old);
    expect(notices[2].tone).toBe('error');
  });
  it('dismisses only the requested notice', () => {
    showNotice('one');
    showNotice('two');
    useNoticeStore.getState().dismiss(useNoticeStore.getState().notices[0].id);
    expect(useNoticeStore.getState().notices.map((item) => item.message)).toEqual([
      'two',
    ]);
  });
});
