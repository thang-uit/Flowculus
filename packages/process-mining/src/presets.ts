import { parseTimestamp } from './timestamp';
import { createEventLog } from './parse';
import type { EventLog, MiningEvent } from './types';

export type MiningPresetId = 'order-to-cash' | 'procure-to-pay' | 'it-service-desk';

export interface MiningPreset {
  id: MiningPresetId;
  /** Domain of the log, for the preset picker. */
  domain: 'erp' | 'itsm' | 'software';
  caseLabel: string;
}

export const MINING_PRESETS: MiningPreset[] = [
  { id: 'order-to-cash', domain: 'erp', caseLabel: 'Sales order' },
  { id: 'procure-to-pay', domain: 'erp', caseLabel: 'Purchase order' },
  { id: 'it-service-desk', domain: 'itsm', caseLabel: 'Ticket' },
];

/** Mulberry32: tiny, fast and deterministic, so every preset is reproducible. */
export const createSeededRandom = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

/** Triangular distribution sample in minutes. */
const triangular = (
  random: () => number,
  [low, mode, high]: [number, number, number],
) => {
  const u = random();
  const pivot = (mode - low) / Math.max(high - low, 1e-9);
  return u < pivot
    ? low + Math.sqrt(u * (high - low) * (mode - low))
    : high - Math.sqrt((1 - u) * (high - low) * (high - mode));
};

interface SimulatedActivity {
  name: string;
  /** Hands-on work, minutes (min, most likely, max). */
  service: [number, number, number];
  /** Queue before the work starts, minutes. */
  wait: [number, number, number];
  resources: string[];
  cost?: number;
}

interface SimulationSpec {
  seed: number;
  name: string;
  caseCount: number;
  casePrefix: string;
  /** Mean minutes between case arrivals. */
  interArrivalMinutes: number;
  firstArrival: string;
  start: string;
  activities: Record<string, SimulatedActivity>;
  routing: Record<string, Array<[string, number]>>;
}

const END = 'END';

const simulate = (spec: SimulationSpec): EventLog => {
  const random = createSeededRandom(spec.seed);
  const pick = (options: Array<[string, number]>): string => {
    const roll = random();
    let cumulative = 0;
    for (const [next, probability] of options) {
      cumulative += probability;
      if (roll <= cumulative) return next;
    }
    return options[options.length - 1]?.[0] ?? END;
  };
  const events: MiningEvent[] = [];
  let arrival = parseTimestamp(spec.firstArrival) ?? 0;
  const width = String(spec.caseCount).length + 1;

  for (let index = 0; index < spec.caseCount; index += 1) {
    arrival += -Math.log(1 - random()) * spec.interArrivalMinutes * 60_000;
    const caseId = `${spec.casePrefix}-${String(index + 1).padStart(width, '0')}`;
    let clock = arrival;
    let step = spec.start;
    let guard = 0;
    while (step !== END && guard < 40) {
      guard += 1;
      const activity = spec.activities[step];
      const startTime = clock + triangular(random, activity.wait) * 60_000;
      const completeTime = startTime + triangular(random, activity.service) * 60_000;
      events.push({
        caseId,
        activity: activity.name,
        startTime: Math.round(startTime / 1000) * 1000,
        completeTime: Math.round(completeTime / 1000) * 1000,
        resource: activity.resources[Math.floor(random() * activity.resources.length)],
        cost:
          activity.cost != null
            ? Math.round(activity.cost * (0.85 + random() * 0.3) * 100) / 100
            : undefined,
      });
      clock = completeTime;
      step = pick(spec.routing[step] ?? [[END, 1]]);
    }
  }
  return createEventLog(spec.name, events);
};

