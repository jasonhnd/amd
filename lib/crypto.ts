import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGO = 'aes-256-gcm'
const IV_LEN = 12

function getKey(): Buffer {
  const raw = process.env.APP_ENCRYPTION_KEY
  if (!raw) {
    throw new Error('APP_ENCRYPTION_KEY is not configured')
  }
  const key = Buffer.from(raw, 'base64')
  if (key.length !== 32) {
    throw new Error('APP_ENCRYPTION_KEY must be 32 bytes base64')
  }
  return key
}

/** AES-256-GCM. Output: base64url(iv).base64url(tag).base64url(ciphertext) */
export function encryptString(plaintext: string): string {
  const iv = randomBytes(IV_LEN)
  const cipher = createCipheriv(ALGO, getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv, tag, encrypted].map((b) => b.toString('base64url')).join('.')
}

export function decryptString(blob: string): string {
  const parts = blob.split('.')
  if (parts.length !== 3) {
    throw new Error('Invalid ciphertext blob')
  }
  const [ivB64, tagB64, dataB64] = parts
  const iv = Buffer.from(ivB64, 'base64url')
  const tag = Buffer.from(tagB64, 'base64url')
  const data = Buffer.from(dataB64, 'base64url')
  const decipher = createDecipheriv(ALGO, getKey(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}

export function encryptJson(value: unknown): string {
  return encryptString(JSON.stringify(value))
}

export function decryptJson<T>(blob: string): T {
  return JSON.parse(decryptString(blob)) as T
}

export function isEncryptionConfigured(): boolean {
  try {
    const raw = process.env.APP_ENCRYPTION_KEY
    if (!raw) return false
    return Buffer.from(raw, 'base64').length === 32
  } catch {
    return false
  }
}
