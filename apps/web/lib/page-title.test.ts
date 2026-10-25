import { expect, it } from 'vitest';
import { pageTitle } from './page-title';
it('uses the same single-language title format for every surface', () => {
  expect(pageTitle('/knowledge', 'vi')).toBe('Kiến thức | Flowculus');
  expect(pageTitle('/knowledge', 'en')).toBe('Knowledge | Flowculus');
  expect(pageTitle('/mining', 'vi')).toBe('Khai phá quy trình | Flowculus');
  expect(pageTitle('/', 'en')).toBe('Canvas | Flowculus');
  expect(pageTitle('/missing', 'en')).toBe('Flowculus');
});
