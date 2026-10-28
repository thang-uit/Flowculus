import { validateModelStructure } from '@flowculus/validation';
import {
  SEMANTIC_METADATA_KEYS,
  type ProcessModel,
  type ProcessNode,
  type NodeBounds,
} from '@flowculus/process-model';
import {
  BPMN_NS,
  DI_NS,
  FC_NS,
  BpmnFormatError,
  attr,
  children,
  localName,
  readBpmnXml,
  text,
} from './xml';

const TASKS = new Set([
  'task',
  'userTask',
  'serviceTask',
  'manualTask',
  'scriptTask',
  'businessRuleTask',
  'sendTask',
  'receiveTask',
]);
const ARTIFACTS = new Set([
  'dataObjectReference',
  'dataStoreReference',
  'textAnnotation',
]);
export function importBpmnXml(source: string, fallbackName = 'Process'): ProcessModel {
  const { root, entries, namespace } = readBpmnXml(source);
  const processes = children(root).filter(
    (element) => namespace(element) === BPMN_NS && localName(element) === 'process',
  );
  if (!processes.length) throw new BpmnFormatError('invalid');
  const model: ProcessModel = {
    schemaVersion: 2,
    id: attr(root, 'id') ?? crypto.randomUUID(),
    name: attr(root, 'name') ?? attr(processes[0], 'name') ?? fallbackName,
    nodes: {},
    edges: {},
    containers: {},
  };
  const geometry = new Map<string, NodeBounds>();
  const orientations = new Map<string, 'horizontal' | 'vertical'>();
  for (const shape of entries.filter(
    (element) => namespace(element) === DI_NS && localName(element) === 'BPMNShape',
  )) {
    const bounds = children(shape).find((child) => localName(child) === 'Bounds');
    const ref = attr(shape, 'bpmnElement');
    if (!bounds || !ref) continue;
    const [x, y, width, height] = ['x', 'y', 'width', 'height'].map((key) =>
      Number(attr(bounds, key)),
    );
    if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0)
      throw new BpmnFormatError('invalid', ref);
    geometry.set(ref, { x, y, width, height });
    orientations.set(
      ref,
      attr(shape, 'isHorizontal') === 'false' ? 'vertical' : 'horizontal',
    );
  }
  const participants = entries.filter(
    (element) => namespace(element) === BPMN_NS && localName(element) === 'participant',
  );
  const poolByProcess = new Map<string, string>();
  for (const [index, participant] of participants.entries()) {
    const id = attr(participant, 'id');
    if (!id) throw new BpmnFormatError('invalid');
    const processId = attr(participant, 'processRef');
    if (
      processId &&
      (!processes.some((element) => attr(element, 'id') === processId) ||
        poolByProcess.has(processId))
    )
      throw new BpmnFormatError('unsupported', id);
    if (processId) poolByProcess.set(processId, id);
    model.containers![id] = {
      id,
      kind: 'pool',
      label: attr(participant, 'name') ?? id,
      processId,
      blackBox: !processId,
      orientation: orientations.get(id) ?? 'horizontal',
      bounds: geometry.get(id) ?? { x: 0, y: index * 440, width: 1300, height: 400 },
    };
  }
  if (processes.length > 1 && !participants.length)
    throw new BpmnFormatError('unsupported');
  for (const process of processes) {
    const processId = attr(process, 'id');
    if (!processId) throw new BpmnFormatError('invalid');
    let poolId = poolByProcess.get(processId);
    if (
      !poolId &&
      children(process).some((element) => localName(element) === 'laneSet')
    ) {
      let implicit = `pool_${processId}`;
      while (entries.some((element) => attr(element, 'id') === implicit)) implicit += '_';
      poolId = implicit;
      poolByProcess.set(processId, poolId);
      model.containers![poolId] = {
        id: poolId,
        label: attr(process, 'name') ?? fallbackName,
        kind: 'pool',
        processId,
        orientation: 'horizontal',
        bounds: { x: 0, y: 0, width: 1300, height: 500 },
      };
    }
    for (const element of children(process)) {
      if (namespace(element) !== BPMN_NS) continue;
      const type = localName(element);
      const id = attr(element, 'id');
      if (['laneSet', 'extensionElements', 'documentation'].includes(type)) continue;
      if (!id) throw new BpmnFormatError('invalid');
      if (type === 'sequenceFlow' || type === 'association') {
        const sourceId = attr(element, 'sourceRef');
        const targetId = attr(element, 'targetRef');
        if (
          !sourceId ||
          !targetId ||
          ['__proto__', 'constructor', 'prototype'].includes(sourceId) ||
          ['__proto__', 'constructor', 'prototype'].includes(targetId)
        )
          throw new BpmnFormatError('invalid', id);
        const extension = children(element)
          .flatMap(children)
          .find((child) => namespace(child) === FC_NS && localName(child) === 'edge');
        let fields = {};
        if (extension) {
          try {
            fields = JSON.parse(text(extension));
          } catch {
            throw new BpmnFormatError('invalid', id);
          }
        }
        const condition = children(element).find(
          (child) => localName(child) === 'conditionExpression',
        );
        model.edges[id] = {
          ...fields,
          id,
          source: sourceId,
          target: targetId,
          kind: type === 'association' ? 'association' : 'sequence',
          condition: condition ? text(condition) : attr(element, 'name'),
        };
        continue;
      }
      let kind: ProcessNode['kind'];
      let gatewayKind: ProcessNode['gatewayKind'];
      if (TASKS.has(type)) kind = 'task';
      else if (type === 'startEvent') kind = 'start';
      else if (type === 'endEvent') kind = 'end';
      else if (type === 'intermediateCatchEvent' || type === 'intermediateThrowEvent')
        kind = 'event';
      else if (type.endsWith('Gateway')) {
        kind = 'gateway';
        gatewayKind =
          type === 'exclusiveGateway'
            ? 'xor'
            : type === 'parallelGateway'
              ? 'and'
              : type === 'inclusiveGateway'
                ? 'or'
                : type === 'eventBasedGateway'
                  ? 'eventBased'
                  : 'complex';
      } else if (type === 'subProcess') kind = 'subprocess';
      else if (ARTIFACTS.has(type))
        kind = type === 'textAnnotation' ? 'annotation' : 'data';
      else throw new BpmnFormatError('unsupported', id);
      // Never discard unsupported execution semantics (events, nested subprocesses, conditions).
      if (
        children(element).some(
          (child) =>
            namespace(child) === BPMN_NS &&
            (localName(child).endsWith('EventDefinition') ||
              [
                'multiInstanceLoopCharacteristics',
                'standardLoopCharacteristics',
              ].includes(localName(child))),
        ) ||
        (kind === 'subprocess' &&
          children(element).some(
            (child) =>
              TASKS.has(localName(child)) ||
              ['sequenceFlow', 'startEvent', 'endEvent'].includes(localName(child)) ||
              localName(child).endsWith('Gateway'),
          ))
      )
        throw new BpmnFormatError('unsupported', id);
      const extension = children(element)
        .flatMap(children)
        .find((child) => namespace(child) === FC_NS && localName(child) === 'node');
      let fields = {};
      if (extension) {
        try {
          fields = JSON.parse(text(extension));
        } catch {
          throw new BpmnFormatError('invalid', id);
        }
      }
      model.nodes[id] = {
        ...fields,
        id,
        label: attr(element, 'name') ?? id,
        kind,
        gatewayKind,
        poolId,
        bounds: geometry.get(id),
      };
      if (['receiveTask', 'sendTask'].includes(type))
        model.nodes[id].metadata = {
          ...model.nodes[id].metadata,
          [SEMANTIC_METADATA_KEYS.unsupportedShape]: true,
          [SEMANTIC_METADATA_KEYS.bpmnType]: type,
        };
    }
    const laneSets = children(process).filter(
      (element) => localName(element) === 'laneSet',
    );
    for (const lane of laneSets.flatMap(children)) {
      if (localName(lane) !== 'lane') continue;
      if (
        !poolId ||
        children(lane).some((element) => localName(element) === 'childLaneSet')
      )
        throw new BpmnFormatError('unsupported', attr(lane, 'id'));
      const id = attr(lane, 'id');
      if (!id) throw new BpmnFormatError('invalid');
      const members = children(lane)
        .filter((element) => localName(element) === 'flowNodeRef')
        .map(text);
      for (const member of members) {
        const node = model.nodes[member];
        if (!node || node.poolId !== poolId || node.laneId)
          throw new BpmnFormatError('invalid', member);
        node.laneId = id;
      }
      model.containers![id] = {
        id,
        kind: 'lane',
        parentId: poolId,
        label: attr(lane, 'name') ?? id,
        orientation: 'horizontal',
        bounds: geometry.get(id) ?? { x: 40, y: 0, width: 1260, height: 180 },
      };
    }
  }
  for (const element of entries.filter(
    (element) => namespace(element) === BPMN_NS && localName(element) === 'messageFlow',
  )) {
    const id = attr(element, 'id');
    const from = attr(element, 'sourceRef');
    const to = attr(element, 'targetRef');
    if (!id || !from || !to) throw new BpmnFormatError('invalid', id);
    if (!Object.hasOwn(model.nodes, from) || !Object.hasOwn(model.nodes, to))
      throw new BpmnFormatError('unsupported', id);
    model.edges[id] = {
      id,
      source: from,
      target: to,
      kind: 'message',
      condition: attr(element, 'name'),
    };
  }
  for (const edge of Object.values(model.edges))
    if (
      !Object.hasOwn(model.nodes, edge.source) ||
      !Object.hasOwn(model.nodes, edge.target)
    )
      throw new BpmnFormatError('invalid', edge.id);
  for (const element of entries.filter(
    (element) => namespace(element) === DI_NS && localName(element) === 'BPMNEdge',
  )) {
    const edge = model.edges[attr(element, 'bpmnElement') ?? ''];
    if (!edge) continue;
    const points = children(element)
      .filter((child) => localName(child) === 'waypoint')
      .map((point) => ({ x: Number(attr(point, 'x')), y: Number(attr(point, 'y')) }));
    if (points.some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.y)))
      throw new BpmnFormatError('invalid', edge.id);
    edge.routing ??= { style: 'orthogonal', waypoints: points.slice(1, -1) };
  }
  if (!Object.keys(model.containers!).length) delete model.containers;
  if (validateModelStructure(model).diagnostics.length)
    throw new BpmnFormatError('invalid');
  return model;
}
