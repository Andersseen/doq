type Listener = (params: any) => void;

interface CdpMessage {
  id?: number;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: { message: string };
}

/** Minimal Chrome DevTools Protocol client over Node's built-in WebSocket. */
export class CDP {
  private readonly ws: WebSocket;
  private nextId = 0;
  private readonly pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void }>();
  private readonly events = new Map<string, Listener[]>();

  constructor(url: string) {
    this.ws = new WebSocket(url);
    this.ws.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data)) as CdpMessage;
      if (message.id) {
        const request = this.pending.get(message.id);
        if (!request) return;
        this.pending.delete(message.id);
        if (message.error) request.reject(new Error(message.error.message));
        else request.resolve(message.result);
      } else if (message.method) {
        for (const listener of this.events.get(message.method) ?? []) listener(message.params);
      }
    });
  }

  async ready(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.ws.addEventListener('open', () => resolve(), { once: true });
      this.ws.addEventListener('error', reject, { once: true });
    });
  }

  send<T = any>(method: string, params: object = {}): Promise<T> {
    const id = ++this.nextId;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  on(name: string, listener: Listener): void {
    this.events.set(name, [...(this.events.get(name) ?? []), listener]);
  }

  off(name: string, listener: Listener): void {
    this.events.set(
      name,
      (this.events.get(name) ?? []).filter((candidate) => candidate !== listener),
    );
  }

  /** Evaluate an expression in the page and return its JSON-serialisable value. */
  async evaluate<T = any>(expression: string, awaitPromise = true): Promise<T> {
    const response = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise });
    if (response.exceptionDetails) {
      throw new Error(response.exceptionDetails.exception?.description ?? response.exceptionDetails.text);
    }
    return response.result?.value;
  }

  close(): void {
    this.ws.close();
  }
}
