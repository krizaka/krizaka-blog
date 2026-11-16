/** Runs `task(item, index)` over `items` with at most `limit` in flight; returns the results in the order of `items`
 *  (never the order they finished in), so a report built from them is the same whatever the concurrency. The first
 *  failure rejects after the running tasks settle. `onDone(doneCount)` fires after each task. */
export async function mapPool(items, limit, task, onDone = () => {}) {
  const results = new Array(items.length);
  let next = 0;
  let done = 0;
  let failure;
  const worker = async () => {
    while (failure === undefined && next < items.length) {
      const i = next++;
      try {
        results[i] = await task(items[i], i);
      } catch (e) {
        failure ??= { e };
        return;
      }
      onDone(++done);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, worker));
  if (failure) throw failure.e;
  return results;
}
