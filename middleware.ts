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

  // 1. Identificamos qué tipo de ruta está intentando visitar
  const isAdminRoute = path.startsWith('/dashboards/admin')
  const isBarberRoute = path.startsWith('/dashboards/barber')
  const isClientRoute = path.startsWith('/client')

  // 2. Si es una ruta protegida y NO hay usuario, a login de inmediato
  if (!user && (isAdminRoute || isBarberRoute || isClientRoute)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 3. Lógica estricta de redirección según roles
  if (user) {
    // Leemos el rol. Priorizamos el JWT (user_metadata) por rendimiento.
    // Si no está ahí (usuarios antiguos), consultamos la tabla 'User'.
    let userRole = user.user_metadata?.app_role

    if (!userRole) {
      const { data: userProfile } = await supabase.from('User').select('role').eq('id', user.id).single()
      userRole = userProfile?.role || 'CLIENT' // Asumimos cliente por defecto
    }

    // Regla 1: Zona Admin
    if (isAdminRoute && userRole !== 'ADMIN') {
      const fallbackUrl = userRole === 'BARBER' ? '/dashboards/barber' : '/client/book'
      return NextResponse.redirect(new URL(fallbackUrl, request.url))
    }

    // Regla 2: Zona Barbero (Permitimos al ADMIN entrar a ver si es necesario)
    if (isBarberRoute && userRole !== 'BARBER' && userRole !== 'ADMIN') {
      return NextResponse.redirect(new URL('/client/book', request.url))
    }

    // Regla Opcional: Impedir que staff entre a rutas de cliente (puedes comentarlo si quieres que agenden)
    if (isClientRoute && (userRole === 'ADMIN' || userRole === 'BARBER')) {
      const correctUrl = userRole === 'ADMIN' ? '/dashboards/admin' : '/dashboards/barber'
      return NextResponse.redirect(new URL(correctUrl, request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}