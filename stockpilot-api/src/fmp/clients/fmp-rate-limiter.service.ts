import {Injectable, Logger} from '@nestjs/common';

const MIN_REQUEST_INTERVAL_MS = 350;
const MAX_RETRIES = 3;

@Injectable()
export class FmpRateLimiterService {
  private readonly logger = new Logger(FmpRateLimiterService.name);

  private queue: Promise<void> = Promise.resolve();
  private lastRequestAt = 0;

  async run(request: () => Promise<Response>): Promise<Response> {
    let releaseQueue: (() => void) | undefined;

    const previousQueue = this.queue;

    this.queue = new Promise<void>((resolve) => {
      releaseQueue = resolve;
    });

    await previousQueue;

    try {
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
        await this.waitForRequestSlot();

        const response = await request();

        if (response.status !== 429) {
          return response;
        }

        if (attempt === MAX_RETRIES) {
          return response;
        }

        const delay = this.getRetryDelay(response, attempt);

        this.logger.warn(`Rate limited. Retrying in ${delay}ms.`);

        await this.sleep(delay);
      }

      throw new Error('FMP request failed.');
    } finally {
      releaseQueue?.();
    }
  }

  private async waitForRequestSlot(): Promise<void> {
    const elapsed = Date.now() - this.lastRequestAt;
    const remaining = MIN_REQUEST_INTERVAL_MS - elapsed;

    if (remaining > 0) {
      await this.sleep(remaining);
    }

    this.lastRequestAt = Date.now();
  }

  private getRetryDelay(response: Response, attempt: number): number {
    const retryAfter = response.headers.get('retry-after');

    if (retryAfter) {
      const seconds = Number(retryAfter);

      if (Number.isFinite(seconds) && seconds > 0) {
        return seconds * 1000;
      }
    }

    return 1000 * Math.pow(2, attempt);
  }

  private sleep(milliseconds: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, milliseconds);
    });
  }
}
