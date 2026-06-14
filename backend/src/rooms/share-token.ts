import { randomBytes } from "node:crypto";

/**
 * Mints a fresh share token: the unguessable secret embedded in a room's share
 * link. Distinct from the room's internal id and not derivable from it — 24
 * random bytes, URL-safe so it drops straight into a link.
 */
export function newShareToken(): string {
  return randomBytes(24).toString("base64url");
}
