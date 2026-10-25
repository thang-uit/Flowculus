import { expect, it } from 'vitest';
import { BPMN_GATEWAY_MARKERS } from './bpmn-symbols';

it('keeps the exclusive event-based marker as two rings around a pentagon', () => {
  const marker = BPMN_GATEWAY_MARKERS.eventBased;
  expect(marker.filter((part) => part.tag === 'circle')).toHaveLength(2);
  const pentagon = marker.find((part) => part.tag === 'polygon');
  expect(pentagon?.tag === 'polygon' && pentagon.points.split(' ')).toHaveLength(5);
  expect(Object.keys(BPMN_GATEWAY_MARKERS)).toEqual([
    'xor',
    'and',
    'or',
    'complex',
    'eventBased',
  ]);
});
