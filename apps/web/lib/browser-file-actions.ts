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

export async function downloadJpegFromImageDataUri(
  filename: string,
  dataUri: string,
  quality = 0.92,
) {
  const image = new Image();
  image.decoding = 'async';
  image.src = dataUri;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas export is not supported by this browser.');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0);
  const jpegDataUri = canvas.toDataURL('image/jpeg', quality);
  downloadDataUriFile(filename, jpegDataUri);
}

export function downloadJsonFile(filename: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Opens a print-ready preview so the browser can save the diagram as PDF. */
export function printImageDataUri(dataUri: string, title: string) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) throw new Error('The browser blocked the print preview window.');
  printWindow.opener = null;
  const image = printWindow.document.createElement('img');
  image.src = dataUri;
  image.alt = title;
  image.style.maxWidth = '100%';
  image.style.height = 'auto';
  image.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
  printWindow.document.title = title;
  printWindow.document.body.style.margin = '0';
  printWindow.document.body.style.padding = '24px';
  printWindow.document.body.append(image);
}
