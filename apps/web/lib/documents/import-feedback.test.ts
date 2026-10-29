import { afterEach, describe, expect, it } from 'vitest';
import { reportWorkspaceImport } from './import-feedback';
import { usePreferencesStore } from '../use-preferences-store';
import { getWorkspaceCopy } from '../i18n';
import { useNoticeStore } from '../ui/notice-store';
afterEach(() => {
  useNoticeStore.setState({ notices: [] });
  usePreferencesStore.setState({ locale: 'en' });
});
describe('asynchronous import feedback', () => {
  it('uses the language selected when a slow import completes', async () => {
    let finish!: (result: boolean) => void;
    const waiting = reportWorkspaceImport(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    usePreferencesStore.setState({ locale: 'vi' });
    finish(true);
    await waiting;
    expect(useNoticeStore.getState().notices[0]?.message).toBe(
      getWorkspaceCopy('vi').fileReady,
    );
  });
  it('translates late errors using the current locale and does not report cancellation', async () => {
    usePreferencesStore.setState({ locale: 'vi' });
    await reportWorkspaceImport(Promise.reject(new Error('document-limit')));
    expect(useNoticeStore.getState().notices[0]?.message).toBe(
      getWorkspaceCopy('vi').documentLimit,
    );
    useNoticeStore.setState({ notices: [] });
    await reportWorkspaceImport(
      Promise.reject(new DOMException('Cancelled', 'AbortError')),
    );
    await reportWorkspaceImport(Promise.resolve(false));
    expect(useNoticeStore.getState().notices).toHaveLength(0);
  });
});
