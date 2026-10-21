import { spawn, type ChildProcess } from 'node:child_process';
import { stat } from 'node:fs/promises';
import { repo } from './config.ts';
import { waitFor } from './wait.ts';

/** Serve a production build with scripts/preview-static.ts and wait until it answers. */
export async function startPreview(name: string, root: string, port: number): Promise<ChildProcess> {
  try {
    if (!(await stat(root)).isDirectory()) throw new Error('not a directory');
  } catch {
    throw new Error(`Missing production output ${root}; run pnpm build first.`);
  }
  const server = spawn(process.execPath, ['scripts/preview-static.ts', root], {
    cwd: repo,
    env: { ...process.env, PORT: String(port) },
    stdio: 'ignore',
  });
  await waitFor(async () => (await fetch(`http://127.0.0.1:${port}/`)).ok, `${name} preview on ${port}`);
  return server;
}

export async function stopServers(servers: readonly ChildProcess[]): Promise<void> {
  for (const server of servers) server.kill('SIGTERM');
  await Promise.all(
    servers.map(
      (server) =>
        new Promise<void>((resolve) => (server.exitCode !== null ? resolve() : server.once('exit', () => resolve()))),
    ),
  );
}
