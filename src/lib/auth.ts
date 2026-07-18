import { createHash, timingSafeEqual } from "node:crypto";

export function isBearerAuthorized(request: Request, secret: string): boolean {
  const header = request.headers.get("Authorization");
  if (!header || !header.startsWith("Bearer ")) return false;

  const presented = header.slice("Bearer ".length);
  if (!presented) return false;

  const expected = sha256(secret);
  const actual = sha256(presented);
  return timingSafeEqual(expected, actual);
}

function sha256(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}
