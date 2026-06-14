import { Owner } from "@prisma/client";

export interface PublicOwner {
  id: string;
  email: string;
  createdAt: string;
}

/** The owner fields safe to send over the wire — never the password hash. */
export function publicOwner(owner: Owner): PublicOwner {
  return {
    id: owner.id,
    email: owner.email,
    createdAt: owner.createdAt.toISOString(),
  };
}
