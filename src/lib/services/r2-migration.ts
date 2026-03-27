/**
 * R2 migration utility.
 *
 * Helper function that copies every object from one S3-compatible bucket to
 * another.  Useful when migrating from AWS S3 to Cloudflare R2 (or between
 * any two S3-compatible providers).
 *
 * NOT intended for production use — run this from a script or the Payload
 * admin shell as a one-off migration task.
 *
 * Usage example (from a Node REPL or script):
 *
 *   import { migrateToR2 } from '@/lib/services/r2-migration'
 *
 *   const stats = await migrateToR2({
 *     source: {
 *       endpoint: undefined,                // AWS default endpoint
 *       region: 'eu-central-1',
 *       accessKeyId: '...',
 *       secretAccessKey: '...',
 *       bucket: 'adminyzr-documents',
 *     },
 *     destination: {
 *       endpoint: 'https://<account-id>.r2.cloudflarestorage.com',
 *       region: 'auto',
 *       accessKeyId: '...',
 *       secretAccessKey: '...',
 *       bucket: 'adminyzr-documents',
 *     },
 *   })
 *   console.log(stats)
 */

import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3'
import type { Readable } from 'stream'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BucketConfig {
  /** S3 endpoint URL.  Leave undefined for the default AWS endpoint. */
  endpoint?: string
  region: string
  accessKeyId: string
  secretAccessKey: string
  bucket: string
}

export interface MigrateOptions {
  source: BucketConfig
  destination: BucketConfig
  /** Only migrate objects whose key starts with this prefix. */
  prefix?: string
  /** If true, skip objects that already exist in the destination. Default: true */
  skipExisting?: boolean
  /** Called for every object after it has been processed. */
  onProgress?: (event: ProgressEvent) => void
}

export interface ProgressEvent {
  key: string
  status: 'copied' | 'skipped' | 'failed'
  error?: string
}

export interface MigrationStats {
  total: number
  copied: number
  skipped: number
  failed: number
  errors: Array<{ key: string; error: string }>
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildClient(cfg: BucketConfig): S3Client {
  return new S3Client({
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
    region: cfg.region,
    ...(cfg.endpoint ? { endpoint: cfg.endpoint } : {}),
    forcePathStyle: true,
  })
}

/** Convert a Readable / ReadableStream / Blob body to a Buffer. */
async function streamToBuffer(
  body: Readable | ReadableStream | Blob | undefined,
): Promise<Buffer> {
  if (!body) return Buffer.alloc(0)

  // Node Readable
  if ('pipe' in body && typeof (body as Readable).pipe === 'function') {
    const chunks: Buffer[] = []
    for await (const chunk of body as Readable) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
    }
    return Buffer.concat(chunks)
  }

  // Web ReadableStream
  if ('getReader' in body) {
    const reader = (body as ReadableStream).getReader()
    const chunks: Uint8Array[] = []
    let done = false
    while (!done) {
      const result = await reader.read()
      done = result.done
      if (result.value) chunks.push(result.value)
    }
    return Buffer.concat(chunks)
  }

  // Blob
  if ('arrayBuffer' in body) {
    return Buffer.from(await (body as Blob).arrayBuffer())
  }

  return Buffer.alloc(0)
}

async function objectExists(
  client: S3Client,
  bucket: string,
  key: string,
): Promise<boolean> {
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
    return true
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Migration
// ---------------------------------------------------------------------------

/**
 * Migrate all objects from a source bucket to a destination bucket.
 *
 * Objects are downloaded from the source and re-uploaded to the destination,
 * preserving the object key and Content-Type.  This is the safest approach and
 * works across providers (e.g. AWS S3 -> Cloudflare R2).
 */
export async function migrateToR2(
  options: MigrateOptions,
): Promise<MigrationStats> {
  const { source, destination, prefix, onProgress } = options
  const skipExisting = options.skipExisting ?? true

  const srcClient = buildClient(source)
  const dstClient = buildClient(destination)

  const stats: MigrationStats = {
    total: 0,
    copied: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  }

  // Paginate through all objects in the source bucket.
  let continuationToken: string | undefined

  do {
    const listResponse = await srcClient.send(
      new ListObjectsV2Command({
        Bucket: source.bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    )

    const objects = listResponse.Contents ?? []

    for (const obj of objects) {
      const key = obj.Key
      if (!key) continue

      stats.total++

      try {
        // Optionally skip objects that already exist in the destination.
        if (skipExisting) {
          const exists = await objectExists(dstClient, destination.bucket, key)
          if (exists) {
            stats.skipped++
            onProgress?.({ key, status: 'skipped' })
            continue
          }
        }

        // Download from source.
        const getResponse = await srcClient.send(
          new GetObjectCommand({ Bucket: source.bucket, Key: key }),
        )

        const body = await streamToBuffer(getResponse.Body as Readable | ReadableStream | Blob | undefined)

        // Upload to destination, preserving Content-Type.
        await dstClient.send(
          new PutObjectCommand({
            Bucket: destination.bucket,
            Key: key,
            Body: body,
            ContentType: getResponse.ContentType ?? 'application/octet-stream',
          }),
        )

        // Verify the object exists in the destination.
        const verified = await objectExists(dstClient, destination.bucket, key)
        if (!verified) {
          throw new Error('Object was uploaded but could not be verified in destination')
        }

        stats.copied++
        onProgress?.({ key, status: 'copied' })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        stats.failed++
        stats.errors.push({ key, error: message })
        onProgress?.({ key, status: 'failed', error: message })
      }
    }

    continuationToken = listResponse.NextContinuationToken
  } while (continuationToken)

  return stats
}
