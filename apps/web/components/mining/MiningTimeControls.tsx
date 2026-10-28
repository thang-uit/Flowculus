'use client';
import { useRef, useState } from 'react';
import type { WorkCalendar } from '@flowculus/process-mining';
import { parseWorkCalendarDraft, type CalendarField } from '@/lib/work-calendar-input';
import { AppSelect } from '@/components/ui/AppSelect';
import { AppDialog } from '@/components/ui/AppDialog';
import { AppButton } from '@/components/ui/AppButton';
import { getCalendarCopy } from '@/lib/i18n/calendar-copy';
import { useMiningStore } from '@/lib/mining-store';
import { usePreferencesStore } from '@/lib/use-preferences-store';
const hhmm = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
const displayShifts = (c: WorkCalendar) =>
  c.shifts.map((s) => `${hhmm(s.startMinute)}-${hhmm(s.endMinute)}`).join(', ');
export function MiningTimeControls() {
  const copy = getCalendarCopy(usePreferencesStore((s) => s.locale));
  const policy = useMiningStore((s) => s.timePolicy),
    setPolicy = useMiningStore((s) => s.setTimePolicy);
  const calendar = useMiningStore((s) => s.workCalendar);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<CalendarField | null>(null);
  const fields = useRef<Partial<Record<CalendarField, HTMLInputElement>>>({});
  const [draft, setDraft] = useState({
    offset: String(calendar.utcOffsetMinutes),
    days: calendar.weekdays.join(','),
    shifts: displayShifts(calendar),
    holidays: calendar.holidays.join(','),
  });
  const configure = () => {
    setDraft({
      offset: String(calendar.utcOffsetMinutes),
      days: calendar.weekdays.join(','),
      shifts: displayShifts(calendar),
      holidays: calendar.holidays.join(','),
    });
    setError(null);
    setOpen(true);
  };
  return (
    <section className="space-y-3 border-b border-[var(--border)] p-4">
      <h3 className="text-[13px] font-semibold">{copy.title}</h3>
      <AppSelect
        id="mining-time-basis"
        aria-label={copy.basis}
        value={policy.basis}
        options={[
          { value: 'elapsed', label: copy.elapsed },
          { value: 'working', label: copy.working },
        ]}
        onValueChange={(value) =>
          setPolicy(
            value === 'working' ? { basis: 'working', calendar } : { basis: 'elapsed' },
          )
        }
      />
      <p className="text-xs leading-5 text-[var(--muted)]">{copy.hint}</p>
      {policy.basis === 'working' ? (
        <>
          <p className="text-xs text-[var(--muted)]">
            UTC{calendar.utcOffsetMinutes >= 0 ? '+' : ''}
            {calendar.utcOffsetMinutes / 60} · {calendar.weekdays.join(', ')} ·{' '}
            {displayShifts(calendar)}
          </p>
          <AppButton size="sm" onClick={configure}>
            {copy.configure}
          </AppButton>
        </>
      ) : null}
      <AppDialog
        open={open}
        onOpenChange={setOpen}
        title={copy.configure}
        description={copy.summary}
        closeLabel={copy.close}
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const result = parseWorkCalendarDraft(draft);
            if (!result.ok) {
              setError(result.field);
              fields.current[result.field]?.focus();
              return;
            }
            setPolicy({ basis: 'working', calendar: result.calendar });
            setOpen(false);
          }}
        >
          {(
            [
              { key: 'offset', label: copy.offset, max: 5 },
              { key: 'days', label: copy.weekdays, max: 30 },
              { key: 'shifts', label: copy.shifts, max: 200 },
              { key: 'holidays', label: copy.holidays, max: 11000 },
            ] as const
          ).map((field) => (
            <label className="block space-y-1 text-sm" key={field.key}>
              <span id={`calendar-${field.key}-label`}>{field.label}</span>
              <input
                ref={(element) => {
                  if (element) fields.current[field.key] = element;
                }}
                aria-invalid={error === field.key || undefined}
                aria-labelledby={`calendar-${field.key}-label`}
                aria-describedby={
                  error === field.key ? `calendar-${field.key}-error` : undefined
                }
                className="focus-ring w-full rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2"
                value={draft[field.key]}
                maxLength={field.max}
                onChange={(event) =>
                  setDraft({ ...draft, [field.key]: event.target.value })
                }
              />
              {error === field.key ? (
                <span
                  id={`calendar-${field.key}-error`}
                  role="alert"
                  className="block text-xs text-[var(--danger)]"
                >
                  {copy[`${field.key}Error`]}
                </span>
              ) : null}
            </label>
          ))}
          <AppButton type="submit" variant="primary">
            {copy.apply}
          </AppButton>
        </form>
      </AppDialog>
    </section>
  );
}
