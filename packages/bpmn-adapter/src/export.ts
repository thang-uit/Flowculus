import {
  getNodeBounds,
  nodePoolId,
  processPools,
  type ProcessModel,
} from '@flowculus/process-model';
import {
  assertConfirmedModel,
  validateModelStructure,
  type ConfirmedProcessModel,
} from '@flowculus/validation';
import {
  createXmlElement as el,
  serializeXml,
  type XmlElement,
} from '@flowculus/xml-tree';
import { BPMN_NS, DI_NS, FC_NS, BpmnFormatError } from './xml';

const content = (value: string) => [{ kind: 'text' as const, value }];
export function exportBpmnXml(model: ConfirmedProcessModel): string {
  assertConfirmedModel(model);
  if (validateModelStructure(model).diagnostics.length)
    throw new BpmnFormatError('invalid');
  if (
    Object.values(model.nodes).some(
      (node) => node.kind === 'unknown' || node.metadata?.['flowculus-unsupported-shape'],
    )
  )
    throw new BpmnFormatError('unsupported');
  const names = new Map<string, string>();
  const used = new Set<string>();
  const id = (key: string) => {
    if (names.has(key)) return names.get(key)!;
    let candidate = /^[A-Za-z_][\w.-]*$/.test(key)
      ? key
      : `id_${key.replace(/[^\w.-]/g, '_')}`;
    while (used.has(candidate)) candidate += '_';
    used.add(candidate);
    names.set(key, candidate);
    return candidate;
  };
  const containers = Object.values(model.containers ?? {});
  for (const key of [
    ...Object.keys(model.nodes),
    ...Object.keys(model.edges),
    ...containers.map((item) => item.id),
  ])
    id(key);
  const extension = (kind: string, fields: object) =>
    el('bpmn:extensionElements', {}, [
      el(`fc:${kind}`, {}, content(JSON.stringify(fields))),
    ]);
  const pools = processPools(model);
  const roots: XmlElement[] = [];
  const scopes = pools.length
    ? pools
        .filter((pool) => !pool.blackBox)
        .map((pool) => ({
          key: pool.id,
          processId: id(`process_${pool.id}`),
          name: pool.label,
        }))
    : [{ key: undefined, processId: id(`process_${model.id}`), name: model.name }];
  const processByPool = new Map(scopes.map((scope) => [scope.key, scope.processId]));
  const typeFor = (kind: string, gateway?: string) =>
    kind === 'start'
      ? 'startEvent'
      : kind === 'end'
        ? 'endEvent'
        : kind === 'gateway'
          ? ({
              xor: 'exclusiveGateway',
              and: 'parallelGateway',
              or: 'inclusiveGateway',
              eventBased: 'eventBasedGateway',
              complex: 'complexGateway',
            }[gateway ?? ''] ?? 'complexGateway')
          : kind === 'event'
            ? 'intermediateThrowEvent'
            : kind === 'subprocess'
              ? 'subProcess'
              : kind === 'data'
                ? 'dataObjectReference'
                : kind === 'annotation'
                  ? 'textAnnotation'
                  : 'task';
  for (const scope of scopes) {
    const nodes = Object.values(model.nodes).filter(
      (node) => !scope.key || nodePoolId(model, node) === scope.key,
    );
    const selected = new Set(nodes.map((node) => node.id));
    const elements: XmlElement[] = [];
    const lanes = containers.filter(
      (container) => container.kind === 'lane' && container.parentId === scope.key,
    );
    if (lanes.length)
      elements.push(
        el(
          'bpmn:laneSet',
          { id: id(`lanes_${scope.key}`) },
          lanes.map((lane) =>
            el(
              'bpmn:lane',
              { id: id(lane.id), name: lane.label },
              nodes
                .filter((node) => node.laneId === lane.id)
                .map((node) => el('bpmn:flowNodeRef', {}, content(id(node.id)))),
            ),
          ),
        ),
      );
    for (const node of nodes) {
      const {
        bounds: _bounds,
        id: _id,
        label: _label,
        kind: _kind,
        gatewayKind: _gatewayKind,
        poolId: _poolId,
        laneId: _laneId,
        ...fields
      } = node;
      elements.push(
        el(
          `bpmn:${typeFor(node.kind, node.gatewayKind)}`,
          { id: id(node.id), name: node.label },
          [extension('node', fields)],
        ),
      );
    }
    for (const edge of Object.values(model.edges).filter(
      (edge) =>
        selected.has(edge.source) && selected.has(edge.target) && edge.kind !== 'message',
    )) {
      const type = edge.kind === 'association' ? 'association' : 'sequenceFlow';
      const { id: _id, source: _source, target: _target, kind: _kind, ...fields } = edge;
      elements.push(
        el(
          `bpmn:${type}`,
          {
            id: id(edge.id),
            sourceRef: id(edge.source),
            targetRef: id(edge.target),
            name: edge.condition,
          },
          [extension('edge', fields)],
        ),
      );
    }
    roots.push(
      el(
        'bpmn:process',
        { id: scope.processId, name: scope.name, isExecutable: 'false' },
        elements,
      ),
    );
  }
  const collaborationId = id(`collaboration_${model.id}`);
  if (pools.length)
    roots.push(
      el('bpmn:collaboration', { id: collaborationId }, [
        ...pools.map((pool) =>
          el('bpmn:participant', {
            id: id(pool.id),
            name: pool.label,
            processRef: processByPool.get(pool.id),
          }),
        ),
        ...Object.values(model.edges)
          .filter((edge) => edge.kind === 'message')
          .map((edge) =>
            el('bpmn:messageFlow', {
              id: id(edge.id),
              sourceRef: id(edge.source),
              targetRef: id(edge.target),
              name: edge.condition,
            }),
          ),
      ]),
    );
  const shapes = [
    ...containers.map((container) => ({
      id: container.id,
      bounds: container.bounds,
      horizontal: container.orientation === 'horizontal',
    })),
    ...Object.values(model.nodes).map((node) => ({
      id: node.id,
      bounds: getNodeBounds(node),
      horizontal: undefined,
    })),
  ];
  const plane = el(
    'bpmndi:BPMNPlane',
    {
      id: id(`plane_${model.id}`),
      bpmnElement: pools.length ? collaborationId : scopes[0].processId,
    },
    [
      ...shapes.map((shape) =>
        el(
          'bpmndi:BPMNShape',
          {
            id: id(`shape_${shape.id}`),
            bpmnElement: id(shape.id),
            isHorizontal: shape.horizontal == null ? undefined : String(shape.horizontal),
          },
          [el('dc:Bounds', { ...shape.bounds })],
        ),
      ),
      ...Object.values(model.edges).map((edge) => {
        const source = model.nodes[edge.source];
        const target = model.nodes[edge.target];
        const from = getNodeBounds(source);
        const to = getNodeBounds(target);
        const points = [
          { x: from.x + from.width, y: from.y + from.height / 2 },
          ...(edge.routing?.waypoints ?? []),
          { x: to.x, y: to.y + to.height / 2 },
        ];
        return el(
          'bpmndi:BPMNEdge',
          { id: id(`di_${edge.id}`), bpmnElement: id(edge.id) },
          points.map((point) => el('di:waypoint', point)),
        );
      }),
    ],
  );
  roots.push(el('bpmndi:BPMNDiagram', { id: id(`diagram_${model.id}`) }, [plane]));
  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    serializeXml({
      children: [
        el(
          'bpmn:definitions',
          {
            'xmlns:bpmn': BPMN_NS,
            'xmlns:bpmndi': DI_NS,
            'xmlns:dc': 'http://www.omg.org/spec/DD/20100524/DC',
            'xmlns:di': 'http://www.omg.org/spec/DD/20100524/DI',
            'xmlns:fc': FC_NS,
            id: id(`definitions_${model.id}`),
            name: model.name,
            exporter: 'Flowculus',
            exporterVersion: '0.1.0',
            targetNamespace: 'https://flowculus.vercel.app/process',
          },
          roots,
        ),
      ],
    })
  );
}
