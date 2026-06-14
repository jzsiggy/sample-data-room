import { apiJson } from "../api";

export interface Room {
  id: string;
  name: string;
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
