interface Result {
  id: string;
  status: 'PASS' | 'FAIL';
  text: string;
}

const results: Result[] = [];

export const pass = (id: string, text: string): void => {
  results.push({ id, status: 'PASS', text });
  console.log(`PASS ${id} — ${text}`);
};

export const fail = (id: string, error: unknown): void => {
  const text = error instanceof Error ? error.message : String(error);
  results.push({ id, status: 'FAIL', text });
  console.error(`FAIL ${id} — ${text}`);
};

/** Print the summary and return the number of failures. */
export function summarize(): number {
  const passed = results.filter((result) => result.status === 'PASS').length;
  const failed = results.length - passed;
  console.log(`\nMVP browser summary: ${passed} PASS / ${failed} FAIL`);
  return failed;
}
