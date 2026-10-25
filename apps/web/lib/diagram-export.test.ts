import { describe, expect, it } from 'vitest';

import { rasterExportSize } from './diagram-export';

describe('raster export bounds', () => {
  it('keeps a normal diagram at its requested resolution', () => {
    expect(rasterExportSize(800, 400, 2.5)).toEqual({ width: 2000, height: 1000 });
  });

  it('caps both dimensions and total pixels', () => {
    const size = rasterExportSize(4000, 3000, 2.5);
    expect(size.width).toBeLessThanOrEqual(8192);
    expect(size.height).toBeLessThanOrEqual(8192);
    expect(size.width * size.height).toBeLessThanOrEqual(8_000_000);
  });

  it('refuses an unreadably tiny bitmap instead of exhausting memory', () => {
    expect(() => rasterExportSize(50_000, 50_000, 2.5)).toThrow('too large');
  });
});
