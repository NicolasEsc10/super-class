import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  // Solo procesar rutas de API protegidas para evitar llamadas innecesarias
  const protectedRoutes = ['/api/classroom', '/api/coordinator', '/api/teacher']
  const isProtectedRoute = protectedRoutes.some(route => 
    req.nextUrl.pathname.startsWith(route)
  )

  // Si no es una ruta protegida, continuar sin procesar
  if (!isProtectedRoute) {
    return NextResponse.next()
  }

  let res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value))
          res = NextResponse.next({
            request: {
              headers: req.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  try {
    // Verificar sesión solo para rutas protegidas
    const {
      data: { session },
      error
    } = await supabase.auth.getSession()

    // Si hay error al obtener la sesión, permitir que la ruta API maneje el error
    if (error) {
      console.warn('Middleware: Error al obtener sesión:', error.message)
      return res
    }

    // Si no hay sesión, retornar error de autorización
    if (!session) {
      return NextResponse.json(
        { 
          success: false,
          error: 'No autorizado - Sesión requerida' 
        },
        { status: 401 }
      )
    }

    return res
  } catch (error) {
    // En caso de error, permitir que la ruta API maneje la autenticación
    console.warn('Middleware: Error inesperado:', error)
    return res
  }
}

export const config = {
  matcher: [
    /*
     * Solo aplicar middleware a rutas de API protegidas
     * Excluir archivos estáticos y assets para mejor rendimiento
     */
    '/api/classroom/:path*',
    '/api/coordinator/:path*',
    '/api/teacher/:path*',
  ],
}
