# ADR 0003: Structured diagnostics, proven structure and a semantic gate

Status: accepted

## Context

The analysis returned free-text `assumptions` and `warnings`, picked the first
start event when there were several, paired an XOR split with an AND join
without proof (an XOR→AND model returned CT 18 as if it were exact), mixed
three time conventions (`D`, `T + Wq`, `T`), and multiplied CTE by 100 in
some places. Inferred draw.io and mining semantics were flagged, but a model
full of guesses could still be exported and shared as if it were fact.

## Decision

- **Diagnostics are data.** Packages emit
  `{ code, severity, impact, scope, path, params }`; the app formats them per
  locale from typed `Record<DiagnosticCode, …>` tables. `impact` drives
  quality per scope, giving `metricQuality` per metric and a headline of
  worst(CT, TCT). Values are `null` when `simulation-required`.
- **Structure must be proven.** A split's join is the explicit
  `flowculus-join-id`, else its immediate post-dominator when the region is
  single-entry/single-exit and the gateway kinds match. Otherwise the split is
  unresolved and the result is `simulation-required`. Multiple start events
  are never resolved by picking one.
- **One time contract.** `resolveActivityTime`: `D` wins, else `T + Wq`;
  `T + Wq > D` is an error, `T + Wq < D` an assumption. Sources are exposed on
  every surface. CTE is a ratio in `[0, 1]`.
- **CPM and the critical chain are separate results** with separate names;
  the chain is labelled an expected-time heuristic when decisions exist.
- **Semantic gate.** `collectUnconfirmedSemantics` is the single policy.
  Export and share go through one app-level guard that opens a blocked dialog;
  the exporter accepts only a branded `ConfirmedProcessModel` and re-checks it.
  Confirmation records `flowculus-confirmed`.

## Consequences

- Some models that used to show a number now show `simulation-required` with
  a diagnostic (documented in the relevant change description and domain documentation). Book examples, the
  starter model and the mining presets keep identical, pinned numbers.
- Every new diagnostic code needs English and Vietnamese text, enforced by the
  type checker and a test.
- Importing a native draw.io file or a mined model requires a review step
  before export; editing, analysis and drafts are never blocked.
