export type FormulaNode =
  | { kind: 'literal'; value: string }
  | { kind: 'sum'; terms: FormulaNode[] }
  | { kind: 'weighted'; probability: FormulaNode; term: FormulaNode }
  | { kind: 'maximum'; terms: FormulaNode[] }
  | { kind: 'fraction'; numerator: FormulaNode; denominator: FormulaNode }
  | { kind: 'difference'; minuend: FormulaNode; subtrahend: FormulaNode }
  | { kind: 'product'; factors: FormulaNode[] };

export function formulaToText(node: FormulaNode): string {
  switch (node.kind) {
    case 'literal':
      return node.value;
    case 'sum':
      return node.terms.map(formulaToText).join(' + ');
    case 'weighted':
      return `(${formulaToText(node.probability)} × ${formulaToText(node.term)})`;
    case 'maximum':
      return `max(${node.terms.map(formulaToText).join(', ')})`;
    case 'fraction':
      return `(${formulaToText(node.numerator)}) / (${formulaToText(node.denominator)})`;
    case 'difference':
      return `(${formulaToText(node.minuend)}) - (${formulaToText(node.subtrahend)})`;
    case 'product':
      return node.factors.map(formulaToText).join(' × ');
  }
}

/**
 * A small KaTeX-compatible renderer boundary. The web layer may pass this
 * string to KaTeX later; the domain package intentionally has no DOM or React
 * dependency.
 */
export function formulaToLatex(node: FormulaNode): string {
  switch (node.kind) {
    case 'literal':
      return node.value.replaceAll('×', '\\times ').replaceAll(' ', '\\,');
    case 'sum':
      return node.terms.map(formulaToLatex).join(' + ');
    case 'weighted':
      return `\\left(${formulaToLatex(node.probability)} \\times ${formulaToLatex(node.term)}\\right)`;
    case 'maximum':
      return `\\max\\left(${node.terms.map(formulaToLatex).join(', ')}\\right)`;
    case 'fraction':
      return `\\frac{${formulaToLatex(node.numerator)}}{${formulaToLatex(node.denominator)}}`;
    case 'difference':
      return `\\left(${formulaToLatex(node.minuend)}\\right) - \\left(${formulaToLatex(node.subtrahend)}\\right)`;
    case 'product':
      return node.factors.map(formulaToLatex).join(' \\times ');
  }
}
