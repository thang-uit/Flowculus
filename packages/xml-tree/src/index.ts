/**
 * A small, dependency-free XML tree used by the draw.io and XES adapters.
 *
 * The browser `DOMParser` is not available in Web Workers or in the Node test
 * runner, so domain packages use this tolerant reader instead. It keeps the
 * document order, comments, processing instructions and whitespace so a
 * parse → serialize round trip does not drop unknown content.
 */

export interface XmlAttribute {
  name: string;
  value: string;
}

export interface XmlElement {
  kind: 'element';
  name: string;
  attributes: XmlAttribute[];
  children: XmlNode[];
}

export interface XmlText {
  kind: 'text';
  value: string;
}

export interface XmlComment {
  kind: 'comment';
  value: string;
}

export interface XmlCdata {
  kind: 'cdata';
  value: string;
}

/** Processing instructions and DOCTYPE declarations, kept verbatim. */
export interface XmlRaw {
  kind: 'raw';
  value: string;
}

export type XmlNode = XmlElement | XmlText | XmlComment | XmlCdata | XmlRaw;

export interface XmlDocument {
  children: XmlNode[];
}

export class XmlParseError extends Error {
  readonly position: number;

  constructor(message: string, position: number) {
    super(`${message} (at character ${position})`);
    this.name = 'XmlParseError';
    this.position = position;
  }
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
};

