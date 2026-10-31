# Mining results and interpretation

Mode: Operate, with a Read-oriented report inside the existing Mining workspace.
This is a code-led extension. The user selected the result and interpretation panel
in the local Buổi 3 exercise as the reference for information hierarchy, report cards
and natural Vietnamese explanations.

## Visual scope

- The application retains its existing yellow brand, Plus Jakarta Sans typography,
  shared controls, neutral surfaces and theme tokens.
- Results add a scoped navy heading and orange attention treatment inside
  `.mining-report`. Light-theme values are `--report-heading: #1e3a8a`,
  `--report-attention: #b45309` and `--report-soft: #fff7ed`. Dark-theme counterparts
  are `#a9c5ff`, `#ffbb78` and `#30261c`. These are Mining report accents, not a
  replacement global palette.
- Report cards use a 1 px border and 12 px radius. Attention cards carry an orange
  leading border. Meaning callouts have a tinted surface and an icon. Recommendation
  rows use an arrow and an explicit label. Colour never supplies the conclusion alone.
- Body copy is 13 px with 1.7 line height. Report headings use 17, 14 and 13 px
  levels. Metric values use tabular numerals. Tables use 12 px text, sticky headers,
  alternating surfaces and a labelled scroll region.

## Report composition

`MiningConclusions` coordinates the inline report and the optional wider `AppDialog`.
`MiningReportContent` composes the same content for both views.

1. Four result tiles show mean case duration, the longest measured activity, the
   longest recorded handover interval and a coordination bridge when evidence exists.
2. The most frequent route is rendered as ordered activity chips. The initial view
   shows eight steps, with a bounded expanded sequence of at most 100 steps.
3. `MiningFindingCard` presents a recorded observation, its meaning and a recommended
   action. Names and values come from the active log rather than fixed demonstration
   text. Long handover intervals and measured activity spans remain distinct.
4. The personnel table separates distinct senders/receivers, incoming/outgoing
   transfer counts and recorded execution counts. Sorting changes the displayed
   ranking. A secondary expandable table preserves all network metrics.
5. The five personnel interpretations explain direct connections, coordination
   bridges, network reach, influential connections and incoming prominence.
6. Reference comparison appears only for the selected, unchanged model, process
   scope and activity mapping. Otherwise the report offers an action to open BPMN
   comparison.
7. Time-basis and data-quality explanations remain available in an expandable
   section. Technical formulas do not precede the result a person needs to read.

## Meaning and evidence boundaries

- Presentation ranks and formats existing worker results. It does not recompute
  process durations or network centrality formulas.
- A long activity is not labelled above target unless a service standard is supplied.
  A long handover is a reason to inspect entry conditions and coordination, not proof
  of insufficient staff.
- Missing start times change the handover language to a recorded interval that can
  include work in the receiving activity. Jira status changes retain their import
  interpretation and do not create performer or service-time evidence.
- A high bridge or incoming prominence score does not prove a single point of
  failure, a queue, personal productivity or who caused a delay. Tied leaders are
  retained. Rankings without recorded personnel handovers produce no bridge finding.
- `MiningConformanceResults` is shared between the report and the reference panel.
  It separates sequence matching, fully matching cases, differing cases and unchecked
  cases. A partial check never acquires a whole-log compliance claim.
- Deviation examples distinguish required steps not recorded from observed events
  that do not match at that position. The original case history is still needed to
  distinguish a skipped step from incomplete logging, label differences or order.
- Additional model indicators and method formulas are expandable. Precision and
  generalization disclose that they use only fully matching cases.
- Petri verification describes the current model. A reachability limit is
  inconclusive. Structural properties do not establish business compliance.

## Responsive and language rules

The report uses its container width, not the screen width, to select one or two
metric columns. Values and names wrap. Wide tables scroll within their own labelled,
keyboard-focusable region. The wider report uses the shared accessible dialog, with
focus restoration and a localized close action. Existing application theme and
reduced-motion behaviour continue to apply.

Vietnamese leads with familiar terms such as nhật ký, chuỗi hoạt động, bước chuẩn
chưa được ghi nhận and mức khớp trình tự. Conventional English algorithm names are
explained in Knowledge where they aid learning. Imported filenames and activity
labels remain user data. English presents the same evidence and limitations in its
own natural phrasing.

## Source ownership and verification

- `components/mining/MiningReport*`, `MiningFindingCard`, `MiningResourceFindings`,
  `ResourceCentralityTable`, `MiningConformanceResults`, `MiningDeviationList` and
  `PetriVerificationSummary` own presentation.
- `lib/mining-conclusions.ts` and `lib/mining-report-findings.ts` format findings from
  existing evidence. `lib/mining-current-reference.ts` guards reference relevance.
- `lib/i18n/mining-report-copy.ts` and related evidence copy own English/Vietnamese
  text. `app/styles/mining-report.css` owns scoped visual rules.
- `lib/mining-report-document.ts` and `mining-report-document-actions.ts` own the
  readable HTML and browser print/PDF export. The export consumes the same accepted
  evidence and current-reference guard as the on-screen report. Technical JSON remains
  separate and bounded.

Verify measured/missing starts, absent personnel, tied rankings, no handovers,
matching/deviating/partial reference checks, stale model or mapping, both languages,
light/dark themes, keyboard use and small/wide viewports. Repository quality gates
remain mandatory. This document records source-backed design rules and does not
claim browser verification on its own.
