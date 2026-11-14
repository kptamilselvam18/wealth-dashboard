import type { NextAuthConfig } from "next-auth"

/**
 * Edge-safe part of the NextAuth configuration.
 * It must not import Prisma, bcrypt or any Node-only module, because it is
 * loaded by the middleware (edge runtime).
 */
export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  providers: [],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
      }
      if (trigger === "update" && session && typeof session === "object") {
        const nextSession = session as { name?: unknown }
        if (typeof nextSession.name === "string" && nextSession.name.trim()) {
          token.name = nextSession.name.trim()
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token?.id && session.user) {
        session.user.id = token.id as string
      }
      return session
    },
  },
} satisfies NextAuthConfig
