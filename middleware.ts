import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const pathname = req.nextUrl.pathname

    // If authenticated, check domain restriction
    if (token) {
      const email = token.email as string | undefined
      if (email && !email.endsWith('@huntingtonsteel.com')) {
        const loginUrl = new URL('/login', req.url)
        loginUrl.searchParams.set('error', 'unauthorized')
        return NextResponse.redirect(loginUrl)
      }

      // Admin route protection
      if (pathname.startsWith('/dashboard/admin')) {
        const role = token.role as string | undefined
        // Library is accessible to lead + admin
        if (pathname.startsWith('/dashboard/admin/library')) {
          if (role !== 'admin' && role !== 'lead') {
            return NextResponse.redirect(new URL('/dashboard', req.url))
          }
        } else if (role !== 'admin') {
          return NextResponse.redirect(new URL('/dashboard', req.url))
        }
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname

        // Allow public routes without auth
        if (pathname === '/login') return true
        if (pathname === '/community') return true
        if (pathname === '/api/community-uploads' && req.method === 'POST') return true

        // All other routes require auth
        return !!token
      },
    },
    pages: {
      signIn: '/login',
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     * - public folder
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|public).*)',
  ],
}
