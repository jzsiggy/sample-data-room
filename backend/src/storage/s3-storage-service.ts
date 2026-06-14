import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  PresignedDownload,
  PresignedUpload,
  StorageService,
} from "./storage-service";

export interface S3StorageConfig {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

const PRESIGN_TTL_SECONDS = 300;

/**
 * S3-compatible StorageService. Points at MinIO locally and at S3/R2 in
 * production purely through configuration (`forcePathStyle` is required for
 * MinIO). Not exercised by the walking-skeleton tests — the fake stands in —
 * but shipped so issue 05 has a real implementation to build on.
 */
export class S3StorageService implements StorageService {
  private readonly client: S3Client;

  constructor(private readonly config: S3StorageConfig) {
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  async presignUpload(
    key: string,
    contentType: string,
  ): Promise<PresignedUpload> {
    const command = new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
      ContentType: contentType,
    });
    const url = await getSignedUrl(this.client, command, {
      expiresIn: PRESIGN_TTL_SECONDS,
    });
    return { url, key };
  }

  async presignDownload(key: string): Promise<PresignedDownload> {
    const command = new GetObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
    });
    const url = await getSignedUrl(this.client, command, {
      expiresIn: PRESIGN_TTL_SECONDS,
    });
    return { url };
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.config.bucket, Key: key }),
    );
  }
}
