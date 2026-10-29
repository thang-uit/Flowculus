import type { DiscoveryFilter, TimePolicy } from '@flowculus/process-mining';
import type {
  MiningDiscoveryResponse,
  MiningRequest,
  MiningResponse,
} from './mining-engine';
import type { MiningReplay } from './mining-tabs';

/** Rebuild only the active worker log. Inactive tabs retain source and cached evidence. */
export async function replayMiningLog(
  request: (request: MiningRequest) => Promise<MiningResponse>,
  replay: MiningReplay,
  filter: DiscoveryFilter,
  timePolicy: TimePolicy,
  isCurrent: () => boolean,
): Promise<MiningDiscoveryResponse | null> {
  let response: MiningResponse;
  if (replay.kind === 'preset') {
    response = await request({
      type: 'load-preset',
      presetId: replay.presetId,
      filter,
      timePolicy,
    });
  } else {
    await request({
      type: 'inspect-file',
      fileName: replay.fileName,
      source: replay.source,
    });
    if (!isCurrent()) return null;
    response = await request({
      type: 'apply-mapping',
      mapping: replay.mapping,
      name: replay.fileName.replace(/\.(csv|tsv|json|xes|xml|txt|xlsx)$/i, ''),
      filter,
      timePolicy,
    });
  }
  if (!isCurrent()) return null;
  if (response.type !== 'discovery') throw new Error('Unexpected mining response.');
  return response;
}
