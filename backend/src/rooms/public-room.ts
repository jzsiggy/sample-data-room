import { Room } from "@prisma/client";

export interface PublicRoom {
  id: string;
  name: string;
  createdAt: string;
}

/** The room fields safe to send over the wire. */
export function publicRoom(room: Room): PublicRoom {
  return {
    id: room.id,
    name: room.name,
    createdAt: room.createdAt.toISOString(),
  };
}
