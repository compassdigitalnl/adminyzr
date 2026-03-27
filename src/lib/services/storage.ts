/**
 * S3/R2-compatible storage utilities.
 *
 * Generates pre-signed URLs for secure file downloads and direct browser
 * uploads.  Works with both AWS S3 and Cloudflare R2 — the underlying
 * client is configured through the standard S3_* environment variables.
 */

import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// ---------------------------------------------------------------------------
// Shared S3 client (singleton)
// ---------------------------------------------------------------------------

let _client: S3Client | null = null

function getS3Client(): S3Client {
  if (_client) return _client

  _client = new S3Client({
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
    },
    region: process.env.S3_REGION || 'auto',
    ...(process.env.S3_ENDPOINT ? { endpoint: process.env.S3_ENDPOINT } : {}),
    forcePathStyle: true,
  })

  return _client
}

function getBucket(): string {
  return process.env.S3_BUCKET || 'adminyzr-documents'
}

// ---------------------------------------------------------------------------
// Pre-signed download URL
// ---------------------------------------------------------------------------

/**
 * Generate a pre-signed GET URL so a client can download a private object
 * without needing direct credentials.
 *
 * @param key       - The object key (path) in the bucket, e.g. "attachments/abc123.pdf"
 * @param expiresIn - Validity in seconds.  Defaults to 86 400 (24 hours).
 *                    R2 supports up to 7 days; S3 supports up to 7 days for
 *                    IAM users and 12 hours for STS/role credentials.
 */
export async function getSignedDownloadUrl(
  key: string,
  expiresIn: number = 86_400,
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: getBucket(),
    Key: key,
  })

  return getSignedUrl(getS3Client(), command, { expiresIn })
}

// ---------------------------------------------------------------------------
// Pre-signed upload URL
// ---------------------------------------------------------------------------

/**
 * Generate a pre-signed PUT URL so a browser can upload a file directly to
 * the bucket without proxying through the application server.
 *
 * @param key         - Destination object key, e.g. "attachments/abc123.pdf"
 * @param contentType - MIME type the client must use (e.g. "application/pdf").
 *                      The upload will be rejected if the Content-Type header
 *                      does not match.
 * @param expiresIn   - Validity in seconds.  Defaults to 3 600 (1 hour).
 */
export async function getSignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 3_600,
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: getBucket(),
    Key: key,
    ContentType: contentType,
  })

  return getSignedUrl(getS3Client(), command, { expiresIn })
}
