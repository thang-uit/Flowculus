export interface PetriPlace {
  id: string;
  label: string;
  sourceId?: string;
}
export interface PetriTransition {
  id: string;
  label: string | null;
  inputs: string[];
  outputs: string[];
  sourceId?: string;
}
export type Marking = Record<string, number>;
export interface PetriNet {
  id: string;
  name: string;
  places: PetriPlace[];
  transitions: PetriTransition[];
  initial: Marking;
  final: Marking;
  origin: 'alpha' | 'bpmn';
}
export type PetriConversion =
  | { status: 'ready'; net: PetriNet }
  | { status: 'unsupported'; reason: 'scope' | 'structure' | 'semantics' | 'limit' };
export interface PetriVerification {
  status: 'complete' | 'limit' | 'invalid';
  states: number;
  safe: boolean | null;
  bounded: boolean | null;
  sound: boolean | null;
  deadTransitions: string[];
  deadlocks: Array<{ marking: Marking; path: string[] }>;
  improperCompletions: number;
  counterexample: string[] | null;
}
