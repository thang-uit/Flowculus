import type { EdgeAttachmentSide, ProcessEdge } from '@flowculus/process-model';

const COORDINATES: Record<EdgeAttachmentSide, readonly [number, number]> = {
  top: [0.5, 0],
  right: [1, 0.5],
  bottom: [0.5, 1],
  left: [0, 0.5],
};
const valueOf = (style: string, key: string) =>
  style
    .split(';')
    .reverse()
    .find((part) => part.startsWith(`${key}=`))
    ?.slice(key.length + 1);

/** Only exact cardinal constraints are representable; arbitrary ports stay in source XML. */
export function readEdgeAttachment(
  style: string,
  end: 'exit' | 'entry',
): EdgeAttachmentSide | undefined {
  const x = valueOf(style, `${end}X`);
  const y = valueOf(style, `${end}Y`);
  if (
    x === undefined ||
    y === undefined ||
    Number(valueOf(style, `${end}Dx`) ?? 0) !== 0 ||
    Number(valueOf(style, `${end}Dy`) ?? 0) !== 0
  )
    return undefined;
  return (Object.keys(COORDINATES) as EdgeAttachmentSide[]).find(
    (side) => COORDINATES[side][0] === Number(x) && COORDINATES[side][1] === Number(y),
  );
}

export function patchEdgeAttachment(
  style: string,
  end: 'exit' | 'entry',
  side?: EdgeAttachmentSide,
): string {
  const keys = new Set(['X', 'Y', 'Dx', 'Dy', 'Perimeter'].map((key) => `${end}${key}`));
  const portKey = end === 'exit' ? 'sourcePort' : 'targetPort';
  const parts = style
    .split(';')
    .filter(
      (part) => part && !keys.has(part.split('=')[0]) && part.split('=')[0] !== portKey,
    );
  if (side) {
    const [x, y] = COORDINATES[side];
    parts.push(
      `${end}X=${x}`,
      `${end}Y=${y}`,
      `${end}Dx=0`,
      `${end}Dy=0`,
      `${end}Perimeter=0`,
    );
  }
  return `${parts.join(';')};`;
}

export function patchEdgeRouteStyle(
  style: string,
  edge: ProcessEdge,
  original: ProcessEdge['routing'],
): string {
  let result = style;
  if ((edge.routing?.style ?? 'orthogonal') !== (original?.style ?? 'orthogonal')) {
    const keys = new Set([
      'edgeStyle',
      'curved',
      'rounded',
      'orthogonalLoop',
      'jettySize',
    ]);
    result = `${result
      .split(';')
      .filter((part) => part && !keys.has(part.split('=')[0]))
      .join(';')};`;
    result +=
      edge.routing?.style === 'curved'
        ? 'edgeStyle=none;curved=1;rounded=0;'
        : edge.routing?.style === 'straight'
          ? 'edgeStyle=none;rounded=0;'
          : 'edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;';
  }
  if (edge.routing?.sourceSide !== original?.sourceSide)
    result = patchEdgeAttachment(result, 'exit', edge.routing?.sourceSide);
  if (edge.routing?.targetSide !== original?.targetSide)
    result = patchEdgeAttachment(result, 'entry', edge.routing?.targetSide);
  return result;
}
