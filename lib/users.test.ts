import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

describe('findUser', () => {
  it('finds a user case-insensitively from AMD_USERS', async () => {
    process.env.AMD_USERS = JSON.stringify([
      { email: 'yaku@team.com', name: 'Yaku', passwordHash: 'h1' },
    ])

    const { findUser } = await import('./users')

    expect(findUser('YAKU@team.com')?.name).toBe('Yaku')
    expect(findUser('nobody@team.com')).toBeUndefined()
  })
})
