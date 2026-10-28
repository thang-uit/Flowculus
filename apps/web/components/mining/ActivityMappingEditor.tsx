'use client';
import { useMemo, useState } from 'react';
import type { ProcessNode } from '@flowculus/process-model';
import { AppSelect } from '@/components/ui/AppSelect';
import { getMiningEvidenceCopy } from '@/lib/i18n/mining-evidence-copy';
import { usePreferencesStore } from '@/lib/use-preferences-store';

const MAX_VISIBLE_MAPPING_ROWS = 100;

/** Search the full log vocabulary while bounding mounted controls. */
export function ActivityMappingEditor({
  activities,
  tasks,
  mapping,
  onChange,
}: {
  activities: string[];
  tasks: ProcessNode[];
  mapping: Record<string, string>;
  onChange: (activity: string, taskId: string) => void;
}) {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getMiningEvidenceCopy(locale);
  const [query, setQuery] = useState('');
  const matches = useMemo(
    () =>
      activities.filter((name) =>
        name.toLocaleLowerCase(locale).includes(query.trim().toLocaleLowerCase(locale)),
      ),
    [activities, query, locale],
  );
  return (
    <details>
      <summary className="cursor-pointer font-semibold">{copy.mapping}</summary>
      <p className="my-2 text-[var(--muted)]">{copy.mappingHint}</p>
      <input
        type="search"
        className="focus-ring mb-2 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm"
        aria-label={copy.searchActivity}
        placeholder={copy.searchActivity}
        maxLength={160}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <p role="status" className="mb-2 text-[var(--muted)]">
        {copy.mappingCount(
          Math.min(matches.length, MAX_VISIBLE_MAPPING_ROWS),
          matches.length,
        )}
      </p>
      <div className="max-h-64 space-y-2 overflow-y-auto">
        {matches.slice(0, MAX_VISIBLE_MAPPING_ROWS).map((name) => {
          const exact = tasks.filter((task) => task.label === name);
          return (
            <label key={name} className="block space-y-1">
              <span className="block break-words">{name}</span>
              <AppSelect
                id={`mapping-${name}`}
                value={
                  Object.prototype.hasOwnProperty.call(mapping, name)
                    ? mapping[name]
                    : exact.length === 1
                      ? exact[0].id
                      : ''
                }
                options={[
                  { value: '', label: copy.unmapped },
                  ...tasks.map((task) => ({
                    value: task.id,
                    label: `${task.label} (${task.id})`,
                  })),
                ]}
                onValueChange={(value) => onChange(name, value)}
              />
            </label>
          );
        })}
      </div>
    </details>
  );
}
