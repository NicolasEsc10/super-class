import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { google } from 'googleapis'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Obtener usuario autenticado
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

    // Obtener sesión para tokens
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.provider_token) {
      return NextResponse.json({
        success: false,
        error: 'Token de Google no encontrado. Inicia sesión nuevamente.'
      }, { status: 401 })
    }

    // Configurar Google API
    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: session.provider_token })

    const classroom = google.classroom({
      version: 'v1',
      auth: auth
    })

    console.log('🔍 Obteniendo cursos donde soy estudiante únicamente...')

    // Obtener todos los cursos activos
    const coursesResponse = await classroom.courses.list({
      pageSize: 50,
      courseStates: ['ACTIVE']
    })

    const allCourses = coursesResponse.data.courses || []
    console.log(`📚 Encontrados ${allCourses.length} cursos en total`)

    // Filtrar solo cursos donde soy estudiante (no profesor)
    const studentCourses = []
    
    for (const course of allCourses) {
      try {
        // Verificar si soy estudiante en este curso
        await classroom.courses.students.get({
          courseId: course.id!,
          userId: 'me'
        })
        
        // Si llegamos aquí, soy estudiante en este curso
        console.log(`✅ Estudiante confirmado en: ${course.name}`)
        
        studentCourses.push({
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
          
          // Información adicional
          isOwner: false, // Siempre false porque filtramos solo estudiantes
          isStudent: true, // Siempre true porque filtramos solo estudiantes
          hasEnrollmentCode: !!course.enrollmentCode,
          
          // Formateo de fechas
          createdDate: course.creationTime ? new Date(course.creationTime).toLocaleDateString('es-ES') : null,
          updatedDate: course.updateTime ? new Date(course.updateTime).toLocaleDateString('es-ES') : null,
        })
        
      } catch (studentError: any) {
        // No soy estudiante en este curso, lo ignoramos
        console.log(`⏭️ No soy estudiante en: ${course.name} (probablemente soy profesor)`)
      }
    }

    console.log(`🎓 Filtrados ${studentCourses.length} cursos donde soy estudiante`)

    return NextResponse.json({
      success: true,
      data: {
        courses: studentCourses,
        totalCourses: studentCourses.length,
        totalAllCourses: allCourses.length,
        userInfo: {
          id: user.id,
          email: user.email,
          name: user.user_metadata?.full_name || user.user_metadata?.name
        }
      }
    })

  } catch (error: any) {
    console.error('❌ Error obteniendo cursos de estudiante:', error)
    
    if (error.message?.includes('insufficient authentication scopes')) {
      return NextResponse.json({
        success: false,
        error: 'Permisos insuficientes. Por favor, vuelve a autorizar la aplicación.'
      }, { status: 403 })
    }

    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 })
  }
}