const ORDER_TO_CASH: SimulationSpec = {
  seed: 20_261_001,
  name: 'Order-to-Cash',
  caseCount: 320,
  casePrefix: 'SO',
  interArrivalMinutes: 95,
  firstArrival: '2026-07-01T08:00:00Z',
  start: 'create',
  activities: {
    create: {
      name: 'Create Sales Order',
      service: [5, 10, 25],
      wait: [0, 0, 0],
      resources: ['Sales Rep A', 'Sales Rep B', 'Sales Rep C'],
      cost: 8,
    },
    credit: {
      name: 'Check Credit',
      service: [5, 15, 40],
      wait: [20, 90, 360],
      resources: ['Credit Analyst'],
      cost: 12,
    },
    change: {
      name: 'Change Sales Order',
      service: [10, 20, 45],
      wait: [30, 120, 480],
      resources: ['Sales Rep A', 'Sales Rep B'],
      cost: 9,
    },
    reject: {
      name: 'Reject Order',
      service: [3, 5, 10],
      wait: [10, 30, 90],
      resources: ['Credit Analyst'],
      cost: 4,
    },
    pick: {
      name: 'Pick Goods',
      service: [15, 35, 90],
      wait: [60, 240, 900],
      resources: ['Warehouse Team 1', 'Warehouse Team 2'],
      cost: 18,
    },
    pack: {
      name: 'Pack Goods',
      service: [10, 20, 45],
      wait: [15, 60, 240],
      resources: ['Warehouse Team 1', 'Warehouse Team 2'],
      cost: 10,
    },
    ship: {
      name: 'Ship Goods',
      service: [10, 25, 60],
      wait: [120, 600, 1800],
      resources: ['Logistics'],
      cost: 35,
    },
    invoice: {
      name: 'Create Invoice',
      service: [5, 10, 20],
      wait: [30, 180, 720],
      resources: ['Billing Clerk'],
      cost: 6,
    },
    remind: {
      name: 'Send Payment Reminder',
      service: [5, 8, 15],
      wait: [7200, 14_400, 21_600],
      resources: ['Billing Clerk'],
      cost: 3,
    },
    pay: {
      name: 'Receive Payment',
      service: [2, 5, 10],
      wait: [2880, 10_080, 30_240],
      resources: ['Accounts Receivable'],
      cost: 2,
    },
  },
  routing: {
    create: [['credit', 1]],
    credit: [
      ['pick', 0.76],
      ['change', 0.14],
      ['reject', 0.1],
    ],
    change: [['credit', 1]],
    reject: [[END, 1]],
    pick: [['pack', 1]],
    pack: [['ship', 1]],
    ship: [['invoice', 1]],
    invoice: [
      ['pay', 0.78],
      ['remind', 0.22],
    ],
    remind: [
      ['pay', 0.85],
      ['remind', 0.15],
    ],
    pay: [[END, 1]],
  },
};

const PROCURE_TO_PAY: SimulationSpec = {
  seed: 20_261_002,
  name: 'Procure-to-Pay',
  caseCount: 260,
  casePrefix: 'PO',
  interArrivalMinutes: 140,
  firstArrival: '2026-06-02T07:30:00Z',
  start: 'requisition',
  activities: {
    requisition: {
      name: 'Create Purchase Requisition',
      service: [10, 20, 45],
      wait: [0, 0, 0],
      resources: ['Requester'],
      cost: 10,
    },
    approve: {
      name: 'Approve Requisition',
      service: [5, 10, 30],
      wait: [60, 480, 2880],
      resources: ['Department Head', 'Finance Manager'],
      cost: 15,
    },
    rejectRequisition: {
      name: 'Reject Requisition',
      service: [5, 8, 15],
      wait: [30, 120, 480],
      resources: ['Department Head'],
      cost: 5,
    },
    order: {
      name: 'Create Purchase Order',
      service: [15, 30, 60],
      wait: [60, 240, 1440],
      resources: ['Buyer 1', 'Buyer 2'],
      cost: 20,
    },
    send: {
      name: 'Send PO to Vendor',
      service: [5, 10, 20],
      wait: [10, 60, 240],
      resources: ['Buyer 1', 'Buyer 2'],
      cost: 4,
    },
    goods: {
      name: 'Receive Goods',
      service: [20, 40, 90],
      wait: [2880, 7200, 20_160],
      resources: ['Warehouse'],
      cost: 25,
    },
    invoice: {
      name: 'Receive Vendor Invoice',
      service: [5, 10, 20],
      wait: [600, 1440, 5760],
      resources: ['AP Clerk'],
      cost: 5,
    },
    match: {
      name: 'Three-way Match',
      service: [10, 20, 45],
      wait: [120, 480, 1440],
      resources: ['AP Clerk'],
      cost: 12,
    },
    resolve: {
      name: 'Resolve Price Discrepancy',
      service: [30, 60, 180],
      wait: [240, 1440, 4320],
      resources: ['Buyer 1', 'AP Clerk'],
      cost: 40,
    },
    pay: {
      name: 'Pay Invoice',
      service: [5, 10, 15],
      wait: [1440, 4320, 10_080],
      resources: ['Treasury'],
      cost: 6,
    },
  },
  routing: {
    requisition: [['approve', 1]],
    approve: [
      ['order', 0.88],
      ['rejectRequisition', 0.12],
    ],
    rejectRequisition: [[END, 1]],
    order: [['send', 1]],
    send: [['goods', 1]],
    goods: [['invoice', 1]],
    invoice: [['match', 1]],
    match: [
      ['pay', 0.82],
      ['resolve', 0.18],
    ],
    resolve: [['match', 1]],
    pay: [[END, 1]],
  },
};

