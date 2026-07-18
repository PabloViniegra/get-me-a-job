type LogArgs = ReadonlyArray<unknown>;

export const log = {
  info(...args: LogArgs): void {
    if (process.env.NODE_ENV !== "production") {
      console.info(...args);
    }
  },
  warn(...args: LogArgs): void {
    if (process.env.NODE_ENV !== "production") {
      console.warn(...args);
    }
  },
};
