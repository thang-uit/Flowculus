import type { Footprint } from '@flowculus/process-mining';
import { getMiningEvidenceCopy } from '@/lib/i18n/mining-evidence-copy';
import { usePreferencesStore } from '@/lib/use-preferences-store';
export function FootprintTable({ footprint }: { footprint: Footprint | null }) {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getMiningEvidenceCopy(locale);
  if (!footprint) return null;
  return (
    <details className="space-y-2">
      <summary className="cursor-pointer font-semibold">{copy.footprint}</summary>
      <p className="text-[var(--muted)]">{copy.footprintHint}</p>
      <div className="max-h-80 overflow-auto">
        <table className="text-center text-xs">
          <thead>
            <tr>
              <th scope="col" />
              <>
                {footprint.activities.map((name, index) => (
                  <th scope="col" title={name} key={name} className="p-2">
                    {index + 1}
                  </th>
                ))}
              </>
            </tr>
          </thead>
          <tbody>
            {footprint.activities.map((name, index) => (
              <tr key={name}>
                <th scope="row" className="max-w-36 truncate p-2 text-left" title={name}>
                  {index + 1}. {name}
                </th>
                {footprint.relations[index].map((value, column) => (
                  <td key={column} className="border border-[var(--border)] p-2">
                    {value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
