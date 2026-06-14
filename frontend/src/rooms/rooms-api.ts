import { apiFetch, apiJson } from "../api";

export interface Room {
  id: string;
  name: string;
  shareToken: string;
  linkEnabled: boolean;
  createdAt: string;
}

/** The public share link an owner hands out for a room, carrying its token. */
export function shareLink(token: string): string {
  return `${window.location.origin}/r/${token}`;
}

export function listRooms(): Promise<Room[]> {
  return apiJson<Room[]>("/rooms");
}

export function createRoom(name: string): Promise<Room> {
  return apiJson<Room>("/rooms", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function getRoom(id: string): Promise<Room> {
  return apiJson<Room>(`/rooms/${id}`);
}

export function renameRoom(id: string, name: string): Promise<Room> {
  return apiJson<Room>(`/rooms/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}

export function setLinkEnabled(id: string, enabled: boolean): Promise<Room> {
  return apiJson<Room>(`/rooms/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ linkEnabled: enabled }),
  });
}

export function regenerateShareToken(id: string): Promise<Room> {
  return apiJson<Room>(`/rooms/${id}/share-token`, { method: "POST" });
}

export async function deleteRoom(id: string): Promise<void> {
  const res = await apiFetch(`/rooms/${id}`, { method: "DELETE" });
  if (!res.ok) {
    throw new Error("Could not delete the room.");
  }
}
