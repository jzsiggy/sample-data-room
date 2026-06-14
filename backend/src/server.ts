import { createApp } from "./app";
import { S3StorageService } from "./storage/s3-storage-service";

const port = Number(process.env.PORT ?? 3000);

const storage = new S3StorageService({
  endpoint: process.env.S3_ENDPOINT ?? "http://localhost:9000",
  region: process.env.S3_REGION ?? "us-east-1",
  accessKeyId: process.env.S3_ACCESS_KEY ?? "minioadmin",
  secretAccessKey: process.env.S3_SECRET_KEY ?? "minioadmin",
  bucket: process.env.S3_BUCKET ?? "dataroom",
});

const app = createApp({ storage });

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${port}`);
});
