# Mining time measurement

Mode: Operate. This is a code-led extension of the existing Mining workspace.
The incumbent yellow/neutral tokens, Plus Jakarta Sans and shared controls remain
the visual authority; this surface introduces no new identity or design tokens.

- The time-measurement section sits between the event-log source and filters.
  Select elapsed calendar time or working time, then configure the calendar when
  working time is selected. The surrounding source, graph, KPI and evidence
  composition remains intact.
- The default work calendar is Monday–Friday, 08:00–12:00 and 13:00–17:00 at
  UTC+07:00, with no listed holidays. Working time excludes intervals outside
  those shifts and dates. It does not alter timestamps or trace order, and does
  not establish hands-on labour. The offset is fixed; daylight-saving schedules
  require a separately configured calendar.
- Keep the last configured calendar when switching to elapsed time and back
  during the live Mining session. Reopening the dialog starts from that calendar;
  closing without applying leaves it unchanged.
- Mean lead time shows its elapsed/working basis beside the result, including
  narrow layouts. The label and duration formatting use the completed discovery
  result's policy. Working durations stay in hours rather than implying a
  24-hour working day.
- Calendar configuration reuses `AppDialog`, `AppButton`, `AppSelect`, the shared
  focus treatment, semantic theme tokens and the existing rounded form language.
  Mobile copy wraps within the dialog and source pane; the native inputs retain
  visible labels.
- Validate on Apply. An invalid UTC offset, weekday list, shift list or holiday
  list keeps the draft open, focuses the offending field and shows its localized
  error through `aria-invalid`, `aria-describedby` and an alert. Parse and validate
  before changing the active policy. Offsets are integer minutes within ±840;
  weekdays are unique ISO values 1–7; there are 1–8 non-overlapping shifts; holiday
  dates use valid `YYYY-MM-DD` values with a maximum of 1,000 entries. Valid shifts
  are sorted automatically.
- Keep presentation in `components/mining/MiningTimeControls.tsx` and
  `MiningKpiStrip.tsx`, draft parsing in `lib/work-calendar-input.ts`, session
  choices in `lib/mining-store.ts`, and display formatting in
  `lib/use-mining-duration.ts`. English/Vietnamese labels and errors belong in
  `lib/i18n/calendar-copy.ts`; work-calendar semantics belong in the pure
  `process-mining` package.

Verification should cover calendar retention, the visible KPI basis, field-specific errors and focus, both locales/themes and a mobile layout. Use the production build and the repository test commands.

- Standards comparisons mount at most 50 result rows, with Previous/Next controls,
  a labelled keyboard-scrollable table and localized numeric formatting. New
  comparisons reset pagination, and result snapshots retain their log/calendar.
- Reference comparison shows a localized busy state and cannot run while a log
  is being replaced. Worker loss clears dependent evidence and offers source
  reload. A separate request token prevents obsolete alignments replacing a newer
  comparison. Exported Mining evidence names display filters and hidden counts.

- Filter and calendar edits wait for a ready source. Source inspection/mapping and
  an active discovery cannot be superseded by a rediscovery timer. Once the source
  completes, compare the displayed result with the latest controls and apply any
  pending changes. Clearing or failing a session must never trigger a reload.
