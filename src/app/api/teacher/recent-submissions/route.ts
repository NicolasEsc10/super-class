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

    // Configurar OAuth2
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    )

    oauth2Client.setCredentials({
      access_token: session.provider_token,
      refresh_token: session.provider_refresh_token
    })

    const classroom = google.classroom({ version: 'v1', auth: oauth2Client })

    // Obtener todos los cursos del profesor
    const coursesResponse = await classroom.courses.list({
      teacherId: 'me',
      pageSize: 100
    })

    const courses = coursesResponse.data.courses || []
    const recentSubmissions: Array<{
      studentId: string
      studentName: string
      courseName: string
      courseId: string
      assignmentTitle: string
      assignmentId: string
      submissionTime: string
      isLate: boolean
      grade?: number
      maxPoints?: number
      status: 'TURNED_IN' | 'RETURNED'
    }> = []

    // Analizar cada curso
    for (const course of courses) {
      if (!course.id) continue

      try {
        // Obtener tareas del curso
        const assignmentsResponse = await classroom.courses.courseWork.list({
          courseId: course.id,
          pageSize: 100
        })

        const assignments = assignmentsResponse.data.courseWork || []

        // Analizar cada tarea
        for (const assignment of assignments) {
          if (!assignment.id) continue

          try {
            // Obtener entregas de esta tarea
            const submissionsResponse = await classroom.courses.courseWork.studentSubmissions.list({
              courseId: course.id,
              courseWorkId: assignment.id,
              pageSize: 1000
            })

            const submissions = submissionsResponse.data.studentSubmissions || []

            // Procesar cada entrega
            for (const submission of submissions) {
              if (submission.state === 'TURNED_IN' || submission.state === 'RETURNED') {
                // Obtener información del estudiante
                let studentName = 'Estudiante'
                try {
                  const studentResponse = await classroom.courses.students.get({
                    courseId: course.id,
                    userId: submission.userId!
                  })
                  const student = studentResponse.data
                  studentName = student.profile?.name?.fullName || 
                               `${student.profile?.name?.givenName || ''} ${student.profile?.name?.familyName || ''}`.trim() ||
                               student.profile?.emailAddress?.split('@')[0] || 'Estudiante'
                } catch (error) {
                  // Si no se puede obtener el nombre, usar ID
                  studentName = `Estudiante ${submission.userId?.slice(-4) || ''}`
                }

                // Determinar si está atrasada
                let isLate = false
                if (assignment.dueDate && submission.state === 'TURNED_IN') {
                  const dueDate = new Date(assignment.dueDate)
                  const submissionTime = new Date(submission.submissionHistory?.[0]?.stateHistory?.[0]?.stateTimestamp || submission.updateTime || '')
                  isLate = submissionTime > dueDate
                }

                recentSubmissions.push({
                  studentId: submission.userId!,
                  studentName,
                  courseName: course.name || 'Curso sin nombre',
                  courseId: course.id,
                  assignmentTitle: assignment.title || 'Tarea sin título',
                  assignmentId: assignment.id,
                  submissionTime: submission.submissionHistory?.[0]?.stateHistory?.[0]?.stateTimestamp || submission.updateTime || '',
                  isLate,
                  grade: submission.assignedGrade,
                  maxPoints: assignment.maxPoints,
                  status: submission.state as 'TURNED_IN' | 'RETURNED'
                })
              }
            }
          } catch (error) {
            // Error obteniendo entregas de esta tarea
            continue
          }
        }
      } catch (error) {
        console.error(`Error analizando curso ${course.name}:`, error)
        // Continuar con el siguiente curso
      }
    }

    // Ordenar por fecha de entrega (más recientes primero)
    recentSubmissions.sort((a, b) => {
      const dateA = new Date(a.submissionTime).getTime()
      const dateB = new Date(b.submissionTime).getTime()
      return dateB - dateA
    })

    return NextResponse.json({
      success: true,
      data: {
        recentSubmissions: recentSubmissions.slice(0, 10), // Top 10 entregas más recientes
        total: recentSubmissions.length
      }
    })

  } catch (error) {
    console.error('Error obteniendo entregas recientes:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}
