type Listener = (...args: unknown[]) => void;
export class EventEmitter { private events = new Map<string, Set<Listener>>();
  on(event: string, listener: Listener): void { if (!this.events.has(event)) this.events.set(event, new Set()); this.events.get(event)!.add(listener); }
  off(event: string, listener: Listener): void { this.events.get(event)?.delete(listener); }
  emit(event: string, ...args: unknown[]): void { this.events.get(event)?.forEach((l) => l(...args)); }
}
