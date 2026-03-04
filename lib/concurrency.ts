export async function runWithConcurrency<TInput, TResult>(
  inputs: TInput[],
  maxConcurrency: number,
  worker: (input: TInput, index: number) => Promise<TResult>
): Promise<TResult[]> {
  const concurrency = Math.max(1, maxConcurrency);
  const results: TResult[] = new Array(inputs.length);
  let cursor = 0;

  async function runner() {
    while (cursor < inputs.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(inputs[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, inputs.length) }, () => runner()));
  return results;
}
