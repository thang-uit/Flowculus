/** Authored notation only. Numeric evaluation remains owned by analysis-engine. */
export type MathNode =
  | string
  | {
      tag:
        | 'mrow'
        | 'mi'
        | 'mn'
        | 'mo'
        | 'mtext'
        | 'msub'
        | 'msup'
        | 'mfrac'
        | 'munderover'
        | 'munder';
      children: MathNode[];
    };
const el = (
  tag: Exclude<MathNode, string>['tag'],
  ...children: MathNode[]
): MathNode => ({ tag, children });
const v = (s: string) => el('mi', s);
const n = (s: string) => el('mn', s);
const o = (s: string) => el('mo', s);
const r = (...nodes: MathNode[]) => el('mrow', ...nodes);
const sub = (name: string, index: string) => el('msub', v(name), v(index));
const pow = (base: MathNode, power: string) =>
  el('msup', base, /^\d+$/.test(power) ? n(power) : v(power));
const frac = (top: MathNode, bottom: MathNode) => el('mfrac', top, bottom);
const par = (...nodes: MathNode[]) => r(o('('), ...nodes, o(')'));
const eq = (a: MathNode, b: MathNode) => r(a, o('='), b);
const sum = (under: MathNode, term: MathNode, upper?: MathNode) =>
  r(upper ? el('munderover', o('∑'), under, upper) : el('munder', o('∑'), under), term);
const product = (under: MathNode, term: MathNode) => r(el('munder', o('∏'), under), term);
const oneMinusR = r(n('1'), o('−'), v('r'));
const expectation = (symbol: string) => r(v('E'), o('['), v(symbol), o(']'));
const maximum = (under: MathNode, term: MathNode) =>
  r(el('munder', el('mi', 'max'), under), par(term));
const selected = r(v('S'), o('≠'), o('∅'));
const probability = r(
  v('P'),
  par(v('𝒮'), o('='), v('S'), o('|'), v('𝒮'), o('≠'), o('∅')),
);
const denominatorOR = r(
  n('1'),
  o('−'),
  product(v('i'), par(n('1'), o('−'), sub('p', 'i'))),
);
const rate = frac(v('λ'), v('μ'));
const rhoGap = r(n('1'), o('−'), v('ρ'));
const ac = pow(v('a'), 'c');
const factorialC = r(v('c'), o('!'));

