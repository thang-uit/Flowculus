import { escapeCsvValue } from '@flowculus/file-formats';

export type EventLogTemplateKind = 'events' | 'jira-status';

/** Small synthetic teaching inputs, independent of the project's report-study dataset. */
export function createEventLogTemplate(kind: EventLogTemplateKind): {
  fileName: string;
  csv: string;
} {
  const rows =
    kind === 'events'
      ? [
          ['case_id', 'activity', 'start_timestamp', 'timestamp', 'resource'],
          [
            'CASE-001',
            'Review request',
            '2026-10-05T08:00:00+07:00',
            '2026-10-05T09:00:00+07:00',
            'Analyst A',
          ],
          [
            'CASE-001',
            'Implement API',
            '2026-10-05T10:00:00+07:00',
            '2026-10-05T12:00:00+07:00',
            'Developer B',
          ],
          [
            'CASE-001',
            'Test API',
            '2026-10-05T13:00:00+07:00',
            '2026-10-05T14:00:00+07:00',
            'Tester C',
          ],
          [
            'CASE-002',
            'Review request',
            '2026-10-06T08:00:00+07:00',
            '2026-10-06T09:00:00+07:00',
            'Analyst A',
          ],
          [
            'CASE-002',
            'Implement API',
            '2026-10-06T10:00:00+07:00',
            '2026-10-06T12:00:00+07:00',
            'Developer B',
          ],
          [
            'CASE-002',
            'Test API',
            '2026-10-06T15:00:00+07:00',
            '2026-10-06T16:00:00+07:00',
            'Tester C',
          ],
        ]
      : [
          [
            'Issue key',
            'Summary',
            'From status',
            'To status',
            'Change time',
            'Changed by',
          ],
          [
            'DEMO-101',
            'Request A',
            'To Do',
            'In Progress',
            '2026-10-05T08:00:00+07:00',
            'Editor A',
          ],
          [
            'DEMO-101',
            'Request A',
            'In Progress',
            'In Review',
            '2026-10-05T12:00:00+07:00',
            'Editor B',
          ],
          [
            'DEMO-101',
            'Request A',
            'In Review',
            'Done',
            '2026-10-05T15:00:00+07:00',
            'Editor C',
          ],
          [
            'DEMO-102',
            'Request B',
            'To Do',
            'In Progress',
            '2026-10-06T08:00:00+07:00',
            'Editor A',
          ],
          [
            'DEMO-102',
            'Request B',
            'In Progress',
            'In Review',
            '2026-10-06T12:00:00+07:00',
            'Editor B',
          ],
          [
            'DEMO-102',
            'Request B',
            'In Review',
            'Done',
            '2026-10-06T17:00:00+07:00',
            'Editor C',
          ],
        ];
  return {
    fileName:
      kind === 'events'
        ? 'flowculus_event_log_template.csv'
        : 'flowculus_jira_history_template.csv',
    csv:
      rows
        .map((row) => row.map((value) => escapeCsvValue(value)).join(','))
        .join('\r\n') + '\r\n',
  };
}
