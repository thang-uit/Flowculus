import { createXmlElement as el, serializeXml } from '@flowculus/xml-tree';
import type { PetriNet } from './types';
import { petriRuntime } from './runtime';
export function petriToPnml(net: PetriNet): string {
  if (!petriRuntime(net).valid) throw new Error('Invalid Petri net');
  const text = (name: string, value: string) =>
    el(name, {}, [el('text', {}, [{ kind: 'text', value }])]);
  let next = 0;
  return serializeXml({
    children: [
      el('pnml', {}, [
        el('net', { id: 'net', type: 'http://www.pnml.org/version-2009/grammar/ptnet' }, [
          text('name', net.name),
          el('page', { id: 'page' }, [
            ...net.places.map((place) =>
              el('place', { id: place.id }, [
                text('name', place.label),
                ...(net.initial[place.id]
                  ? [text('initialMarking', String(net.initial[place.id]))]
                  : []),
              ]),
            ),
            ...net.transitions.map((transition) =>
              el('transition', { id: transition.id }, [
                text('name', transition.label ?? ''),
                ...(transition.label == null
                  ? [
                      el('toolspecific', {
                        tool: 'Flowculus',
                        version: '1',
                        activity: '$invisible$',
                      }),
                    ]
                  : []),
              ]),
            ),
            ...net.transitions.flatMap((transition) => [
              ...transition.inputs.map((place) =>
                el('arc', { id: `a${next++}`, source: place, target: transition.id }),
              ),
              ...transition.outputs.map((place) =>
                el('arc', { id: `a${next++}`, source: transition.id, target: place }),
              ),
            ]),
          ]),
          el('finalmarkings', {}, [
            el(
              'marking',
              {},
              Object.entries(net.final).map(([id, count]) =>
                el('place', { idref: id }, [
                  el('text', {}, [{ kind: 'text', value: String(count) }]),
                ]),
              ),
            ),
          ]),
        ]),
      ]),
    ],
  });
}