export const decodeXmlEntities = (value: string): string =>
  value.includes('&')
    ? value.replace(
        /&(#x[0-9a-f]+|#[0-9]+|[a-z][a-z0-9]*);/gi,
        (match, entity: string) => {
          if (entity.startsWith('#x') || entity.startsWith('#X')) {
            const codePoint = Number.parseInt(entity.slice(2), 16);
            return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
          }
          if (entity.startsWith('#')) {
            const codePoint = Number.parseInt(entity.slice(1), 10);
            return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
          }
          return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
        },
      )
    : value;

export const escapeXmlAttribute = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\n', '&#xa;')
    .replaceAll('\r', '&#xd;')
    .replaceAll('\t', '&#x9;');

export const escapeXmlText = (value: string): string =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

const isWhitespace = (character: string | undefined): boolean =>
  character === ' ' || character === '\n' || character === '\r' || character === '\t';

const isNameTerminator = (character: string | undefined): boolean =>
  character == null ||
  isWhitespace(character) ||
  character === '=' ||
  character === '/' ||
  character === '>';

/** Parses an XML string into a mutable tree. Throws `XmlParseError` when malformed. */
export const parseXml = (source: string): XmlDocument => {
  const input = source.replace(/^﻿/, '');
  const document: XmlDocument = { children: [] };
  const stack: XmlElement[] = [];
  const length = input.length;
  let index = 0;

  const currentChildren = (): XmlNode[] =>
    stack.length > 0 ? stack[stack.length - 1].children : document.children;

  const readUntil = (terminator: string, start: number, label: string): number => {
    const end = input.indexOf(terminator, start);
    if (end < 0) throw new XmlParseError(`Unterminated ${label}`, start);
    return end;
  };

  while (index < length) {
    const character = input[index];
    if (character !== '<') {
      const next = input.indexOf('<', index);
      const end = next < 0 ? length : next;
      const raw = input.slice(index, end);
      if (stack.length === 0 && raw.trim().length > 0) {
        throw new XmlParseError('Text outside the root element', index);
      }
      currentChildren().push({ kind: 'text', value: decodeXmlEntities(raw) });
      index = end;
      continue;
    }

    if (input.startsWith('<!--', index)) {
      const end = readUntil('-->', index + 4, 'comment');
      currentChildren().push({ kind: 'comment', value: input.slice(index + 4, end) });
      index = end + 3;
      continue;
    }

    if (input.startsWith('<![CDATA[', index)) {
      const end = readUntil(']]>', index + 9, 'CDATA section');
      currentChildren().push({ kind: 'cdata', value: input.slice(index + 9, end) });
      index = end + 3;
      continue;
    }

    if (input.startsWith('<?', index)) {
      const end = readUntil('?>', index + 2, 'processing instruction');
      currentChildren().push({ kind: 'raw', value: input.slice(index, end + 2) });
      index = end + 2;
      continue;
    }

    if (input.startsWith('<!', index)) {
      let cursor = index + 2;
      let depth = 0;
      while (cursor < length) {
        const value = input[cursor];
        if (value === '[') depth += 1;
        else if (value === ']') depth -= 1;
        else if (value === '>' && depth <= 0) break;
        cursor += 1;
      }
      if (cursor >= length) throw new XmlParseError('Unterminated declaration', index);
      currentChildren().push({ kind: 'raw', value: input.slice(index, cursor + 1) });
      index = cursor + 1;
      continue;
    }

    if (input.startsWith('</', index)) {
      const end = readUntil('>', index + 2, 'closing tag');
      const name = input.slice(index + 2, end).trim();
      const open = stack.pop();
      if (!open || open.name !== name) {
        throw new XmlParseError(
          `Unexpected closing tag </${name}>${open ? `; expected </${open.name}>` : ''}`,
          index,
        );
      }
      index = end + 1;
      continue;
    }

    // Start tag.
    let cursor = index + 1;
    while (!isNameTerminator(input[cursor])) cursor += 1;
    const name = input.slice(index + 1, cursor);
    if (!name) throw new XmlParseError('Missing element name', index);
    const element: XmlElement = { kind: 'element', name, attributes: [], children: [] };
    let selfClosing = false;

    while (cursor < length) {
      while (isWhitespace(input[cursor])) cursor += 1;
      const value = input[cursor];
      if (value === '>') {
        cursor += 1;
        break;
      }
      if (value === '/' && input[cursor + 1] === '>') {
        selfClosing = true;
        cursor += 2;
        break;
      }
      const attributeStart = cursor;
      while (!isNameTerminator(input[cursor])) cursor += 1;
      const attributeName = input.slice(attributeStart, cursor);
      if (!attributeName) throw new XmlParseError('Malformed attribute', cursor);
      while (isWhitespace(input[cursor])) cursor += 1;
      if (input[cursor] !== '=') {
        // Tolerate value-less attributes from hand-written files.
        element.attributes.push({ name: attributeName, value: '' });
        continue;
      }
      cursor += 1;
      while (isWhitespace(input[cursor])) cursor += 1;
      const quote = input[cursor];
      if (quote !== '"' && quote !== "'") {
        throw new XmlParseError(`Attribute ${attributeName} is not quoted`, cursor);
      }
      const valueEnd = input.indexOf(quote, cursor + 1);
      if (valueEnd < 0) throw new XmlParseError('Unterminated attribute value', cursor);
      element.attributes.push({
        name: attributeName,
        value: decodeXmlEntities(input.slice(cursor + 1, valueEnd)),
      });
      cursor = valueEnd + 1;
    }

    if (stack.length === 0 && document.children.some((node) => node.kind === 'element')) {
      throw new XmlParseError('Multiple root elements', index);
    }
    currentChildren().push(element);
    if (!selfClosing) stack.push(element);
    index = cursor;
  }

  if (stack.length > 0) {
    throw new XmlParseError(`Unclosed element <${stack[stack.length - 1].name}>`, length);
  }
  if (!document.children.some((node) => node.kind === 'element')) {
    throw new XmlParseError('The document has no root element', 0);
  }
  return document;
};

const serializeNode = (node: XmlNode): string => {
  switch (node.kind) {
    case 'text':
      return escapeXmlText(node.value);
    case 'comment':
      return `<!--${node.value}-->`;
    case 'cdata':
      return `<![CDATA[${node.value}]]>`;
    case 'raw':
      return node.value;
    case 'element': {
      const attributes = node.attributes
        .map((attribute) => ` ${attribute.name}="${escapeXmlAttribute(attribute.value)}"`)
        .join('');
      if (node.children.length === 0) return `<${node.name}${attributes} />`;
      return `<${node.name}${attributes}>${node.children.map(serializeNode).join('')}</${node.name}>`;
    }
  }
};

export const serializeXml = (document: XmlDocument): string =>
  document.children.map(serializeNode).join('');

export const serializeXmlElement = (element: XmlElement): string =>
  serializeNode(element);

export const getDocumentRoot = (document: XmlDocument): XmlElement => {
  const root = document.children.find(
    (node): node is XmlElement => node.kind === 'element',
  );
  if (!root) throw new XmlParseError('The document has no root element', 0);
  return root;
};

export const createXmlElement = (
  name: string,
  attributes: Record<string, string | number | undefined> = {},
  children: XmlNode[] = [],
): XmlElement => ({
  kind: 'element',
  name,
  attributes: Object.entries(attributes)
    .filter((entry): entry is [string, string | number] => entry[1] != null)
    .map(([attributeName, value]) => ({ name: attributeName, value: String(value) })),
  children,
});

export const getXmlAttribute = (element: XmlElement, name: string): string | undefined =>
  element.attributes.find((attribute) => attribute.name === name)?.value;

/** Sets, replaces or (with `undefined`/empty) removes an attribute in place. */
export const setXmlAttribute = (
  element: XmlElement,
  name: string,
  value: string | number | undefined,
): void => {
  const index = element.attributes.findIndex((attribute) => attribute.name === name);
  if (value == null || value === '') {
    if (index >= 0) element.attributes.splice(index, 1);
    return;
  }
  if (index >= 0) element.attributes[index] = { name, value: String(value) };
  else element.attributes.push({ name, value: String(value) });
};

export const getChildElements = (element: XmlElement, name?: string): XmlElement[] =>
  element.children.filter(
    (node): node is XmlElement =>
      node.kind === 'element' && (name == null || node.name === name),
  );

export const findFirstElement = (
  element: XmlElement,
  name: string,
): XmlElement | undefined => {
  for (const child of element.children) {
    if (child.kind !== 'element') continue;
    if (child.name === name) return child;
    const nested = findFirstElement(child, name);
    if (nested) return nested;
  }
  return undefined;
};

/** Depth-first walk over every element below (and including) `element`. */
export const walkXmlElements = (
  element: XmlElement,
  visit: (current: XmlElement, parent: XmlElement | null) => void,
  parent: XmlElement | null = null,
): void => {
  visit(element, parent);
  for (const child of element.children) {
    if (child.kind === 'element') walkXmlElements(child, visit, element);
  }
};

export const getXmlTextContent = (element: XmlElement): string =>
  element.children
    .map((child) => {
      if (child.kind === 'text' || child.kind === 'cdata') return child.value;
      if (child.kind === 'element') return getXmlTextContent(child);
      return '';
    })
    .join('');
