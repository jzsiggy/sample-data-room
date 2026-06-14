export interface PresignedUpload {
  /** URL the client PUTs the file bytes to. */
  url: string;
  /** Storage key the object will live under. */
  key: string;
}

export interface PresignedDownload {
  /** URL the client GETs the file bytes from. */
  url: string;
}

/**
 * Port over object storage. The API never streams file bytes itself — it hands
 * the client presigned URLs to PUT/GET directly against storage. Production is
 * backed by S3/MinIO; tests use an in-memory fake.
 *
 * Signatures are intentionally minimal for the walking skeleton; issue 05
 * (upload & delete files) refines them as the real upload flow lands.
 */
export interface StorageService {
  presignUpload(key: string, contentType: string): Promise<PresignedUpload>;
  presignDownload(key: string): Promise<PresignedDownload>;
  delete(key: string): Promise<void>;
}
