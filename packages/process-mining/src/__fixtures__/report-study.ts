import type { ProcessModel, ProcessNode } from '@flowculus/process-model';
import { createEventLog } from '../parse';
import type { MiningEvent } from '../types';
import { addWorkingMinutes, DEFAULT_WORK_CALENDAR } from '../business-calendar';
export type StudyVariant = 'as-is' | 'to-be';
export const STUDY_CALENDAR = {
  basis: 'working' as const,
  calendar: DEFAULT_WORK_CALENDAR,
};
export const STUDY_LABELS: Record<string, string> = {
  spec: 'Phân tích yêu cầu',
  backend: 'Lập trình Backend',
  mobile: 'Lập trình Mobile',
  prepare: 'Chuẩn bị kiểm thử tự động',
  qa: 'Kiểm thử tích hợp',
  fix: 'Sửa lỗi nội bộ',
  retest: 'Kiểm thử lại nội bộ',
  handover: 'Bàn giao UAT',
  uat: 'Khách hàng UAT',
  uatfix: 'Sửa lỗi UAT',
  uatretest: 'UAT lại',
  accept: 'Ký nghiệm thu',
  bypass: 'Gửi bản thử ngoài chuẩn',
};
export const STUDY_RESOURCES: Record<string, string> = {
  spec: 'Nguyễn Văn An (BA giả định)',
  backend: 'Trịnh Thuận Huê',
  mobile: 'Chu Nam Thắng',
  prepare: 'Lê Thị Lan (QA giả định)',
  qa: 'Lê Thị Lan (QA giả định)',
  fix: 'Trịnh Thuận Huê',
  retest: 'Lê Thị Lan (QA giả định)',
  handover: 'Nguyễn Văn An (BA giả định)',
  uat: 'Đại diện khách hàng (giả định)',
  uatfix: 'Trịnh Thuận Huê',
  uatretest: 'Đại diện khách hàng (giả định)',
  accept: 'Nguyễn Văn An (BA giả định)',
  bypass: 'Chu Nam Thắng',
};
export const studyHours = (variant: StudyVariant): Record<string, number> => ({
  spec: 8,
  backend: 24,
  mobile: 16,
  prepare: 5,
  qa: variant === 'as-is' ? 8 : 3,
  fix: 10,
  retest: 2,
  handover: variant === 'as-is' ? 4 : 1,
  uat: 4,
  uatfix: 6,
  uatretest: 2,
  accept: 0,
});
export function studyModel(variant: StudyVariant): ProcessModel {
  const hours = studyHours(variant),
    toBe = variant === 'to-be';
  const nodes: Record<string, ProcessNode> = {};
  const tasks = [
    'spec',
    'backend',
    'mobile',
    ...(toBe ? ['prepare'] : []),
    'qa',
    'fix',
    'retest',
    'handover',
    'uat',
    'uatfix',
    'uatretest',
    'accept',
  ];
  const resources = ['ba', 'be', 'mb', 'qa', 'client'];
  const lane: Record<string, string> = {
    spec: 'ba',
    backend: 'be',
    mobile: 'mb',
    prepare: 'qa',
    qa: 'qa',
    fix: 'be',
    retest: 'qa',
    handover: 'ba',
    uat: 'client',
    uatfix: 'be',
    uatretest: 'client',
    accept: 'ba',
  };
  const waiting: Record<string, number> = toBe
    ? { qa: 2, handover: 1, uat: 5 }
    : { mobile: 12, qa: 4, handover: 4, uat: 12 };
  tasks.forEach(
    (id) =>
      (nodes[id] = {
        id,
        label: STUDY_LABELS[id],
        kind: 'task',
        poolId: 'scope',
        laneId: `lane_${lane[id]}`,
        processingMinutes: hours[id] * 60,
        waitingMinutes: (waiting[id] ?? 0) * 60,
        bounds: {
          x: (
            {
              spec: 180,
              backend: toBe ? 600 : 480,
              mobile: toBe ? 600 : 800,
              prepare: 600,
              qa: 1120,
              fix: 1450,
              retest: 1720,
              handover: 2020,
              uat: 2300,
              uatfix: 2650,
              uatretest: 2900,
              accept: 3270,
            } as Record<string, number>
          )[id],
          y: resources.indexOf(lane[id]) * 150 + 55,
          width: 155,
          height: 70,
        },
      }),
  );
  for (const [id, kind] of [
    ['start', 'start'],
    ['end', 'end'],
  ] as const)
    nodes[id] = {
      id,
      label: id === 'start' ? 'Bắt đầu' : 'Kết thúc',
      kind,
      poolId: 'scope',
      bounds: { x: id === 'start' ? 70 : 3500, y: 55, width: 40, height: 40 },
    };
  for (const [id, kind] of [
    ['parallel', 'and'],
    ['join', 'and'],
    ['qa_choice', 'xor'],
    ['qa_merge', 'xor'],
    ['uat_choice', 'xor'],
    ['uat_merge', 'xor'],
  ] as const)
    if (toBe || !['parallel', 'join'].includes(id))
      nodes[id] = {
        id,
        label: (
          {
            parallel: 'Phân nhánh',
            join: 'Đồng bộ',
            qa_choice: 'Cần sửa nội bộ?',
            qa_merge: 'Hợp nhất',
            uat_choice: 'Cần sửa UAT?',
            uat_merge: 'Hợp nhất',
          } as Record<string, string>
        )[id],
        gatewayKind: kind,
        kind: 'gateway',
        poolId: 'scope',
        bounds: {
          x: {
            parallel: 430,
            join: 950,
            qa_choice: 1350,
            qa_merge: 1940,
            uat_choice: 2530,
            uat_merge: 3170,
          }[id],
          y: kind === 'and' ? 230 : id.startsWith('qa_') ? 515 : 665,
          width: 50,
          height: 50,
        },
      };
  const links = toBe
    ? [
        ['start', 'spec'],
        ['spec', 'parallel'],
        ['parallel', 'backend'],
        ['parallel', 'mobile'],
        ['parallel', 'prepare'],
        ['backend', 'join'],
        ['mobile', 'join'],
        ['prepare', 'join'],
        ['join', 'qa'],
      ]
    : [
        ['start', 'spec'],
        ['spec', 'backend'],
        ['backend', 'mobile'],
        ['mobile', 'qa'],
      ];
  links.push(
    ['qa', 'qa_choice'],
    ['qa_choice', 'fix'],
    ['fix', 'retest'],
    ['retest', 'qa_merge'],
    ['qa_choice', 'qa_merge'],
    ['qa_merge', 'handover'],
    ['handover', 'uat'],
    ['uat', 'uat_choice'],
    ['uat_choice', 'uatfix'],
    ['uatfix', 'uatretest'],
    ['uatretest', 'uat_merge'],
    ['uat_choice', 'uat_merge'],
    ['uat_merge', 'accept'],
    ['accept', 'end'],
  );
  const r1 = toBe ? 0.1 : 0.3,
    r2 = toBe ? 0.05 : 0.2;
  return {
    schemaVersion: 2,
    id: `is6003-${variant}`,
    name: `IS6003 ${toBe ? 'To-Be' : 'As-Is'} · giờ làm việc`,
    nodes,
    edges: Object.fromEntries(
      links.map(([source, target], i) => [
        `f${i}`,
        {
          id: `f${i}`,
          source,
          target,
          kind: 'sequence',
          ...(source === 'qa_choice'
            ? { probability: target === 'fix' ? r1 : 1 - r1 }
            : source === 'uat_choice'
              ? { probability: target === 'uatfix' ? r2 : 1 - r2 }
              : {}),
        },
      ]),
    ),
    containers: {
      scope: {
        id: 'scope',
        label: 'Phạm vi phân tích phối hợp đã đơn giản hóa',
        kind: 'pool',
        processId: variant,
        orientation: 'horizontal',
        bounds: { x: 0, y: 0, width: 3600, height: 750 },
      },
      ...Object.fromEntries(
        resources.map((id, i) => [
          `lane_${id}`,
          {
            id: `lane_${id}`,
            kind: 'lane',
            label: {
              ba: 'BA',
              be: 'Backend',
              mb: 'Mobile',
              qa: 'QA',
              client: 'UAT (vai trò ngoài tổ chức)',
            }[id],
            parentId: 'scope',
            orientation: 'horizontal',
            bounds: { x: 36, y: i * 150, width: 3564, height: 150 },
          },
        ]),
      ),
    },
    metadata: {
      'time-basis': 'working',
      calendar: 'Mon-Fri 08:00-12:00,13:00-17:00 UTC+07:00',
      provenance: 'synthetic-study',
      'scope-note':
        'Single-process analytical projection; external client collaboration requires a separate BPMN pool and message flows.',
    },
  };
}
/** 20 sequentially released cases avoid resource overlap; branch work is truly concurrent. */
export function studyLog(variant: StudyVariant) {
  const h = studyHours(variant),
    toBe = variant === 'to-be';
  let next = Date.parse('2026-10-05T08:00:00+07:00');
  const events: MiningEvent[] = [];
  for (let i = 0; i < 20; i++) {
    let cursor = next;
    const caseId = `FEAT_${301 + i}`;
    const add = (id: string, wait = 0, start?: number) => {
      const at = addWorkingMinutes(addWorkingMinutes(start ?? cursor, wait * 60), 0);
      const end = addWorkingMinutes(at, h[id] * 60);
      events.push({
        caseId,
        activity: STUDY_LABELS[id],
        startTime: at,
        completeTime: end,
        resource: STUDY_RESOURCES[id],
      });
      if (start == null) cursor = end;
      return end;
    };
    add('spec');
    if (toBe) {
      const begin = cursor;
      const ends = [
        add('backend', 0, begin),
        add('mobile', 0, begin),
        add('prepare', 0, begin),
      ];
      cursor = Math.max(...ends);
    } else {
      add('backend');
      add('mobile', 12);
    }
    add('qa', toBe ? 2 : 4);
    if (toBe ? i === 0 || i === 10 : i % 4 === 0 || i === 10) {
      add('fix');
      add('retest');
    }
    add('handover', toBe ? 1 : 4);
    add('uat', toBe ? 5 : 12);
    if (toBe ? i === 1 : i % 5 === 1) {
      add('uatfix');
      add('uatretest');
    }
    add('accept');
    next = addWorkingMinutes(cursor, 60);
  }
  return createEventLog(`IS6003 ${variant} · tổng hợp`, events);
}
export function studyViolationLog() {
  const source = studyLog('to-be');
  const rows = source.events
    .filter((e) => ['FEAT_301', 'FEAT_302', 'FEAT_303', 'FEAT_304'].includes(e.caseId))
    .map((e) => ({ ...e }));
  return createEventLog(
    'IS6003 sai lệch tổng hợp',
    rows
      .filter(
        (e) =>
          !(e.caseId === 'FEAT_301' && e.activity === STUDY_LABELS.qa) &&
          !(
            e.caseId === 'FEAT_304' &&
            [STUDY_LABELS.uat, STUDY_LABELS.accept].includes(e.activity)
          ),
      )
      .map((e) =>
        e.caseId === 'FEAT_302' && e.activity === STUDY_LABELS.handover
          ? { ...e, activity: STUDY_LABELS.bypass }
          : e,
      ),
  );
}

/** One focused case per demo file makes the alignment explanation easy to follow. */
export function studyDeviationLog(kind: 'skip-qa' | 'bypass-handover') {
  const caseId = kind === 'skip-qa' ? 'FEAT_301' : 'FEAT_302';
  const rows = studyLog('to-be')
    .events.filter((event) => event.caseId === caseId)
    .filter((event) => !(kind === 'skip-qa' && event.activity === STUDY_LABELS.qa))
    .map((event) =>
      kind === 'bypass-handover' && event.activity === STUDY_LABELS.handover
        ? { ...event, activity: STUDY_LABELS.bypass }
        : { ...event },
    );
  return createEventLog(`IS6003 ${kind}`, rows);
}
