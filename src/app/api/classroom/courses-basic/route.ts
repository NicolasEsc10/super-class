import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseApiClient } from '@/lib/supabase-api'
import { google } from 'googleapis'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseApiClient()
    
    // Obtener usuario autenticado de forma segura
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser()
    
    if (userError) {
      console.error('Error al obtener usuario:', userError.message)
      return NextResponse.json({
        success: false,
        error: 'Error de autenticación: ' + userError.message
      }, { status: 401 })
    }

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'No autorizado - Usuario no válido'
      }, { status: 401 })
    }

    // Obtener sesión para el provider token
    const {
      data: { session },
      error: sessionError
    } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      console.error('Error al obtener sesión:', sessionError?.message || 'Sesión no encontrada')
      return NextResponse.json({
        success: false,
        error: 'Sesión no válida'
      }, { status: 401 })
    }

    if (!session.provider_token) {
      return NextResponse.json({
        success: false,
        error: 'Token de Google no encontrado. Por favor, vuelve a iniciar sesión.'
      }, { status: 401 })
    }

    // Configurar Google API
    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: session.provider_token })

    const classroom = google.classroom({
      version: 'v1',
      auth: auth
    })

    // Obtener cursos básicos
    const coursesResponse = await classroom.courses.list({
      pageSize: 50,
      courseStates: ['ACTIVE']
    })

    const courses = coursesResponse.data.courses || []
    
    // Para cada curso, obtener toda la información básica disponible
    const detailedCourses = courses.map(course => {
      
      return {
        // Información básica del curso
        id: course.id,
        name: course.name,
        section: course.section,
        description: course.description,
        room: course.room,
        ownerId: course.ownerId,
        courseState: course.courseState,
        enrollmentCode: course.enrollmentCode,
        alternateLink: course.alternateLink,
        
        // Fechas
        creationTime: course.creationTime,
        updateTime: course.updateTime,
        
        // Información adicional que podemos derivar
        isOwner: course.ownerId === user.user_metadata?.sub || course.ownerId === user.id,
        hasEnrollmentCode: !!course.enrollmentCode,
        
        // Formateo de fechas
        createdDate: course.creationTime ? new Date(course.creationTime).toLocaleDateString('es-ES') : null,
        updatedDate: course.updateTime ? new Date(course.updateTime).toLocaleDateString('es-ES') : null,
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        courses: detailedCourses,
        totalCourses: detailedCourses.length,
        userInfo: {
          id: user.id,
          email: user.email,
          name: user.user_metadata?.full_name || user.user_metadata?.name
        }
      }
    })
  } catch (error: any) {
    console.error('❌ Error obteniendo información básica de cursos:', error)
    
    // Manejar errores específicos de autenticación
    if (error.message?.includes('refresh_token_not_found') || 
        error.message?.includes('Invalid Refresh Token')) {
      return NextResponse.json({
        success: false,
        error: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.'
      }, { status: 401 })
    }
    
    // Manejar errores de la API de Google
    if (error.code === 401 || error.status === 401) {
      return NextResponse.json({
        success: false,
        error: 'Token de Google expirado. Por favor, vuelve a autorizar la aplicación.'
      }, { status: 401 })
    }
    
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor: ' + (error.message || 'Error desconocido')
    }, { status: 500 })
  }
}
