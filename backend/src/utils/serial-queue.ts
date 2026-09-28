// Runs async tasks strictly one after another, even if callers arrive concurrently.
// A failing task rejects for its own caller but never blocks the tasks behind it.
export function createSerialQueue() {
  let tail: Promise<unknown> = Promise.resolve();

  return function runExclusively<T>(task: () => Promise<T>): Promise<T> {
    const result = tail.then(() => task());
    tail = result.then(
      () => undefined,
      () => undefined
    );
    return result;
  };
}