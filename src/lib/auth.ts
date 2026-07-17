export function isBearerAuthorized(request: Request, secret: string): boolean {
  return request.headers.get("Authorization") === `Bearer ${secret}`;
}
