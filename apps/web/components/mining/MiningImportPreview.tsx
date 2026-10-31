import type { MiningTableResponse } from '@/lib/mining-engine';

export function MiningImportPreview({
  table,
  caption,
}: Readonly<{ table: MiningTableResponse; caption: string }>) {
  return (
    <div
      className="mt-5 max-h-52 overflow-auto rounded-lg border border-[var(--border)] scrollbar-thin"
      tabIndex={0}
      role="region"
      aria-label={caption}
    >
      <table className="w-full min-w-[480px] text-left text-xs">
        <caption className="sr-only">{caption}</caption>
        <thead className="sticky top-0 bg-[var(--surface-raised)] text-[var(--muted-strong)]">
          <tr>
            {table.headers.map((header) => (
              <th
                key={header}
                scope="col"
                className="max-w-64 break-words px-3 py-2 font-semibold"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-[var(--text)]">
          {table.sampleRows.map((row, index) => (
            <tr key={index} className="border-t border-[var(--border)]">
              {table.headers.map((header, column) => (
                <td key={header} className="max-w-64 break-words px-3 py-2">
                  {row[column] ?? ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
