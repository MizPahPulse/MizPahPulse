export function pipe<T>(...fns: Array<(arg: T) => T>): (arg: T) => T { return (arg: T) => fns.reduce((acc, fn) => fn(acc), arg); }
export function compose<T>(...fns: Array<(arg: T) => T>): (arg: T) => T { return (arg: T) => fns.reduceRight((acc, fn) => fn(acc), arg); }
