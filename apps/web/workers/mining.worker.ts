import {
  createMiningSession,
  type MiningRequest,
  type MiningResponse,
} from '../lib/mining-engine';

interface MiningEnvelope {
  requestId: number;
  request: MiningRequest;
}

type MiningReply =
  | { requestId: number; ok: true; response: MiningResponse }
  | { requestId: number; ok: false; error: string };

const workerScope = globalThis as typeof globalThis & {
  onmessage: ((event: MessageEvent<MiningEnvelope>) => void) | null;
  postMessage: (message: MiningReply) => void;
};

const handle = createMiningSession();

workerScope.onmessage = (event) => {
  const { requestId, request } = event.data;
  try {
    workerScope.postMessage({ requestId, ok: true, response: handle(request) });
  } catch (error) {
    workerScope.postMessage({
      requestId,
      ok: false,
      error: error instanceof Error ? error.message : 'Process mining failed.',
    });
  }
};

export {};
