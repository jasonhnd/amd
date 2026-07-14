import { describe, expect, it } from 'vitest'
import { roleAtLeast } from './roles'

describe('roleAtLeast', () => {
  it('orders owner > editor > viewer', () => {
    expect(roleAtLeast('owner', 'editor')).toBe(true)
    expect(roleAtLeast('editor', 'editor')).toBe(true)
    expect(roleAtLeast('viewer', 'editor')).toBe(false)
    expect(roleAtLeast('viewer', 'viewer')).toBe(true)
  })
})
