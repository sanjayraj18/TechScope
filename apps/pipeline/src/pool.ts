export async function runPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
  onResult?: (result: R, done: number, total: number) => void,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  let done = 0;

  async function lane(): Promise<void> {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await worker(items[i]);
      done++;
      onResult?.(results[i], done, items.length);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, lane),
  );
  return results;
}
