import type { AlphaMiningResult } from '../alpha-miner';
import type { PetriConversion, PetriNet } from './types';
export function alphaToPetri(result: AlphaMiningResult, name: string): PetriConversion {
  if (result.status !== 'ready') return { status: 'unsupported', reason: 'limit' };
  if (result.selfLoops.length || result.shortLoops.length)
    return { status: 'unsupported', reason: 'semantics' };
  const activities = [
    ...new Set([
      ...result.startActivities,
      ...result.endActivities,
      ...result.places.flatMap((place) => [...place.inputs, ...place.outputs]),
    ]),
  ].sort();
  const net: PetriNet = {
    id: 'alpha-net',
    name,
    origin: 'alpha',
    places: [
      { id: 'input', label: 'i' },
      { id: 'output', label: 'o' },
      ...result.places.map((_, index) => ({ id: `p${index}`, label: `p${index + 1}` })),
    ],
    initial: { input: 1 },
    final: { output: 1 },
    transitions: activities.map((activity, index) => ({
      id: `t${index}`,
      label: activity,
      inputs: [
        ...(result.startActivities.includes(activity) ? ['input'] : []),
        ...result.places.flatMap((place, index) =>
          place.outputs.includes(activity) ? [`p${index}`] : [],
        ),
      ],
      outputs: [
        ...(result.endActivities.includes(activity) ? ['output'] : []),
        ...result.places.flatMap((place, index) =>
          place.inputs.includes(activity) ? [`p${index}`] : [],
        ),
      ],
    })),
  };
  return { status: 'ready', net };
}
