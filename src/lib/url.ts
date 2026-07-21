const HTTP_URL_PATTERN = /^https?:\/\//;

export function isHttpUrl(value: string): boolean {
  return HTTP_URL_PATTERN.test(value);
}
