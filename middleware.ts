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

  // 2. Lógica estricta de redirección según roles (Validación por Email)
  if (user && (isAdminRoute || isBarberRoute || isClientRoute)) {
    const userEmail = user.email?.toLowerCase().trim() || ''
    let userRole = user.user_metadata?.app_role

    // 🔥 MODO DIOS (ACCESO TOTAL POR EMAIL)
    // Esto evita que el middleware te saque si hay errores de sincronización de ID
    const masterAdmins = ["balfaroy.trnet@gmail.com", "lunacesar4493@gmail.com"];

    if (masterAdmins.includes(userEmail)) {
      userRole = 'ADMIN';
    } else {
      // 🛡️ BLINDAJE: Si no es Master, buscamos en DB por EMAIL (No por ID)
      // Primero revisamos si es barbero
      const { data: barberData } = await supabase
        .from('Barbers')
        .select('id')
        .ilike('email', userEmail)
        .single();
      
      if (barberData) {
        userRole = 'BARBER';
      } else {
        // Si no es barbero, revisamos la tabla User para ver si es ADMIN
        const { data: userProfile } = await supabase
          .from('User')
          .select('role')
          .ilike('email', userEmail)
          .single();
        
        userRole = userProfile?.role || 'CLIENT';
      }
    }

    // --- REGLAS DE TRÁFICO ---

    // Regla 1: Zona Admin (Solo entra si userRole es ADMIN)
    if (isAdminRoute && userRole !== 'ADMIN') {
      const fallbackUrl = userRole === 'BARBER' ? '/dashboards/barber' : '/dashboards/client/book'
      return NextResponse.redirect(new URL(fallbackUrl, request.url))
    }

    // Regla 2: Zona Barbero (Entra si es BARBER o ADMIN)
    if (isBarberRoute && userRole !== 'BARBER' && userRole !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboards/client/book', request.url))
    }

    // Regla 3: Zona Cliente (Si es Barbero, mándalo a su estación)
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