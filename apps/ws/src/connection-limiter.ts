export class ConnectionLimiter {
  private max: number;
  private current = 0;
  constructor(max: number) {
    this.max = max;
  }
  canConnect(): boolean {
    return this.current < this.max;
  }
  addConnection(): void {
    this.current++;
  }
  removeConnection(): void {
    if (this.current > 0) this.current--;
  }
  getStats(): { current: number; max: number; available: number } {
    return { current: this.current, max: this.max, available: this.max - this.current };
  }
}
