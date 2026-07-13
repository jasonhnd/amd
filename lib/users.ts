import { z } from 'zod'
import { env } from './env'

const userSchema = z.object({
  email: z.string().email(),
  name: z.string(),
  passwordHash: z.string(),
})

export type AmdUser = z.infer<typeof userSchema>

function readUsers(): AmdUser[] {
  try {
    return z.array(userSchema).catch([]).parse(JSON.parse(env.AMD_USERS()))
  } catch {
    return []
  }
}

export function findUser(email: string): AmdUser | undefined {
  const target = email.trim().toLowerCase()
  return readUsers().find((user) => user.email.toLowerCase() === target)
}
