import { describe, expect, it } from 'vitest';
import { importDocumentBatch } from './import-document-batch';
import { INITIAL_PROCESS_MODEL } from '../initial-process-model';
const file = (name: string, source: string) =>
  ({ name, size: source.length, text: async () => source }) as File;
const source = (name: string) =>
  JSON.stringify({ schemaVersion: 1, model: { ...INITIAL_PROCESS_MODEL, name } });
describe('batch document import', () => {
  it('opens independent models without silently ignoring the second file', async () => {
    const results = await importDocumentBatch(
      [file('a.flowculus.json', source('A')), file('b.flowculus.json', source('B'))],
      'Untitled',
      new AbortController().signal,
    );
    expect(results.map((result) => result.kind === 'model' && result.model.name)).toEqual(
      ['A', 'B'],
    );
  });
  it('rejects a mixed model/log selection before anything can be applied', async () => {
    await expect(
      importDocumentBatch(
        [file('a.flowculus.json', source('A')), file('events.json', '[]')],
        'Untitled',
        new AbortController().signal,
      ),
    ).rejects.toThrow('mixed-file-selection');
  });
  it('invalid later files reject the whole selection and cancellation interrupts parsing', async () => {
    await expect(
      importDocumentBatch(
        [file('a.flowculus.json', source('A')), file('b.flowculus.json', '{invalid')],
        'Untitled',
        new AbortController().signal,
      ),
    ).rejects.toThrow();
    const controller = new AbortController();
    controller.abort();
    await expect(
      importDocumentBatch(
        [file('a.flowculus.json', source('A'))],
        'Untitled',
        controller.signal,
      ),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });
});
