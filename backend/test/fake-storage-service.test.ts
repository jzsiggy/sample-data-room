import { describe, expect, it } from "vitest";
import { FakeStorageService } from "../src/storage/fake-storage-service";

describe("FakeStorageService", () => {
  it("round-trips a stored key and forgets it after delete", async () => {
    const storage = new FakeStorageService();

    const { key, url } = await storage.presignUpload(
      "rooms/r1/report.pdf",
      "application/pdf",
    );
    expect(key).toBe("rooms/r1/report.pdf");
    expect(url).toContain("upload");

    // A stored key can be presigned for download.
    const download = await storage.presignDownload(key);
    expect(download.url).toContain("download");

    // After delete, the key is gone and download rejects.
    await storage.delete(key);
    await expect(storage.presignDownload(key)).rejects.toThrow();
  });

  it("rejects presigning a download for an unknown key", async () => {
    const storage = new FakeStorageService();

    await expect(storage.presignDownload("never-uploaded")).rejects.toThrow();
  });
});
