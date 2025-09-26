import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { google } from 'googleapis'

interface TeacherCourse {
  id: string
  name: string
  description?: string
  section?: string
  room?: string
  ownerId: string
  creationTime: string
  updateTime: string
  enrollmentCode?: string
  courseState: 'ACTIVE' | 'ARCHIVED' | 'PROVISIONED' | 'DECLINED' | 'SUSPENDED'
  alternateLink?: string
  teacherGroup?: string
  courseGroup?: string
  guardiansEnabled: boolean
  calendarId: string
  studentCount?: number
  assignmentCount?: number
}

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

    // Configurar autenticación de Google
    const auth = new google.auth.OAuth2()
    auth.setCredentials({
      access_token: session.provider_token,
      refresh_token: session.provider_refresh_token
    })

    const classroom = google.classroom({
      version: 'v1',
      auth: auth
    })

    // Obtener cursos donde soy profesor
    const coursesResponse = await classroom.courses.list({
      pageSize: 50,
      courseStates: ['ACTIVE']
    })

    const courses = coursesResponse.data.courses || []
    const teacherCourses: TeacherCourse[] = []

    // Procesar cada curso para obtener información detallada
    for (const course of courses) {
      try {
        // Verificar si soy profesor en este curso
        let isTeacher = false
        try {
          const teachersResponse = await classroom.courses.teachers.get({
            courseId: course.id!,
            userId: 'me'
          })
          isTeacher = true
        } catch (teacherError: any) {
          // No soy profesor en este curso
          continue
        }

        if (!isTeacher) continue

        // Obtener información adicional del curso
        let studentCount = 0
        let assignmentCount = 0

        try {
          // Contar estudiantes
          const studentsResponse = await classroom.courses.students.list({
            courseId: course.id!,
            pageSize: 1000
          })
          studentCount = studentsResponse.data.students?.length || 0
        } catch (error) {
          // Error contando estudiantes
        }

        try {
          // Contar tareas
          const assignmentsResponse = await classroom.courses.courseWork.list({
            courseId: course.id!,
            pageSize: 1000
          })
          assignmentCount = assignmentsResponse.data.courseWork?.length || 0
        } catch (error) {
          // Error contando tareas
        }

        const teacherCourse: TeacherCourse = {
          id: course.id!,
          name: course.name || 'Sin nombre',
          description: course.description || undefined,
          section: course.section || undefined,
          room: course.room || undefined,
          ownerId: course.ownerId || '',
          creationTime: course.creationTime || '',
          updateTime: course.updateTime || '',
          enrollmentCode: course.enrollmentCode || undefined,
          courseState: (course.courseState as any) || 'ACTIVE',
          alternateLink: course.alternateLink || undefined,
          teacherGroup: course.teacherGroupEmail || undefined,
          courseGroup: course.courseGroupEmail || undefined,
          guardiansEnabled: course.guardiansEnabled || false,
          calendarId: course.calendarId || '',
          studentCount,
          assignmentCount
        }

        teacherCourses.push(teacherCourse)
      } catch (courseError: any) {
        // Error procesando curso individual
        continue
      }
    }

    // Ordenar por fecha de actualización (más recientes primero)
    teacherCourses.sort((a, b) => 
      new Date(b.updateTime).getTime() - new Date(a.updateTime).getTime()
    )

    return NextResponse.json({
      success: true,
      data: {
        courses: teacherCourses,
        total: teacherCourses.length
      }
    })

  } catch (error: any) {
    console.error('Error obteniendo cursos del profesor:', error.message)
    
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 })
  }
}
