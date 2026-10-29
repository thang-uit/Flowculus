import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { handDrawnSamples } from './hand-drawn-samples.mjs';

const DEMO_GLYPHS = {
  0: ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  1: ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  2: ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  3: ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  4: ['10010', '10010', '10010', '11111', '00010', '00010', '00010'],
  5: ['11111', '10000', '10000', '11110', '00001', '00001', '11110'],
  6: ['01111', '10000', '10000', '11110', '10001', '10001', '01110'],
  7: ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  8: ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  9: ['01110', '10001', '10001', '01111', '00001', '00001', '11110'],
  h: ['10000', '10000', '10110', '11001', '10001', '10001', '10001'],
};
const bitmapHours = (hours, centerX, top, scale = 5) => {
  const text = `${hours}h`;
  const width = (text.length * 6 - 1) * scale;
  const left = centerX - width / 2;
  return [...text]
    .flatMap((character, at) =>
      DEMO_GLYPHS[character].flatMap((row, y) =>
        [...row].flatMap((bit, x) =>
          bit === '1'
            ? [
                `<rect x="${left + (at * 6 + x) * scale}" y="${top + y * scale}" width="${scale}" height="${scale}" fill="#8a5a00"/>`,
              ]
            : [],
        ),
      ),
    )
    .join('');
};
const imageSample = (title, values) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="520" viewBox="0 0 1500 520">
  <rect width="1500" height="520" fill="#fbfaf7"/>
  <text x="70" y="72" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#1f2937">${title}</text>
  <text x="70" y="112" font-family="Arial, sans-serif" font-size="18" fill="#667085">Flowculus image trace demo · review detected hours before import</text>
  ${values
    .map((value, index) => {
      const x = 80 + index * 350;
      return `<g><rect x="${x}" y="210" width="250" height="120" rx="14" fill="#fff3bf" stroke="#d79b00" stroke-width="4"/><text x="${x + 125}" y="258" text-anchor="middle" font-family="Arial, sans-serif" font-size="25" font-weight="700" fill="#1f2937">${value.label}</text>${bitmapHours(value.hours, x + 125, 278)}${index < values.length - 1 ? `<path d="M${x + 250} 270 H${x + 330}" stroke="#667085" stroke-width="5" fill="none" marker-end="url(#arrow)"/>` : ''}</g>`;
    })
    .join('')}
  <defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#667085"/></marker></defs>
</svg>`;
export const writeImageSamples = (target) => {
  const dir = resolve(target, '00_image_samples');
  mkdirSync(dir, { recursive: true });
  const samples = {
    ...handDrawnSamples(),
    '01_as_is_hours.svg': imageSample('Ảnh mẫu · As-Is', [
      { label: 'Phân tích yêu cầu', hours: 8 },
      { label: 'Backend', hours: 24 },
      { label: 'Mobile', hours: 16 },
      { label: 'Kiểm thử', hours: 8 },
    ]),
    '02_to_be_hours.svg': imageSample('Ảnh mẫu · To-Be', [
      { label: 'Backend', hours: 24 },
      { label: 'Mobile', hours: 16 },
      { label: 'QA chuẩn bị', hours: 5 },
      { label: 'Kiểm thử', hours: 3 },
    ]),
  };
  const hashes = {};
  for (const [fileName, content] of Object.entries(samples)) {
    const svgPath = resolve(dir, fileName);
    writeFileSync(svgPath, content);
    hashes[`00_image_samples/${fileName}`] = createHash('sha256')
      .update(content)
      .digest('hex');
    try {
      const pngPath = svgPath.replace(/\.svg$/, '.png');
      execFileSync('sips', ['-s', 'format', 'png', svgPath, '--out', pngPath], {
        stdio: 'ignore',
      });
      hashes[`00_image_samples/${fileName.replace(/\.svg$/, '.png')}`] = createHash(
        'sha256',
      )
        .update(readFileSync(pngPath))
        .digest('hex');
    } catch {
      console.warn(`PNG conversion unavailable for ${fileName}. SVG source exported.`);
    }
  }
  const readme = `# Ảnh mẫu Image Trace / Image Trace samples

Tải tệp PNG lên, kiểm tra từng hình và đường nối, rồi rà số giờ trước khi tạo bản nháp.

| Tệp | Bài kiểm tra | Hình / đường nối mục tiêu | Giờ xử lý sau khi rà |
| --- | --- | --- | --- |
| 01_as_is_hours.png | Nhãn in rõ | 4 / 3 | 8, 24, 16, 8 |
| 02_to_be_hours.png | Nhãn in rõ | 4 / 3 | 24, 16, 5, 3 |
| 03_hand_drawn_sequence.png | Nét bút và chữ viết tay | 3 / 2 | A=2, B=3, C=4 |
| 04_hand_drawn_xor.png | Vẽ tay có sự kiện và gateway | 7 / 7 | A=2, B=3, C=5 |
| 05_hand_drawn_photo.png | Mô phỏng scan nghiêng, bóng và nhiễu | 3 / 2 | A=2, B=3, C=4 |
| 06_hand_drawn_decimal.png | Số thập phân viết tay | 3 / 2 | A=2.5, B=3, C=4 |

Ảnh 01 và 02 cho CT/TCT lần lượt 56 và 48 giờ. Các mẫu 03–06 là sơ đồ tổng hợp mô phỏng nét bút, không phải ảnh chụp của người thật. Nhận dạng hình học và đọc chữ là hai việc khác nhau. Chữ viết tay có thể không tự điền giờ, cần nhập vào trường Thời gian xử lý (giờ). Rà tên, loại gateway, chiều đường nối và mọi giá trị nhận được.

Với mẫu 03 hoặc 05, nhập đủ thời gian sẽ cho CT/TCT 9 giờ. Mẫu 06 cần nhập A=2.5 giờ để có 9.5 giờ. Với mẫu 04, xác nhận cả hai gateway là XOR và đặt hai nhánh 50%/50% để có CT/TCT 6 giờ. Không tính mẫu XOR khi chưa xác định xác suất và ngữ nghĩa tách/gộp.

Nguồn SVG dùng hình học và hạt nhiễu có seed cố định. Font viết tay dùng Noteworthy hoặc font cursive dự phòng của hệ điều hành, nên nét chữ khi render lại có thể khác máy. PNG trong bộ hiện tại được render bằng sips trên macOS. Bộ sinh mẫu không nằm trong web bundle và không thêm font vào ứng dụng.

## English

These are synthetic recognition exercises, separate from the full report models. Samples 01–02 use printed hour labels. Samples 03–06 use uneven pen outlines and system handwriting fonts. Sample 05 adds skew, a light shadow and deterministic noise. They are not photographs or evidence of real-world handwriting accuracy.

Review shapes, connections and every recognised value. Handwritten hours may require manual entry. Sequential reviewed totals are 56h, 48h, 9h, 9h and 9.5h for samples 01, 02, 03, 05 and 06. Sample 04 yields 6h only after confirming XOR split/merge semantics and assigning 50% to each branch. Use the full .flowculus.json models for the report's 101.2h and 49.6h results.

SVG geometry and noise are seeded. System font rendering may vary. PNG conversion uses macOS sips when available, with a visible warning otherwise.\n`;
  writeFileSync(resolve(dir, 'README.md'), readme);
  hashes['00_image_samples/README.md'] = createHash('sha256')
    .update(readme)
    .digest('hex');
  return hashes;
};
