import { S3Client } from "@aws-sdk/client-s3";

const REGION = "ap-south-1";

const s3Client = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY as string,
    secretAccessKey: process.env.AWS_SECRET_KEY as string
  }
});

export { s3Client };
