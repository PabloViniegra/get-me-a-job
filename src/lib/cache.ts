export function cachedClient<T>(name: string, factory: () => T): T {
  const globalRef = globalThis as unknown as Record<string, unknown>;
  if (globalRef[name] === undefined) {
    globalRef[name] = factory();
  }
  return globalRef[name] as T;
}
