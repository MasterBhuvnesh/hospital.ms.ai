import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { cfg, has } from '../config.js'
import { serviceUnavailable } from '../lib/errors.js'

let client: S3Client | null = null

function getClient(): S3Client {
  if (!has.s3) throw serviceUnavailable('STORAGE_UNAVAILABLE', 'S3 credentials not configured')
  if (!client) {
    client = new S3Client({
      region: cfg.s3.region,
      endpoint: cfg.s3.endpoint || undefined,
      forcePathStyle: Boolean(cfg.s3.endpoint),
      credentials: {
        accessKeyId: cfg.s3.accessKeyId,
        secretAccessKey: cfg.s3.secretAccessKey,
      },
    })
  }
  return client
}

export async function putObject(key: string, body: Buffer | Uint8Array, contentType: string) {
  const c = getClient()
  await c.send(
    new PutObjectCommand({
      Bucket: cfg.s3.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  )
  return {
    key,
    publicUrl: cfg.s3.publicUrl ? `${cfg.s3.publicUrl}/${cfg.s3.bucket}/${key}` : null,
  }
}

export async function presignGet(key: string, expiresInSeconds = 300): Promise<string> {
  const c = getClient()
  return getSignedUrl(
    c,
    new GetObjectCommand({ Bucket: cfg.s3.bucket, Key: key }),
    { expiresIn: expiresInSeconds },
  )
}

export async function deleteObject(key: string): Promise<void> {
  const c = getClient()
  await c.send(new DeleteObjectCommand({ Bucket: cfg.s3.bucket, Key: key }))
}
