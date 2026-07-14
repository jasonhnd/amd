import { afterEach, describe, expect, it } from 'vitest'
import { decryptJson, decryptString, encryptJson, encryptString } from './crypto'

const TEST_KEY = Buffer.alloc(32, 7).toString('base64')

describe('crypto AES-256-GCM', () => {
  const prev = process.env.APP_ENCRYPTION_KEY

  afterEach(() => {
    if (prev === undefined) {
      delete process.env.APP_ENCRYPTION_KEY
    } else {
      process.env.APP_ENCRYPTION_KEY = prev
    }
  })

  it('round-trips strings', () => {
    process.env.APP_ENCRYPTION_KEY = TEST_KEY
    const blob = encryptString('hello secret')
    expect(blob.split('.')).toHaveLength(3)
    expect(decryptString(blob)).toBe('hello secret')
  })

  it('round-trips JSON payloads', () => {
    process.env.APP_ENCRYPTION_KEY = TEST_KEY
    const payload = { propertyId: '298707336', serviceAccountJson: '{"a":1}' }
    const blob = encryptJson(payload)
    expect(decryptJson<typeof payload>(blob)).toEqual(payload)
  })

  it('fails with wrong key', () => {
    process.env.APP_ENCRYPTION_KEY = TEST_KEY
    const blob = encryptString('x')
    process.env.APP_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString('base64')
    expect(() => decryptString(blob)).toThrow()
  })
})
