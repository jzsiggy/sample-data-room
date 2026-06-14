import { File } from "@prisma/client";

export interface PublicFile {
  id: string;
  name: string;
  contentType: string;
  size: number;
  createdAt: string;
}

/** The file fields safe to send over the wire (the storage key stays server-side). */
export function publicFile(file: File): PublicFile {
  return {
    id: file.id,
    name: file.name,
    contentType: file.contentType,
    size: file.size,
    createdAt: file.createdAt.toISOString(),
  };
}
