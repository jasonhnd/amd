import bcrypt from 'bcryptjs'
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { findUser } from '@/lib/users'
import { authConfig } from '@/auth.config'

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? '')
        const password = String(credentials?.password ?? '')
        const user = findUser(email)

        if (!user) {
          return null
        }

        const valid = await bcrypt.compare(password, user.passwordHash)
        if (!valid) {
          return null
        }

        return { id: user.email, email: user.email, name: user.name }
      },
    }),
  ],
})
