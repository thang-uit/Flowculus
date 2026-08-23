import { Fragment, type ReactNode } from 'react';
import type { FormulaNode } from '@flowculus/formula-renderer';
import { formulaToText } from '@flowculus/formula-renderer';

const renderFormula = (node: FormulaNode): ReactNode => {
  switch (node.kind) {
    case 'literal':
      return <span className="formula-literal">{node.value}</span>;
    case 'sum':
      return (
        <span className="formula-group">
          {node.terms.map((term, index) => (
            <Fragment key={`sum-${index}`}>
              {index > 0 ? <span className="formula-operator">+</span> : null}
              {renderFormula(term)}
            </Fragment>
          ))}
        </span>
      );
    case 'weighted':
      return (
        <span className="formula-group">
          <span className="formula-operator">(</span>
          {renderFormula(node.probability)}
          <span className="formula-operator">×</span>
          {renderFormula(node.term)}
          <span className="formula-operator">)</span>
        </span>
      );
    case 'maximum':
      return (
        <span className="formula-group">
          <span className="formula-function">max</span>
          <span className="formula-operator">(</span>
          {node.terms.map((term, index) => (
            <Fragment key={`max-${index}`}>
              {index > 0 ? <span className="formula-operator">,</span> : null}
              {renderFormula(term)}
            </Fragment>
          ))}
          <span className="formula-operator">)</span>
        </span>
      );
    case 'fraction':
      return (
        <span className="formula-fraction" aria-hidden="true">
          <span className="formula-fraction-part">{renderFormula(node.numerator)}</span>
          <span className="formula-fraction-part">{renderFormula(node.denominator)}</span>
        </span>
      );
    case 'difference':
      return (
        <span className="formula-group">
          <span className="formula-operator">(</span>
          {renderFormula(node.minuend)}
          <span className="formula-operator">) - (</span>
          {renderFormula(node.subtrahend)}
          <span className="formula-operator">)</span>
        </span>
      );
    case 'product':
      return (
        <span className="formula-group">
          {node.factors.map((factor, index) => (
            <Fragment key={`product-${index}`}>
              {index > 0 ? <span className="formula-operator">×</span> : null}
              {renderFormula(factor)}
            </Fragment>
          ))}
        </span>
      );
  }
};

export function FormulaMath({ formula }: Readonly<{ formula?: FormulaNode }>) {
  if (!formula) return null;
  const text = formulaToText(formula);

  return (
    <span role="math" aria-label={text} className="formula-math">
      {renderFormula(formula)}
    </span>
  );
}