const IT_SERVICE_DESK: SimulationSpec = {
  seed: 20_261_003,
  name: 'IT Service Desk',
  caseCount: 420,
  casePrefix: 'INC',
  interArrivalMinutes: 45,
  firstArrival: '2026-09-01T06:00:00Z',
  start: 'create',
  activities: {
    create: {
      name: 'Ticket Created',
      service: [1, 2, 5],
      wait: [0, 0, 0],
      resources: ['Self-service Portal', 'Phone Agent'],
      cost: 1,
    },
    triage: {
      name: 'Triage Ticket',
      service: [3, 8, 20],
      wait: [5, 30, 180],
      resources: ['L1 Agent A', 'L1 Agent B', 'L1 Agent C'],
      cost: 6,
    },
    l1: {
      name: 'Resolve at L1',
      service: [10, 25, 60],
      wait: [10, 45, 240],
      resources: ['L1 Agent A', 'L1 Agent B', 'L1 Agent C'],
      cost: 18,
    },
    escalate: {
      name: 'Escalate to L2',
      service: [2, 5, 10],
      wait: [5, 20, 90],
      resources: ['L1 Agent A', 'L1 Agent B'],
      cost: 3,
    },
    l2: {
      name: 'Investigate at L2',
      service: [30, 90, 300],
      wait: [120, 600, 2880],
      resources: ['L2 Engineer A', 'L2 Engineer B'],
      cost: 75,
    },
    vendor: {
      name: 'Wait for Vendor',
      service: [60, 240, 1440],
      wait: [60, 240, 960],
      resources: ['Vendor Support'],
      cost: 40,
    },
    confirm: {
      name: 'Confirm with User',
      service: [2, 5, 10],
      wait: [30, 240, 1440],
      resources: ['L1 Agent A', 'L1 Agent B'],
      cost: 3,
    },
    reopen: {
      name: 'Reopen Ticket',
      service: [2, 4, 8],
      wait: [60, 360, 1440],
      resources: ['Self-service Portal'],
      cost: 2,
    },
    close: {
      name: 'Close Ticket',
      service: [1, 2, 4],
      wait: [5, 30, 120],
      resources: ['L1 Agent A', 'L1 Agent B', 'L1 Agent C'],
      cost: 1,
    },
  },
  routing: {
    create: [['triage', 1]],
    triage: [
      ['l1', 0.62],
      ['escalate', 0.38],
    ],
    l1: [['confirm', 1]],
    escalate: [['l2', 1]],
    l2: [
      ['confirm', 0.8],
      ['vendor', 0.2],
    ],
    vendor: [['l2', 1]],
    confirm: [
      ['close', 0.86],
      ['reopen', 0.14],
    ],
    reopen: [['triage', 1]],
    close: [[END, 1]],
  },
};

/** Builds a preset log on demand (deterministic: same seed, same events). */
export const generatePresetLog = (id: MiningPresetId): EventLog => {
  switch (id) {
    case 'order-to-cash':
      return simulate(ORDER_TO_CASH);
    case 'procure-to-pay':
      return simulate(PROCURE_TO_PAY);
    case 'it-service-desk':
      return simulate(IT_SERVICE_DESK);
  }
};
