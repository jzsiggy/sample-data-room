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

// Named RoomFile rather than File to avoid shadowing the browser's File global,
// which the upload flow uses for the bytes being sent to storage.
export interface RoomFile {
  id: string;
  name: string;
  contentType: string;
  size: number;
  createdAt: string;
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

export function listFiles(roomId: string): Promise<RoomFile[]> {
  return apiJson<RoomFile[]>(`/rooms/${roomId}/files`);
}

/** Maximum size, in bytes, of a single uploaded file (50 MB) — mirrors the API. */
export const MAX_FILE_SIZE = 50 * 1024 * 1024;

interface FileMeta {
  name: string;
  contentType: string;
  size: number;
}

interface PresignedUpload {
  url: string;
  key: string;
}

/** Step 1: ask the API to authorize the upload and hand back a presigned URL. */
export function presignUpload(
  roomId: string,
  meta: FileMeta,
): Promise<PresignedUpload> {
  return apiJson<PresignedUpload>(`/rooms/${roomId}/files/presign`, {
    method: "POST",
    body: JSON.stringify(meta),
  });
}

/** Step 2: PUT the bytes straight to object storage (never through the API). */
export async function putToStorage(url: string, file: File): Promise<void> {
  const res = await fetch(url, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });
  if (!res.ok) {
    throw new Error("Could not upload the file to storage.");
  }
}

/** Step 3: confirm the upload so the API records the File row. */
export function confirmUpload(
  roomId: string,
  meta: FileMeta & { key: string },
): Promise<RoomFile> {
  return apiJson<RoomFile>(`/rooms/${roomId}/files`, {
    method: "POST",
    body: JSON.stringify(meta),
  });
}

export async function deleteFile(
  roomId: string,
  fileId: string,
): Promise<void> {
  const res = await apiFetch(`/rooms/${roomId}/files/${fileId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error("Could not delete the file.");
  }
}
