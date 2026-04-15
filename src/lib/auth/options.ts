import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { supabaseAdmin } from '@/lib/supabase/server'
import type { UserRole } from '@/types'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          // Only request identity scopes for regular login.
          // Drive + Slides scopes were previously requested here but alarmed
          // users on every login — those permissions are only needed for the
          // admin's stored refresh token (Drive mirroring, Slides publishing)
          // which was already captured and lives in the users table.
          // If the admin token ever needs to be re-authorized, use the
          // /admin/reconnect-drive page (future) to trigger incremental auth.
          access_type: 'offline',
          response_type: 'code',
          hd: 'huntingtonsteel.com',
          scope: 'openid email profile',
        },
      },
    }),
  ],

  pages: {
    signIn: '/login',
    error: '/login',
  },

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  callbacks: {
    /**
     * Called when a user signs in.
     * Enforce @huntingtonsteel.com domain restriction.
     */
    async signIn({ user }) {
      const email = user.email
      if (!email || !email.endsWith('@huntingtonsteel.com')) {
        return '/login?error=unauthorized'
      }

      try {
        // Upsert user into our database
        const { data: existingUser } = await supabaseAdmin
          .from('users')
          .select('id, role')
          .eq('email', email)
          .single()

        if (existingUser) {
          // Update last login
          await supabaseAdmin
            .from('users')
            .update({ last_login: new Date().toISOString(), name: user.name, image: user.image })
            .eq('email', email)
        } else {
          // Create new user - check if this is the admin email
          const adminEmail = process.env.ADMIN_EMAIL || 'emaloney@huntingtonsteel.com'
          const role: UserRole = email === adminEmail ? 'admin' : 'user'

          await supabaseAdmin.from('users').insert({
            email,
            name: user.name,
            image: user.image,
            role,
          })
        }
      } catch (error) {
        console.error('Error upserting user on sign in:', error)
        // Don't block sign in if DB write fails
      }

      return true
    },

    /**
     * Called when JWT is created/updated.
     * Add user ID, role, and Google refresh token to token.
     */
    async jwt({ token, user, account }) {
      if (user && account) {
        // Initial sign in — capture Google OAuth tokens
        try {
          const { data: dbUser } = await supabaseAdmin
            .from('users')
            .select('id, role')
            .eq('email', token.email!)
            .single()

          if (dbUser) {
            token.id = dbUser.id
            token.role = dbUser.role as UserRole
          }

          // Store refresh token in DB for server-side Google API calls
          if (account.refresh_token) {
            await supabaseAdmin
              .from('users')
              .update({ google_refresh_token: account.refresh_token })
              .eq('email', token.email!)
          }
        } catch (error) {
          console.error('Error fetching user role for JWT:', error)
        }
      }

      return token
    },

    /**
     * Called when session is checked.
     * Expose id and role to the client session.
     */
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as UserRole
      }
      return session
    },
  },

  events: {
    async signOut({ token }) {
      // Optional: log sign out to audit log
      if (token?.id) {
        try {
          await supabaseAdmin.from('audit_log').insert({
            user_id: token.id,
            action: 'sign_out',
            entity_type: 'user',
            entity_id: token.id as string,
          })
        } catch {
          // Non-critical, ignore errors
        }
      }
    },
  },
}
