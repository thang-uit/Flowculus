'use client';

import { Tooltip } from '@/components/ui/Tooltip';
import { getWorkspaceCopy } from '@/lib/i18n';
import { useWorkspaceStore } from '@/lib/workspace-store';

/** Google Translate icon SVG (Material / Google Translate) */
function GoogleTranslateIcon({ className }: Readonly<{ className?: string }>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M12.87 15.07l-2.54-2.51.03-.08c1.74-1.94 2.98-4.17 3.71-6.49H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z" />
    </svg>
  );
}

export function LanguageToggle() {
  const locale = useWorkspaceStore((state) => state.locale);
  const setLocale = useWorkspaceStore((state) => state.setLocale);
  const copy = getWorkspaceCopy(locale);

  return (
    <Tooltip content={`${copy.switchLanguage}: ${copy.nextLanguageName}`}>
      <button
        type="button"
        aria-label={`${copy.switchLanguage}: ${copy.nextLanguageName}`}
        title={`${copy.switchLanguage}: ${copy.nextLanguageName}`}
        onClick={() => setLocale(locale === 'en' ? 'vi' : 'en')}
        className="focus-ring tb-btn h-8 gap-1.5 px-2.5 text-xs text-[var(--muted)] hover:bg-[var(--surface-soft)] hover:text-[var(--text)] active:scale-[0.96]"
      >
        <GoogleTranslateIcon className="shrink-0" />
        <span className="font-mono text-[10.5px] font-bold uppercase tracking-wide text-[var(--muted-strong)]">
          {locale === 'en' ? 'en' : 'vi'}
        </span>
      </button>
    </Tooltip>
  );
}
