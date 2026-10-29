interface TopicBounds {
  id: string;
  top: number;
  bottom: number;
}

/** A fractional tail of the previous article must not outrank the article being read. */
export function findActiveTopic(
  topics: readonly TopicBounds[],
  viewport: { top: number; bottom: number },
): string | undefined {
  let active: string | undefined;
  let largestOverlap = 1;
  for (const topic of topics) {
    const overlap =
      Math.min(topic.bottom, viewport.bottom) - Math.max(topic.top, viewport.top);
    if (overlap > largestOverlap) {
      active = topic.id;
      largestOverlap = overlap;
    }
  }
  return active;
}
