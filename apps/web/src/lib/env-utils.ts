export function isDevelopment(): boolean { return process.env.NODE_ENV === 'development'; }
export function isProduction(): boolean { return process.env.NODE_ENV === 'production'; }
export function isTest(): boolean { return process.env.NODE_ENV === 'test'; }
export function isVercel(): boolean { return !!process.env.VERCEL; }