export const KNOWLEDGE_MATH = {
  activity: [eq(v('CT'), v('D')), eq(v('CT'), r(v('T'), o('+'), sub('W', 'q')))],
  sequence: [
    eq(sub('CT', 'seq'), sum(eq(v('i'), n('1')), sub('CT', 'i'), v('n'))),
    eq(
      sub('CT', 'XOR'),
      sum(eq(v('i'), n('1')), r(sub('p', 'i'), o('·'), sub('CT', 'i')), v('n')),
    ),
    eq(sum(eq(v('i'), n('1')), sub('p', 'i'), v('n')), n('1')),
  ],
  parallel: [
    eq(
      sub('CT', 'AND'),
      maximum(r(n('1'), o('≤'), v('i'), o('≤'), v('n')), sub('CT', 'i')),
    ),
    eq(sub('C', 'AND'), sum(v('i'), sub('C', 'i'))),
  ],
  inclusive: [
    eq(
      sub('CT', 'OR'),
      sum(
        selected,
        r(probability, o('·'), maximum(r(v('i'), o('∈'), v('S')), sub('CT', 'i'))),
      ),
    ),
    eq(
      probability,
      frac(
        r(
          product(r(v('i'), o('∈'), v('S')), sub('p', 'i')),
          o('·'),
          product(r(v('j'), o('∉'), v('S')), par(n('1'), o('−'), sub('p', 'j'))),
        ),
        denominatorOR,
      ),
    ),
  ],
  once: [
    eq(expectation('CT'), r(sub('τ', '0'), o('+'), v('r'), o('·'), sub('τ', 'r'))),
    eq(expectation('CT'), r(par(n('1'), o('+'), v('r')), o('·'), v('τ'))),
  ],
  repeated: [
    eq(expectation('N'), frac(n('1'), oneMinusR)),
    eq(expectation('CT'), frac(v('τ'), oneMinusR)),
    r(n('0'), o('≤'), v('r'), o('<'), n('1')),
  ],
  efficiency: [
    eq(v('CTE'), frac(v('TCT'), v('CT'))),
    eq(sub('CTE', '%'), r(frac(v('TCT'), v('CT')), o('×'), n('100'), o('%'))),
  ],
  cost: [eq(v('C'), r(frac(v('T'), n('60')), o('·'), v('h'), o('+'), sub('C', 'other')))],
  cpm: [
    eq(sub('ES', 'i'), maximum(r(v('j'), o('∈'), sub('Pred', 'i')), sub('EF', 'j'))),
    eq(sub('EF', 'i'), r(sub('ES', 'i'), o('+'), sub('T', 'i'))),
    eq(sub('Slack', 'i'), r(sub('LS', 'i'), o('−'), sub('ES', 'i'))),
  ],
  capacity: [
    eq(sub('Capacity', 'day'), frac(r(v('c'), o('·'), v('H'), o('·'), n('60')), v('U'))),
    eq(v('ρ'), frac(r(v('λ'), o('·'), v('U')), r(n('60'), o('·'), v('c')))),
  ],
  mm1: [
    eq(v('ρ'), rate),
    eq(sub('L', 'q'), frac(pow(v('ρ'), '2'), rhoGap)),
    eq(sub('W', 'q'), frac(sub('L', 'q'), v('λ'))),
    eq(v('W'), r(sub('W', 'q'), o('+'), frac(n('1'), v('μ')))),
  ],
  mmc: [
    eq(v('a'), rate),
    eq(v('ρ'), frac(v('a'), v('c'))),
    eq(
      sub('P', '0'),
      frac(
        n('1'),
        r(
          sum(
            eq(v('k'), n('0')),
            frac(pow(v('a'), 'k'), r(v('k'), o('!'))),
            r(v('c'), o('−'), n('1')),
          ),
          o('+'),
          frac(ac, r(factorialC, par(rhoGap))),
        ),
      ),
    ),
    eq(
      sub('L', 'q'),
      frac(
        r(sub('P', '0'), o('·'), ac, o('·'), v('ρ')),
        r(factorialC, pow(par(rhoGap), '2')),
      ),
    ),
  ],
  little: [eq(v('WIP'), r(v('λ'), o('·'), v('CT'))), eq(v('CT'), frac(v('WIP'), v('λ')))],
  paths: [
    eq(r(v('P'), par(v('end'))), n('1')),
    eq(r(v('P'), par(v('v'))), sum(r(v('v'), o('→'), v('u')), r(v('P'), par(v('u'))))),
  ],
  frequency: [
    eq(r(v('f'), par(v('A'), o('→'), v('B'))), r(o('#'), par(v('A'), o('→'), v('B')))),
    eq(r(v('share'), par(v('V'))), frac(sub('n', 'V'), v('n'))),
  ],
  measurements: [
    eq(
      r(v('H'), par(v('A'), o('→'), v('B'))),
      r(
        v('max'),
        par(n('0'), o(','), sub('t', 'start,B'), o('−'), sub('t', 'complete,A')),
      ),
    ),
    eq(r(v('S'), par(v('B'))), r(sub('t', 'complete,B'), o('−'), sub('t', 'start,B'))),
  ],
  cumulative: [
    eq(sub('Total', 'i'), r(sub('mean', 'i'), o('·'), sub('n', 'i'))),
    eq(sub('share', 'i'), frac(sub('Total', 'i'), sum(v('j'), sub('Total', 'j')))),
  ],
  alpha: [
    r(
      v('A'),
      o('→'),
      v('B'),
      o('⇔'),
      v('A'),
      o('>'),
      v('B'),
      o('∧'),
      o('¬'),
      par(v('B'), o('>'), v('A')),
    ),
    r(
      v('A'),
      o('∥'),
      v('B'),
      o('⇔'),
      v('A'),
      o('>'),
      v('B'),
      o('∧'),
      v('B'),
      o('>'),
      v('A'),
    ),
    r(
      v('A'),
      o('#'),
      v('B'),
      o('⇔'),
      o('¬'),
      par(v('A'), o('>'), v('B')),
      o('∧'),
      o('¬'),
      par(v('B'), o('>'), v('A')),
    ),
  ],
} satisfies Record<string, MathNode[]>;
export type KnowledgeFormulaId = keyof typeof KNOWLEDGE_MATH;
