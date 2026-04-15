import createMiddleware from 'next-intl/middleware'
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const intlMiddleware = createMiddleware({
  locales: ['en', 'es'],
  defaultLocale: 'en',
})

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isProtected = pathname.includes('/dashboard') ||
    pathname.includes('/book') ||
    pathname.includes('/account')

  let response = intlMiddleware(request)

  if (isProtected) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      const locale = pathname.split('/')[1] || 'es'
      return NextResponse.redirect(new URL(`/${locale}/login`, request.url))
    }
  }

  return response
}

export const matcher = [
  '/((?!_next/static|_next/image|favicon.ico).*)'
]