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

  // 1. Identificamos qué tipo de ruta está intentando visitar (Corregido a la estructura real)
  const isAdminRoute = path.startsWith('/dashboards/admin')
  const isBarberRoute = path.startsWith('/dashboards/barber')
  const isClientRoute = path.startsWith('/dashboards/client')

  // 2. Si es una ruta protegida y NO hay usuario, a login de inmediato
  if (!user && (isAdminRoute || isBarberRoute || isClientRoute)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 3. Lógica estricta de redirección según roles
  if (user && (isAdminRoute || isBarberRoute || isClientRoute)) {
    // Leemos el rol. Priorizamos el JWT (user_metadata) por rendimiento.
    let userRole = user.user_metadata?.app_role

    // Si no está en metadata, consultamos la base de datos
    if (!userRole) {
      const { data: userProfile } = await supabase.from('User').select('role').eq('id', user.id).single()
      userRole = userProfile?.role || 'CLIENT' // Asumimos cliente por defecto
    }

    // REGLA 1: Zona Admin (Solo Administradores)
    if (isAdminRoute && userRole !== 'ADMIN') {
      const fallbackUrl = userRole === 'BARBER' ? '/dashboards/barber' : '/dashboards/client/book'
      return NextResponse.redirect(new URL(fallbackUrl, request.url))
    }

    // REGLA 2: Zona Barbero (Administradores y Barberos)
    if (isBarberRoute && userRole !== 'BARBER' && userRole !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboards/client/book', request.url))
    }

    // REGLA 3: Zona Cliente (Administradores y Clientes. Barberos NO entran aquí)
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