import { describe, expect, it } from 'vitest';

import {
  XmlParseError,
  createXmlElement,
  findFirstElement,
  getDocumentRoot,
  getXmlAttribute,
  getXmlTextContent,
  parseXml,
  serializeXml,
  setXmlAttribute,
} from './index';

describe('xml-tree', () => {
  it('parses elements, attributes, entities and self-closing tags', () => {
    const document = parseXml(
      '<?xml version="1.0"?><root a="1 &amp; 2" b=\'x&#xa;y\'><child label="&lt;b&gt;Hi&lt;/b&gt;" /><text>a &lt; b</text></root>',
    );
    const root = getDocumentRoot(document);
    expect(root.name).toBe('root');
    expect(getXmlAttribute(root, 'a')).toBe('1 & 2');
    expect(getXmlAttribute(root, 'b')).toBe('x\ny');
    expect(getXmlAttribute(findFirstElement(root, 'child')!, 'label')).toBe('<b>Hi</b>');
    expect(getXmlTextContent(findFirstElement(root, 'text')!)).toBe('a < b');
  });

  it('round-trips comments, CDATA, doctype and whitespace', () => {
    const source =
      '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE note [<!ENTITY x "y">]>\n<root>\n  <!-- keep me -->\n  <![CDATA[<raw>]]>\n  <leaf value="a&#xa;b" />\n</root>\n';
    const serialized = serializeXml(parseXml(source));
    expect(serialized).toContain('<!-- keep me -->');
    expect(serialized).toContain('<![CDATA[<raw>]]>');
    expect(serialized).toContain('<!DOCTYPE note [<!ENTITY x "y">]>');
    expect(serialized).toContain('value="a&#xa;b"');
    expect(serializeXml(parseXml(serialized))).toBe(serialized);
  });

  it('edits attributes in place and creates elements', () => {
    const document = parseXml('<root><cell id="1" style="a" /></root>');
    const cell = findFirstElement(getDocumentRoot(document), 'cell')!;
    setXmlAttribute(cell, 'style', undefined);
    setXmlAttribute(cell, 'value', 'Ready "now"');
    getDocumentRoot(document).children.push(createXmlElement('cell', { id: 2, x: 10 }));
    expect(serializeXml(document)).toBe(
      '<root><cell id="1" value="Ready &quot;now&quot;" /><cell id="2" x="10" /></root>',
    );
  });

  it('rejects malformed documents with a positioned error', () => {
    expect(() => parseXml('<root><a></root>')).toThrow(XmlParseError);
    expect(() => parseXml('<root>')).toThrow(/Unclosed element/);
    expect(() => parseXml('plain text')).toThrow(XmlParseError);
    expect(() => parseXml('<a/><b/>')).toThrow(/Multiple root/);
  });
});
