export const storage = {
  get<T>(key: string, fallback: T): T { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; } },
  set(key: string, value: unknown): void { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota exceeded */ } },
  remove(key: string): void { try { localStorage.removeItem(key); } catch { /* ignore */ } },
  clear(): void { try { localStorage.clear(); } catch { /* ignore */ } },
};
