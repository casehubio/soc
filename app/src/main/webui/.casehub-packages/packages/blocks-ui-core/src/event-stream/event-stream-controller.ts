import { EventStream } from "@casehubio/pages-data";
import type { EventStreamOptions } from "@casehubio/pages-data";
import type { ConnectionStatus } from "@casehubio/pages-data";
import type { ReactiveController, ReactiveControllerHost } from "lit";

export class EventStreamController<T = unknown> implements ReactiveController {
  private readonly stream: EventStream<T>;

  constructor(
    private readonly host: ReactiveControllerHost,
    url: string,
    topics: string | string[],
    options?: EventStreamOptions<T>,
  ) {
    this.stream = new EventStream(url, topics, {
      ...options,
      batchEvents: options?.batchEvents ?? true,
      onChange: () => host.requestUpdate(),
    });
    host.addController(this);
  }

  get latest(): T | undefined {
    return this.stream.latest;
  }

  get all(): readonly T[] {
    return this.stream.all;
  }

  get status(): ConnectionStatus {
    return this.stream.status;
  }

  hostConnected(): void {
    this.stream.connect();
  }

  hostDisconnected(): void {
    this.stream.disconnect();
  }
}
