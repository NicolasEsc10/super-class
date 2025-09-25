import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseApiClient } from '@/lib/supabase-api'
import { google } from 'googleapis'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseApiClient()
    
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({
        success: false,
        error: 'No autorizado'
      }, { status: 401 })
    }

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.provider_token) {
      return NextResponse.json({
        success: false,
        error: 'Token de Google no encontrado'
      }, { status: 401 })
    }

    // Configurar Google API
    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: session.provider_token })

    const classroom = google.classroom({
      version: 'v1',
      auth: auth
    })

    console.log('📚 Obteniendo información básica de cursos...')

    // Obtener cursos básicos
    const coursesResponse = await classroom.courses.list({
      pageSize: 50,
      courseStates: ['ACTIVE']
    })

    const courses = coursesResponse.data.courses || []
    
    // Para cada curso, obtener toda la información básica disponible
    const detailedCourses = courses.map(course => {
      console.log(`📖 Curso encontrado: ${course.name}`)
      console.log(`   - ID: ${course.id}`)
      console.log(`   - Sección: ${course.section || 'Sin sección'}`)
      console.log(`   - Descripción: ${course.description || 'Sin descripción'}`)
      console.log(`   - Aula: ${course.room || 'Sin aula'}`)
      console.log(`   - Estado: ${course.courseState}`)
      console.log(`   - Código de inscripción: ${course.enrollmentCode || 'No disponible'}`)
      console.log(`   - Creado: ${course.creationTime}`)
      console.log(`   - Actualizado: ${course.updateTime}`)
      console.log(`   - Propietario: ${course.ownerId}`)
      console.log(`   - Link: ${course.alternateLink}`)
      
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

    console.log(`✅ Total de cursos procesados: ${detailedCourses.length}`)

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
  } catch (error) {
    console.error('❌ Error obteniendo información básica de cursos:', error)
    return NextResponse.json({
      success: false,
      error: 'Error: ' + error.message
    }, { status: 500 })
  }
}
