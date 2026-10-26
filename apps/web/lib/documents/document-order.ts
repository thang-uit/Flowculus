/** Reorder by stable identity; invalid IDs/positions leave the original array intact. */
export function moveDocument<T extends { id: string }>(
  documents: readonly T[],
  id: string,
  index: number,
): readonly T[] {
  const from = documents.findIndex((document) => document.id === id);
  if (
    from < 0 ||
    !Number.isInteger(index) ||
    index < 0 ||
    index >= documents.length ||
    from === index
  )
    return documents;
  const next = [...documents];
  const [document] = next.splice(from, 1);
  next.splice(index, 0, document);
  return next;
}
