'use client';

import { useId, useMemo, useState } from 'react';

import { analyzeReworkExample, type ReworkPolicy } from '@/lib/knowledge/rework-example';
import { getReadingCopy } from '@/lib/i18n/knowledge/copy';
import { usePreferencesStore } from '@/lib/use-preferences-store';
import { ProcessFigure } from './ProcessFigure';
import { FormulaCard } from '@/components/analysis/FormulaCard';

export function ReworkPlayground() {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getReadingCopy(locale);
  const [duration, setDuration] = useState(120);
  const [probability, setProbability] = useState(50);
  const [policy, setPolicy] = useState<ReworkPolicy>('once');
  const id = useId();
  const report = useMemo(
    () => analyzeReworkExample(duration, probability / 100, policy),
    [duration, probability, policy],
  );
  const formatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  return (
    <section className="knowledge-playground" aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`}>{copy.playground}</h3>
      <p>{copy.playgroundHint}</p>
      <div className="knowledge-policy" role="group" aria-label={copy.playground}>
        {(['once', 'unlimited'] as const).map((option) => (
          <button
            key={option}
            type="button"
            className="focus-ring"
            aria-pressed={policy === option}
            onClick={() => setPolicy(option)}
          >
            {copy[option]}
          </button>
        ))}
      </div>
      <div className="knowledge-playground-inputs">
        <div>
          <label htmlFor={`${id}-time`}>
            {copy.duration}
            <strong>
              {duration} {copy.minutes}
            </strong>
          </label>
          <input
            className="flow-range"
            id={`${id}-time`}
            type="range"
            min="15"
            max="240"
            step="15"
            value={duration}
            onChange={(event) => setDuration(Number(event.target.value))}
          />
        </div>
        <div>
          <label htmlFor={`${id}-probability`}>
            {copy.probability}
            <strong>{probability}%</strong>
          </label>
          <input
            className="flow-range"
            id={`${id}-probability`}
            type="range"
            min="0"
            max="90"
            step="5"
            value={probability}
            onChange={(event) => setProbability(Number(event.target.value))}
          />
        </div>
      </div>
      <ProcessFigure
        diagram={policy === 'once' ? 'rework-once' : 'rework-loop'}
        caption={copy[policy]}
      />
      <p className="knowledge-playground-explanation">
        {policy === 'once' ? copy.onceExplanation : copy.repeatedExplanation}
      </p>
      <FormulaCard
        title={copy.workedFormula}
        description={copy.minutes}
        symbol="CT"
        ast={report.formulaAst}
        fallback={copy.playgroundLoading}
      />
      <div className="knowledge-playground-result" role="status" aria-live="polite">
        <span>{copy.result}</span>
        <output>
          {report.cycleTimeMinutes == null
            ? '—'
            : formatter.format(report.cycleTimeMinutes)}{' '}
          <small>{copy.minutes}</small>
        </output>
      </div>
    </section>
  );
}
