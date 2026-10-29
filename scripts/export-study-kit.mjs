import './export-demo-runtime.mjs';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { writeImageSamples } from './demo/image-samples.mjs';
const {
  studyModel,
  studyLog,
  studyViolationLog,
  studyDeviationLog,
  STUDY_CALENDAR,
  STUDY_LABELS,
} = await import('../packages/process-mining/src/__fixtures__/report-study.ts');
const { analyzeProcess } = await import('../packages/analysis-engine/src/index.ts');
const { exportBpmnXml } = await import('../packages/bpmn-adapter/src/index.ts');
const { serializeFlowculusFile } = await import('../packages/file-formats/src/index.ts');
const { checkSemanticGate } = await import('../packages/validation/src/index.ts');
const {
  discoverProcess,
  alignmentConformance,
  buildSocialNetwork,
  eventLogToCsv,
  createDurationClock,
  bpmnToPetri,
  verifyPetri,
  petriToPnml,
  mineAlpha,
} = await import('../packages/process-mining/src/index.ts');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = resolve(process.argv[2] ?? resolve(root, 'output/demo/report-study'));
if (existsSync(target) && !existsSync(resolve(target, 'study-manifest.json')))
  throw new Error(
    'The target already exists without a study manifest. Choose a new directory.',
  );
const files = {};
const metrics = {
  calendar: STUDY_CALENDAR,
  provenance: 'synthetic-reproducible-study',
  scenarios: {},
};
for (const variant of ['as-is', 'to-be']) {
  const model = studyModel(variant),
    log = studyLog(variant),
    gate = checkSemanticGate(model);
  if (!gate.ok) throw new Error(`The ${variant} demo requires semantic confirmation.`);
  const prefix = variant === 'as-is' ? '10_as_is' : '11_to_be';
  files[prefix + '.bpmn'] = exportBpmnXml(gate.model);
  files[prefix + '.flowculus.json'] = serializeFlowculusFile({
    schemaVersion: 2,
    model,
    analysisOptions: { processPoolId: 'scope' },
  });
  files[prefix + '_events.csv'] = eventLogToCsv(log);
  const report = analyzeProcess(model),
    discovery = discoverProcess(log, undefined, STUDY_CALENDAR),
    elapsed = discoverProcess(log),
    alignment = alignmentConformance(log, model),
    petri = bpmnToPetri(model);
  const clock = createDurationClock(STUDY_CALENDAR);
  const traces = new Map();
  for (const e of log.events) {
    const row = traces.get(e.caseId) ?? [];
    row.push(e);
    traces.set(e.caseId, row);
  }
  const effort =
    log.events.reduce((sum, e) => sum + clock(e.startTime, e.completeTime) / 3600000, 0) /
    traces.size;
  metrics.scenarios[variant] = {
    report,
    stats: discovery.stats,
    elapsedStats: elapsed.stats,
    alignment,
    resources: buildSocialNetwork(log),
    bottlenecks: discovery.bottlenecks,
    dfg: discovery.dfg,
    cases: [...traces].map(([id, events]) => ({ id, events })),
    meanEffortPersonHours: effort,
    alpha: mineAlpha(log),
    verification: petri.status === 'ready' ? verifyPetri(petri.net) : null,
  };
  if (petri.status === 'ready')
    files['expected/' + variant + '.pnml'] = petriToPnml(petri.net);
}
const bad = studyViolationLog();
files['12_to_be_deviations.csv'] = eventLogToCsv(bad);
metrics.deviations = alignmentConformance(bad, studyModel('to-be'));
for (const [name, kind] of [
  ['12a_skip_qa.csv', 'skip-qa'],
  ['12b_bypass_handover.csv', 'bypass-handover'],
]) {
  const focused = studyDeviationLog(kind);
  files[name] = eventLogToCsv(focused);
  metrics[kind] = alignmentConformance(focused, studyModel('to-be'));
}
files['13_service_standards.csv'] =
  'activity,max_service_minutes\n' +
  STUDY_LABELS.qa +
  ',240\n' +
  STUDY_LABELS.uat +
  ',240\n';
files['14_work_calendar.json'] = JSON.stringify(STUDY_CALENDAR, null, 2);
files['expected/study_metrics.json'] = JSON.stringify(metrics, null, 2);
files['HUONG_DAN_DEMO_BAO_CAO.md'] = readFileSync(
  resolve(root, 'docs/report-study-guide.md'),
  'utf8',
);
for (const [name, content] of Object.entries(files)) {
  const p = resolve(target, name);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, content);
}
const imageSampleHashes = writeImageSamples(target);
writeFileSync(
  resolve(target, 'study-manifest.json'),
  JSON.stringify(
    {
      generator: 'flowculus-report-study-v1',
      provenance: 'synthetic',
      timeUnit:
        'Model minutes, ISO timestamps, working calendar in 14_work_calendar.json',
      sourceState:
        'Generated from current sources. Expected results use the same engine and are not independent validation.',
      files: {
        ...Object.fromEntries(
          Object.entries(files).map(([name, text]) => [
            name,
            createHash('sha256').update(text).digest('hex'),
          ]),
        ),
        ...imageSampleHashes,
      },
    },
    null,
    2,
  ),
);
console.log(`Study demo exported: ${target}`);
console.log(
  JSON.stringify(
    Object.fromEntries(
      Object.entries(metrics.scenarios).map(([k, v]) => [
        k,
        {
          ct: v.report.cycleTimeMinutes / 60,
          tct: v.report.theoreticalCycleTimeMinutes / 60,
          cte: v.report.cycleTimeEfficiency,
          meanWork: v.stats.meanLeadTimeMs / 3600000,
          effort: v.meanEffortPersonHours,
          fitness: v.alignment.fitness,
        },
      ]),
    ),
  ),
);
