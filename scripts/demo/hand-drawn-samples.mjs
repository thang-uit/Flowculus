/** Reproducible synthetic pen drawings, independent of the detector's digit templates. */
const randomFor = (seed) => () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
};

function pen(points, random, { close = false, width = 3.5 } = {}) {
  const ink = [];
  const chain = close ? [...points, points[0]] : points;
  for (let at = 1; at < chain.length; at++) {
    const [x0, y0] = chain[at - 1];
    const [x1, y1] = chain[at];
    const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 22));
    for (let step = 0; step < steps; step++) {
      const t = step / steps;
      ink.push([
        +(x0 + (x1 - x0) * t + (random() - 0.5) * 3.4).toFixed(2),
        +(y0 + (y1 - y0) * t + (random() - 0.5) * 3.4).toFixed(2),
      ]);
    }
  }
  ink.push(chain.at(-1));
  return `<path d="M${ink.map((point) => point.join(' ')).join(' L')}${close ? ' Z' : ''}" fill="none" stroke="#193f89" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function arrow(points, random) {
  const [x, y] = points.at(-1);
  const [previousX, previousY] = points.at(-2);
  const angle = Math.atan2(y - previousY, x - previousX);
  return (
    pen(points, random) +
    pen(
      [
        [x - 14 * Math.cos(angle - 0.48), y - 14 * Math.sin(angle - 0.48)],
        [x, y],
        [x - 14 * Math.cos(angle + 0.48), y - 14 * Math.sin(angle + 0.48)],
      ],
      random,
    )
  );
}

function task(label, hours, x, y, random) {
  const w = 240;
  const h = 135;
  return (
    pen(
      [
        [x + 9, y],
        [x + w - 6, y + 2],
        [x + w, y + h - 6],
        [x + 5, y + h],
        [x, y + 5],
        [x + 6, y + 1],
      ],
      random,
    ) +
    `<text x="${x + w / 2}" y="${y + 47}" text-anchor="middle" class="hand label">${label}</text>` +
    `<text x="${x + w / 2}" y="${y + 105}" text-anchor="middle" class="hand hours">${hours}h</text>`
  );
}

function gateway(x, y, random) {
  return (
    pen(
      [
        [x, y - 49],
        [x + 51, y],
        [x, y + 49],
        [x - 51, y],
      ],
      random,
      { close: true },
    ) +
    pen(
      [
        [x - 10, y - 11],
        [x + 11, y + 12],
      ],
      random,
      { width: 3 },
    ) +
    pen(
      [
        [x + 11, y - 11],
        [x - 11, y + 12],
      ],
      random,
      { width: 3 },
    )
  );
}

function eventCircle(x, y, random, end = false) {
  const points = Array.from({ length: 33 }, (_, index) => {
    const angle = (index * Math.PI) / 16;
    return [x + Math.cos(angle) * 29, y + Math.sin(angle) * 28];
  });
  return pen(points, random, { width: end ? 5 : 3.5 });
}

function sequence(random, decimal = false) {
  return (
    task('A', decimal ? '2.5' : '2', 150, 245, random) +
    task('B', '3', 580, 249, random) +
    task('C', '4', 1010, 241, random) +
    arrow(
      [
        [398, 312],
        [470, 309],
        [505, 315],
        [570, 316],
      ],
      random,
    ) +
    arrow(
      [
        [829, 317],
        [905, 313],
        [957, 311],
        [1000, 309],
      ],
      random,
    )
  );
}

function choice(random) {
  return (
    eventCircle(75, 320, random) +
    task('A', '2', 160, 253, random) +
    gateway(535, 320, random) +
    task('B', '3', 705, 110, random) +
    task('C', '5', 705, 432, random) +
    gateway(1110, 320, random) +
    eventCircle(1300, 320, random, true) +
    arrow(
      [
        [110, 320],
        [148, 320],
      ],
      random,
    ) +
    arrow(
      [
        [410, 320],
        [475, 320],
      ],
      random,
    ) +
    arrow(
      [
        [535, 263],
        [535, 177],
        [695, 177],
      ],
      random,
    ) +
    arrow(
      [
        [535, 377],
        [535, 500],
        [695, 500],
      ],
      random,
    ) +
    arrow(
      [
        [954, 177],
        [1110, 177],
        [1110, 263],
      ],
      random,
    ) +
    arrow(
      [
        [954, 500],
        [1110, 500],
        [1110, 377],
      ],
      random,
    ) +
    arrow(
      [
        [1170, 320],
        [1262, 320],
      ],
      random,
    )
  );
}

function page(content, { title, photo = false }) {
  const random = randomFor(7741);
  const noise = photo
    ? Array.from(
        { length: 900 },
        () =>
          `<circle cx="${(random() * 1500).toFixed(1)}" cy="${(random() * 700).toFixed(1)}" r="${(random() * 0.8).toFixed(2)}" fill="#716c61" opacity="0.12"/>`,
      ).join('')
    : '';
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="700" viewBox="0 0 1500 700">
  <defs>
    <linearGradient id="paper"><stop stop-color="#f8f6ee"/><stop offset="1" stop-color="#e0ded4"/></linearGradient>
    <filter id="soft"><feGaussianBlur stdDeviation="0.35"/></filter>
  </defs>
  <style>.hand{font-family:Noteworthy,'Comic Sans MS',cursive;fill:#193f89}.label{font-size:34px}.hours{font-size:46px}</style>
  <rect width="1500" height="700" fill="${photo ? 'url(#paper)' : '#fcfbf7'}"/>
  ${noise}
  <text x="55" y="55" font-family="Arial,sans-serif" font-size="22" fill="#62676d">${title}</text>
  <g ${photo ? 'transform="translate(6 8) rotate(-2.4 750 350) skewX(1.1)" filter="url(#soft)"' : ''}>${content}</g>
  <text x="55" y="660" font-family="Arial,sans-serif" font-size="18" fill="#62676d">Synthetic pen-drawing test · review shapes, direction and all hour values</text>
</svg>`;
}

export function handDrawnSamples() {
  return {
    '03_hand_drawn_sequence.svg': page(sequence(randomFor(3401)), {
      title: 'Pen sketch · A → B → C',
    }),
    '04_hand_drawn_xor.svg': page(choice(randomFor(5822)), {
      title: 'Pen sketch · exclusive choice (review gateway types)',
    }),
    '05_hand_drawn_photo.svg': page(sequence(randomFor(3401)), {
      title: 'Synthetic scan · slight skew, shadow and noise',
      photo: true,
    }),
    '06_hand_drawn_decimal.svg': page(sequence(randomFor(3401), true), {
      title: 'Manual-entry challenge · A = 2.5h, B = 3h, C = 4h',
    }),
  };
}
