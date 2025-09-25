import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseApiClient } from '@/lib/supabase-api'
import { google } from 'googleapis'

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseApiClient(request)
    
    const {
      data: { session },
    } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'No autorizado'
      }, { status: 401 })
    }

    // Obtener el token de Google del provider_token
    const googleAccessToken = session.provider_token
    
    if (!googleAccessToken) {
      return NextResponse.json({
        success: false,
        error: 'Token de Google no encontrado. Inicia sesión con Google.'
      }, { status: 401 })
    }

    // Configurar Google API
    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: googleAccessToken })
    
    const classroom = google.classroom({
      version: 'v1',
      auth: auth
    })

    // Obtener cursos
    const response = await classroom.courses.list({
      pageSize: 100,
      courseStates: ['ACTIVE']
    })

    const courses = response.data.courses?.map((course: any) => ({
      id: course.id,
      name: course.name,
      section: course.section,
      description: course.description,
      room: course.room,
      ownerId: course.ownerId,
      creationTime: course.creationTime,
      updateTime: course.updateTime,
      enrollmentCode: course.enrollmentCode,
      courseState: course.courseState,
      alternateLink: course.alternateLink
    })) || []
    
    return NextResponse.json({
      success: true,
      data: courses
    })
  } catch (error) {
    console.error('Error en API de cursos:', error)
    return NextResponse.json({
      success: false,
      error: 'Error al obtener los cursos'
    }, { status: 500 })
  }
}

