import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

let client: S3Client | null = null

function getS3Client(): S3Client {
  if (client) return client

  client = new S3Client({
    region: process.env.S3_REGION || 'auto',
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
    },
    forcePathStyle: true,
  })

  return client
}

const BUCKET = process.env.S3_BUCKET || 'adminyzr-documents'

/**
 * Upload a file to R2/S3.
 */
export async function uploadToR2(key: string, body: Buffer, contentType: string): Promise<string> {
  const s3 = getS3Client()

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  }))

  return key
}

/**
 * Get a signed URL for downloading a file from R2/S3 (24h expiry).
 */
export async function getSignedDownloadUrl(key: string): Promise<string> {
  const s3 = getS3Client()

  const url = await getSignedUrl(s3, new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  }), { expiresIn: 86400 }) // 24 hours

  return url
}
