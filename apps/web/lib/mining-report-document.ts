import type { AlignmentConformance } from '@flowculus/process-mining';
import type { Locale } from './i18n';
import type { MiningDiscoveryResponse } from './mining-engine';
import { getMiningDocumentCopy } from './i18n/mining-report-document-copy';
import { miningReportNarrative } from './mining-report-narrative';
import { miningConclusions } from './mining-conclusions';
import { miningResourceFindings } from './mining-report-findings';
import { getMiningReportCopy } from './i18n/mining-report-copy';
import { getMiningEvidenceCopy } from './i18n/mining-evidence-copy';

export interface MiningReportDocumentOptions {
  result: MiningDiscoveryResponse;
  locale: Locale;
  duration: (value: number) => string;
  reference?: { name: string; alignment: AlignmentConformance } | null;
  source?: string;
}

const escapeHtml = (value: unknown): string =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const list = (items: string[]) =>
  items.length
    ? `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
    : '<p class="muted">—</p>';

export function buildMiningReportHtml({
  result,
  locale,
  duration,
  reference,
  source,
}: MiningReportDocumentOptions): string {
  const copy = getMiningDocumentCopy(locale);
  const reportCopy = getMiningReportCopy(locale);
  const evidenceCopy = getMiningEvidenceCopy(locale);
  const narrative = miningReportNarrative(result, locale, duration);
  const stats = result.discovery.stats;
  const number = (value: number) => new Intl.NumberFormat(locale).format(value);
  const percent = (value: number) =>
    new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 }).format(
      value,
    );
  const generated = new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date());
  const routes = result.discovery.variants
    .slice(0, 10)
    .map(
      (variant) => `
    <tr><td>${escapeHtml(variant.id)}</td><td>${escapeHtml(variant.activities.slice(0, 100).join(' → '))}${variant.activities.length > 100 ? `<p>${escapeHtml(reportCopy.stepLimit)}</p>` : ''}</td><td>${number(variant.caseCount)}</td><td>${percent(variant.share)}</td><td>${escapeHtml(duration(variant.meanLeadTimeMs))}</td></tr>`,
    )
    .join('');
  const findings = [
    ...narrative.findings,
    ...miningConclusions(result, locale, duration),
    ...miningResourceFindings(result.socialNetwork, locale),
  ];
  const findingSections = findings
    .map(
      (finding) => `
    <article class="finding"><h3>${escapeHtml(finding.title)}</h3><p>${escapeHtml(finding.observation)}</p><p class="meaning"><strong>${escapeHtml(reportCopy.meaning)}:</strong> ${escapeHtml(finding.meaning)}</p><p class="action"><strong>${escapeHtml(reportCopy.action)}:</strong> ${escapeHtml(finding.action ?? '—')}</p></article>`,
    )
    .join('');
  const conformance = reference
    ? `<section><h2>${escapeHtml(reportCopy.comparison)}</h2><p><strong>${escapeHtml(reference.name)}</strong></p><table><tr><th>${escapeHtml(reportCopy.fitness)}</th><th>${escapeHtml(reportCopy.compatible)}</th><th>${escapeHtml(reportCopy.examined)}</th><th>${escapeHtml(reportCopy.omitted)}</th></tr><tr><td>${reference.alignment.fitness == null ? escapeHtml(copy.unknown) : percent(reference.alignment.fitness)}</td><td>${number(reference.alignment.compatibleCases)}</td><td>${number(reference.alignment.examinedCases)}</td><td>${number(reference.alignment.omittedCases)}</td></tr></table><p>${escapeHtml(reportCopy.fitnessMeaning)}</p>${reference.alignment.status !== 'ready' ? `<p>${escapeHtml(reportCopy.partial)}</p>` : ''}${reference.alignment.examples
        .slice(0, 10)
        .map(
          (example) =>
            `<article class="finding"><h3>${escapeHtml(example.caseId)}</h3><p>${escapeHtml(reportCopy.missingSteps)}</p>${list(
              example.moves
                .filter((move) => move.kind === 'model')
                .slice(0, 100)
                .map((move) => move.activity)
                .filter((activity): activity is string => !!activity),
            )}<p>${escapeHtml(reportCopy.extraSteps)}</p>${list(
              example.moves
                .filter((move) => move.kind === 'log')
                .slice(0, 100)
                .map((move) => move.activity)
                .filter((activity): activity is string => !!activity),
            )}</article>`,
        )
        .join(
          '',
        )}<p>${escapeHtml(reportCopy.deviationHint)}</p><p>${escapeHtml(evidenceCopy.method)}</p></section>`
    : '';
  const quality = result.importReview
    ? `<section><h2>${escapeHtml(copy.dataQuality)}</h2>${list([
        `${copy.rowsRejected}: ${number(result.importReview.rejectedRows)}`,
        `${copy.invalidTimes}: ${number(result.invalidTimestamps)}`,
        `${copy.invalidStarts}: ${number(result.invalidStartTimes)}`,
        `${copy.duplicateRows}: ${number(result.importReview.duplicateRows)}`,
        `${copy.unpairedStarts}: ${number(result.importReview.unpairedStarts)}`,
        `${copy.missingStarts}: ${number(result.missingStartTimes)}`,
      ])}</section>`
    : '';
  const personnel = result.socialNetwork.resources.length
    ? `<section><h2>${escapeHtml(reportCopy.table)}</h2><p>${escapeHtml(reportCopy.peopleScope)}</p><div class="table-wrap"><table><thead><tr>${[evidenceCopy.resource, reportCopy.senderReceiver, reportCopy.transfers, reportCopy.events, reportCopy.between, reportCopy.closeness, reportCopy.eigenvector, reportCopy.pageRank].map((heading) => `<th scope="col">${escapeHtml(heading)}</th>`).join('')}</tr></thead><tbody>${result.socialNetwork.resources.map((person) => `<tr><th scope="row">${escapeHtml(person.id)}</th><td>${number(person.inDegree)} / ${number(person.outDegree)}</td><td>${number(person.incomingHandoffs)} / ${number(person.outgoingHandoffs)}</td><td>${number(person.eventCount)}</td>${[person.betweenness, person.closeness, person.eigenvector, person.pageRank].map((value) => `<td>${new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(value)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>${result.socialNetwork.omittedResources ? `<p>${escapeHtml(reportCopy.peopleLimit(number(result.socialNetwork.omittedResources)))}</p>` : ''}</section>`
    : `<section><h2>${escapeHtml(reportCopy.people)}</h2><p>${escapeHtml(reportCopy.noResources)}</p></section>`;
  const policy = result.discovery.timePolicy;
  const calendar =
    policy.basis === 'working'
      ? `<p><strong>${escapeHtml(copy.calendar)}:</strong> UTC${policy.calendar.utcOffsetMinutes >= 0 ? '+' : ''}${policy.calendar.utcOffsetMinutes / 60} · ${policy.calendar.weekdays.map((day) => new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2024, 0, day)))).join(', ')} · ${policy.calendar.shifts.map((shift) => `${String(Math.floor(shift.startMinute / 60)).padStart(2, '0')}:${String(shift.startMinute % 60).padStart(2, '0')}–${String(Math.floor(shift.endMinute / 60)).padStart(2, '0')}:${String(shift.endMinute % 60).padStart(2, '0')}`).join(', ')}${policy.calendar.holidays.length ? `<br>${escapeHtml(copy.holidays)}: ${escapeHtml(policy.calendar.holidays.join(', '))}` : ''}</p>`
      : '';
  const metadata = `<p><strong>${escapeHtml(copy.source)}:</strong> ${escapeHtml(source ?? result.logName)}</p><p><strong>${escapeHtml(copy.clock)}:</strong> ${escapeHtml(policy.basis === 'working' ? copy.working : copy.elapsed)}</p>${calendar}<p>${escapeHtml(reportCopy.scope)}</p>`;
  const html = `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(copy.title)} — ${escapeHtml(result.logName)}</title><style>
    :root{color:#17202a;background:#fff;font-family:"Plus Jakarta Sans Variable",sans-serif}*{box-sizing:border-box}p{line-height:1.65}body{margin:0;padding:32px;background:#f3f5f7}main{overflow-wrap:anywhere;max-width:1080px;margin:0 auto;padding:32px;background:#fff;border:1px solid #d8dee5;border-radius:16px}h1{margin:0;color:#1e3a8a;font-size:28px}h2{margin:28px 0 10px;color:#1e3a8a;font-size:17px}h3{margin:0 0 8px;color:#1e3a8a;font-size:14px}.meta,.muted{color:#65717d;font-size:12px}.meta{margin:8px 0 24px}.metrics{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}.metric{padding:12px;border:1px solid #d8dee5;border-radius:10px}.metric small{display:block;color:#65717d}.metric strong{display:block;margin-top:4px;font-size:18px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{padding:8px;border-bottom:1px solid #e3e8ee;text-align:left;vertical-align:top}th{color:#65717d;font-size:10px;text-transform:uppercase}.finding{margin-top:12px;padding:14px;border:1px solid #d8dee5;border-radius:10px}.finding p{line-height:1.65}.meaning{padding:9px;background:#fff7ed;border-radius:8px}.action{color:#287a55}ul{margin:8px 0;padding-left:20px;font-size:12px;line-height:1.7}.footer{margin-top:28px;color:#65717d;font-size:11px}@media(max-width:720px){body{padding:12px}main{padding:18px}.metrics{grid-template-columns:repeat(2,minmax(0,1fr))}table{display:block;overflow:auto;max-width:100%}}
  @page{size:A4;margin:16mm}@media print{body{padding:0;background:#fff}main{max-width:none;padding:0;border:0;border-radius:0}h2,h3{break-after:avoid}.finding,tr{break-inside:avoid}thead{display:table-header-group}.metrics{grid-template-columns:repeat(3,minmax(0,1fr))}table{display:table;font-size:10px}th,td{overflow-wrap:anywhere}.footer{break-before:avoid}}
  </style></head><body><main><h1>${escapeHtml(copy.title)}</h1><p class="meta">${escapeHtml(result.logName)} · ${escapeHtml(copy.generated)}: ${escapeHtml(generated)}</p><section><h2>${escapeHtml(copy.overview)}</h2>${narrative.overview.map((item) => `<p>${escapeHtml(item)}</p>`).join('')}</section><section><h2>${escapeHtml(copy.metadata)}</h2>${metadata}<div class="metrics"><div class="metric"><small>${escapeHtml(copy.caseCount)}</small><strong>${number(stats.caseCount)}</strong></div><div class="metric"><small>${escapeHtml(copy.eventCount)}</small><strong>${number(stats.eventCount)}</strong></div><div class="metric"><small>${escapeHtml(copy.activityCount)}</small><strong>${number(stats.activityCount)}</strong></div><div class="metric"><small>${escapeHtml(copy.variantCount)}</small><strong>${number(stats.variantCount)}</strong></div><div class="metric"><small>${escapeHtml(copy.resourceCount)}</small><strong>${number(stats.resourceCount)}</strong></div></div></section>${quality}<section><h2>${escapeHtml(copy.routes)}</h2><table><thead><tr><th scope="col">${escapeHtml(copy.variants)}</th><th>${escapeHtml(copy.sequence)}</th><th>${escapeHtml(copy.cases)}</th><th>${escapeHtml(copy.share)}</th><th>${escapeHtml(copy.mean)}</th></tr></thead><tbody>${routes}</tbody></table></section><section><h2>${escapeHtml(copy.findings)}</h2>${findingSections || '<p class="muted">—</p>'}</section>${personnel}${conformance}<section><h2>${escapeHtml(copy.methods)}</h2>${list(narrative.limitations)}</section><p class="footer">Flowculus · ${escapeHtml(copy.exportLimit('10'))}</p></main></body></html>`;
  if (new TextEncoder().encode(html).byteLength > 500_000)
    throw new Error('report-too-large');
  return html;
}
