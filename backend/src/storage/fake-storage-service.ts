import {
  PresignedDownload,
  PresignedUpload,
  StorageService,
} from "./storage-service";

/**
 * In-memory StorageService for tests. `presignUpload` registers the key as
 * stored (standing in for the client's PUT); `presignDownload` only resolves
 * for stored keys; `delete` removes them. Semantics will be refined alongside
 * the real upload flow in issue 05.
 */
export class FakeStorageService implements StorageService {
  private readonly stored = new Set<string>();

  async presignUpload(
    key: string,
    _contentType: string,
  ): Promise<PresignedUpload> {
    this.stored.add(key);
    return {
      url: `https://fake-storage.local/upload/${encodeURIComponent(key)}`,
      key,
    };
  }

  async presignDownload(key: string): Promise<PresignedDownload> {
    if (!this.stored.has(key)) {
      throw new Error(`No stored object for key: ${key}`);
    }
    return {
      url: `https://fake-storage.local/download/${encodeURIComponent(key)}`,
    };
  }

  async delete(key: string): Promise<void> {
    this.stored.delete(key);
  }
}
