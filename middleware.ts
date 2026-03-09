import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  const isAdminRoute = path.startsWith('/dashboards/admin')
  const isBarberRoute = path.startsWith('/dashboards/barber')
  const isClientRoute = path.startsWith('/dashboards/client')

  // 1. Si no hay usuario, a login de inmediato
  if (!user && (isAdminRoute || isBarberRoute || isClientRoute)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 2. Lógica estricta de redirección según roles
  if (user && (isAdminRoute || isBarberRoute || isClientRoute)) {
    let userRole = user.user_metadata?.app_role

    // 🛡️ BLINDAJE EXTRA: Si no tiene rol claro, revisamos directamente si su email es de un barbero.
    if (userRole !== 'ADMIN' && userRole !== 'BARBER') {
      const { data: isBarber } = await supabase.from('Barbers').select('id').eq('email', user.email).single();
      
      if (isBarber) {
        userRole = 'BARBER';
      } else {
        const { data: userProfile } = await supabase.from('User').select('role').eq('id', user.id).single();
        userRole = userProfile?.role || 'CLIENT';
      }
    }

    // Regla 1: Zona Admin
    if (isAdminRoute && userRole !== 'ADMIN') {
      const fallbackUrl = userRole === 'BARBER' ? '/dashboards/barber' : '/dashboards/client/book'
      return NextResponse.redirect(new URL(fallbackUrl, request.url))
    }

    // Regla 2: Zona Barbero
    if (isBarberRoute && userRole !== 'BARBER' && userRole !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboards/client/book', request.url))
    }

    // Regla 3: Zona Cliente
    if (isClientRoute && userRole === 'BARBER') {
      return NextResponse.redirect(new URL('/dashboards/barber', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}