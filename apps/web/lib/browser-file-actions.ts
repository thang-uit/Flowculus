export function downloadTextFile(
  filename: string,
  value: string,
  mimeType = 'text/plain',
) {
  const blob = new Blob([value], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function downloadDataUriFile(filename: string, dataUri: string) {
  const anchor = document.createElement('a');
  anchor.href = dataUri;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
}
