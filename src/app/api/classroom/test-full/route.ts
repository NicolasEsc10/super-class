import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseApiClient } from '@/lib/supabase-api'
import { google } from 'googleapis'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseApiClient()
    
    // Usar getUser() para mayor seguridad
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({
        success: false,
        error: 'No autorizado - Usuario no encontrado'
      }, { status: 401 })
    }

    // También obtenemos la sesión para los tokens
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.provider_token) {
      return NextResponse.json({
        success: false,
        error: 'Token de Google no encontrado. Inicia sesión con Google.'
      }, { status: 401 })
    }

    // Configurar Google API
    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: session.provider_token })

    const results = {
      basicProfile: null as any,
      courses: [] as any[],
      classroomError: null as string | null,
      hasClassroomAccess: false
    }

    // 1. Obtener perfil básico
    try {
      const oauth2 = google.oauth2({
        version: 'v2',
        auth: auth
      })
      
      const profileResponse = await oauth2.userinfo.get()
      results.basicProfile = profileResponse.data
    } catch (error) {
      console.error('Error obteniendo perfil básico:', error)
    }

    // 2. Intentar acceder a Google Classroom
    try {
      const classroom = google.classroom({
        version: 'v1',
        auth: auth
      })

      // Intentar obtener cursos
      const coursesResponse = await classroom.courses.list({
        pageSize: 10,
        courseStates: ['ACTIVE']
      })

      results.courses = coursesResponse.data.courses || []
      results.hasClassroomAccess = true

      console.log(`✅ Classroom API: Encontrados ${results.courses.length} cursos`)

    } catch (error) {
      console.error('❌ Error accediendo a Classroom API:', error)
      results.classroomError = error instanceof Error ? error.message : String(error)
      results.hasClassroomAccess = false
    }

    return NextResponse.json({
      success: true,
      data: {
        user: user,
        basicProfile: results.basicProfile,
        classroomAccess: results.hasClassroomAccess,
        coursesCount: results.courses.length,
        courses: results.courses.slice(0, 3), // Solo primeros 3 para no saturar
        error: results.classroomError
      }
    })
  } catch (error) {
    console.error('Error en test completo:', error)
    return NextResponse.json({
      success: false,
      error: 'Error en el servidor: ' + (error instanceof Error ? error.message : String(error))
    }, { status: 500 })
  }
}
