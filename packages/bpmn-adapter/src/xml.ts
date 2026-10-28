import {
  getDocumentRoot,
  getXmlAttribute,
  parseXml,
  type XmlElement,
} from '@flowculus/xml-tree';

export const BPMN_NS = 'http://www.omg.org/spec/BPMN/20100524/MODEL';
export const DI_NS = 'http://www.omg.org/spec/BPMN/20100524/DI';
export const FC_NS = 'https://flowculus.vercel.app/schema/bpmn/1';
export const localName = (element: XmlElement) => element.name.split(':').at(-1)!;
export const attr = getXmlAttribute;
export const children = (element: XmlElement) =>
  element.children.filter((node): node is XmlElement => node.kind === 'element');
export const text = (element: XmlElement): string =>
  element.children
    .map((node) => (node.kind === 'text' || node.kind === 'cdata' ? node.value : ''))
    .join('')
    .trim();
export class BpmnFormatError extends Error {
  constructor(
    public readonly code: 'invalid' | 'unsupported' | 'limit',
    public readonly elementId?: string,
  ) {
    super(`bpmn-${code}`);
    this.name = 'BpmnFormatError';
  }
}

/** Bound untrusted XML before recursion; no declarations, entity resolution or remote resources. */
export function readBpmnXml(source: string) {
  if (source.length > 10_000_000) throw new BpmnFormatError('limit');
  if (/<!DOCTYPE|<!ENTITY/i.test(source)) throw new BpmnFormatError('invalid');
  let root: XmlElement;
  try {
    root = getDocumentRoot(parseXml(source));
  } catch {
    throw new BpmnFormatError('invalid');
  }
  const entries: XmlElement[] = [];
  const namespaces = new WeakMap<XmlElement, Record<string, string>>();
  const stack: Array<{
    element: XmlElement;
    scope: Record<string, string>;
    depth: number;
  }> = [{ element: root, scope: {}, depth: 0 }];
  const ids = new Set<string>();
  while (stack.length) {
    const { element, scope, depth } = stack.pop()!;
    if (depth > 64 || entries.length > 40_000) throw new BpmnFormatError('limit');
    const next = { ...scope };
    const names = new Set<string>();
    for (const attribute of element.attributes) {
      if (names.has(attribute.name)) throw new BpmnFormatError('invalid');
      names.add(attribute.name);
      if (attribute.name === 'xmlns') next[''] = attribute.value;
      if (attribute.name.startsWith('xmlns:'))
        next[attribute.name.slice(6)] = attribute.value;
    }
    const id = attr(element, 'id');
    if (id) {
      if (
        ids.has(id) ||
        ['__proto__', 'constructor', 'prototype'].includes(id) ||
        !/^[\p{L}_][\p{L}\p{N}_.-]*$/u.test(id)
      )
        throw new BpmnFormatError('invalid', id);
      ids.add(id);
    }
    namespaces.set(element, next);
    entries.push(element);
    for (const child of children(element))
      stack.push({ element: child, scope: next, depth: depth + 1 });
  }
  const namespace = (element: XmlElement) =>
    namespaces.get(element)?.[
      element.name.includes(':') ? element.name.split(':')[0] : ''
    ];
  if (localName(root) !== 'definitions' || namespace(root) !== BPMN_NS)
    throw new BpmnFormatError('invalid');
  return { root, entries, namespace };
}
