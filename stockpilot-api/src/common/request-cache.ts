export class RequestCache {
  private readonly values = new Map<string, {value: unknown; until: number}>();

  private readonly pending = new Map<string, Promise<unknown>>();

  constructor(private readonly capacity = 500) {}

  async get<T>(key: string, ttl: number, load: () => Promise<T>): Promise<T> {
    const cached = this.values.get(key);

    if (cached && cached.until > Date.now()) {
      return cached.value as T;
    }

    const pending = this.pending.get(key);

    if (pending) {
      return pending as Promise<T>;
    }

    const task = Promise.resolve()
      .then(load)
      .then((value) => {
        this.values.delete(key);

        if (this.values.size >= this.capacity) {
          this.values.delete(this.values.keys().next().value!);
        }

        this.values.set(key, {
          value,
          until: Date.now() + ttl,
        });

        return value;
      });

    this.pending.set(key, task);

    try {
      return await task;
    } finally {
      this.pending.delete(key);
    }
  }
}
