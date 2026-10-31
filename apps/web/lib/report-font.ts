/** Reuse the application's local variable font in portable reports. */
let embeddedFont: Promise<string> | null = null;

async function readReportFont(): Promise<string> {
  const faces: Array<{ css: string; base: string }> = [];
  for (const sheet of document.styleSheets) {
    const base = sheet.href ?? location.href;
    if (new URL(base, location.href).origin !== location.origin) continue;
    for (const rule of sheet.cssRules) {
      if (
        rule instanceof CSSFontFaceRule &&
        rule.style.fontFamily.includes('Plus Jakarta Sans Variable')
      )
        faces.push({ css: rule.cssText, base });
    }
  }
  if (!faces.length || faces.length > 8) throw new Error('report-font-unavailable');
  let totalBytes = 0;
  const styles: string[] = [];
  const binaries = new Map<string, string>();
  for (const { css, base } of faces) {
    let embedded = css;
    const urls = [...css.matchAll(/url\(["']?([^\s"')]+)["']?\)/g)];
    for (const match of urls) {
      const url = new URL(match[1], base);
      if (url.origin !== location.origin) throw new Error('report-font-origin');
      let dataUrl = binaries.get(url.href);
      if (!dataUrl) {
        const response = await fetch(url.href, { signal: AbortSignal.timeout(10000) });
        if (!response.ok) throw new Error('report-font-unavailable');
        const buffer = await response.arrayBuffer();
        totalBytes += buffer.byteLength;
        if (totalBytes > 1_000_000) throw new Error('report-font-limit');
        let binary = '';
        for (const byte of new Uint8Array(buffer)) binary += String.fromCharCode(byte);
        dataUrl = `data:font/woff2;base64,${btoa(binary)}`;
        binaries.set(url.href, dataUrl);
      }
      embedded = embedded.replace(match[0], `url("${dataUrl}")`);
    }
    styles.push(embedded);
  }
  return styles.join('\n');
}

export function embeddedReportFont(): Promise<string> {
  if (!embeddedFont)
    embeddedFont = readReportFont().catch((reason: unknown) => {
      embeddedFont = null;
      throw reason;
    });
  return embeddedFont;
}
