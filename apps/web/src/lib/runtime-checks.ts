export function checkNodeVersion(minVersion: number): boolean { return parseInt(process.version.slice(1)) >= minVersion; }
export function checkMemoryLimit(mbWarn: number): { ok: boolean; usage: string } { const used = process.memoryUsage().heapUsed / 1024 / 1024; return { ok: used < mbWarn, usage: `${used.toFixed(1)}MB` }; }
export function getRuntimeInfo() { return { node: process.version, platform: process.platform, arch: process.arch, pid: process.pid, cwd: process.cwd() }; }
