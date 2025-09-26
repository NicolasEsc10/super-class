import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { google } from 'googleapis'

interface StudentAssignment {
  id: string
  courseId: string
  courseName: string
  title: string
  description?: string
  dueDate?: string
  creationTime: string
  state: 'NEW' | 'CREATED' | 'TURNED_IN' | 'RETURNED' | 'RECLAIMED_BY_STUDENT'
  assignedGrade?: number
  maxPoints?: number
  alternateLink?: string
  workType: 'ASSIGNMENT' | 'SHORT_ANSWER_QUESTION' | 'MULTIPLE_CHOICE_QUESTION'
  isLate: boolean
  isPending: boolean
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

    // Configurar Google API
    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: session.provider_token })

    const classroom = google.classroom({
      version: 'v1',
      auth: auth
    })

    console.log('🔍 Obteniendo tareas del estudiante (versión final)...')

    const studentAssignments: StudentAssignment[] = []
    const now = new Date()

    // Obtener TODOS los cursos (no filtrar por estudiante aquí)
    const coursesResponse = await classroom.courses.list({
      pageSize: 50,
      courseStates: ['ACTIVE']
    })

    const courses = coursesResponse.data.courses || []
    console.log(`📚 Encontrados ${courses.length} cursos`)

    // Para cada curso, intentar obtener las tareas usando el método correcto para estudiantes
    for (const course of courses) {
      try {
        console.log(`🔍 Procesando curso: ${course.name}`)
        
        // MÉTODO CORRECTO: Obtener tareas del curso usando courseWork.list()
        // Los estudiantes SÍ pueden usar este método si tienen los permisos correctos
        const courseworkResponse = await classroom.courses.courseWork.list({
          courseId: course.id!,
          pageSize: 50
        })

        const coursework = courseworkResponse.data.courseWork || []
        console.log(`📝 Encontradas ${coursework.length} tareas en ${course.name}`)

        // Para cada tarea, obtener MI entrega usando userId: 'me'
        for (const work of coursework) {
          try {
            // CLAVE: Usar userId: 'me' en lugar del email
            const submissionsResponse = await classroom.courses.courseWork.studentSubmissions.list({
              courseId: course.id!,
              courseWorkId: work.id!,
              userId: 'me', // ✅ Usar 'me' para el usuario autenticado
              pageSize: 1
            })

            const submissions = submissionsResponse.data.studentSubmissions || []
            
            if (submissions.length > 0) {
              const submission = submissions[0]
              
              const dueDate = work.dueDate ? new Date(
                work.dueDate.year!,
                work.dueDate.month! - 1,
                work.dueDate.day!,
                work.dueTime?.hours || 23,
                work.dueTime?.minutes || 59
              ) : null

              const isLate = dueDate ? now > dueDate && submission.state !== 'TURNED_IN' : false
              const isPending = submission.state === 'NEW' || submission.state === 'CREATED' || submission.state === 'RECLAIMED_BY_STUDENT'

              const assignment: StudentAssignment = {
                id: work.id!,
                courseId: course.id!,
                courseName: course.name!,
                title: work.title!,
                description: work.description || undefined,
                dueDate: dueDate?.toISOString(),
                creationTime: work.creationTime!,
                state: submission.state as any,
                assignedGrade: submission.assignedGrade || undefined,
                maxPoints: work.maxPoints || undefined,
                alternateLink: work.alternateLink || undefined,
                workType: work.workType as any || 'ASSIGNMENT',
                isLate,
                isPending
              }

              studentAssignments.push(assignment)
              console.log(`✅ Agregada tarea: ${work.title} (${submission.state})`)
            }
          } catch (submissionError: any) {
            // Si no hay entrega para esta tarea, es normal, no loggear
            if (!submissionError.message?.includes('not found')) {
              console.warn(`⚠️ Error obteniendo entrega para "${work.title}": ${submissionError.message}`)
            }
          }
        }
      } catch (courseError: any) {
        if (courseError.code === 403) {
          console.log(`⏭️ Sin permisos para curso "${course.name}" (no soy estudiante)`)
        } else {
          console.warn(`⚠️ Error procesando curso "${course.name}": ${courseError.message}`)
        }
      }
    }

    // Ordenar por fecha de vencimiento
    studentAssignments.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    })

    // Estadísticas
    const pending = studentAssignments.filter(a => a.isPending)
    const completed = studentAssignments.filter(a => a.state === 'TURNED_IN' || a.state === 'RETURNED')
    const late = studentAssignments.filter(a => a.isLate)

    console.log(`📊 Estadísticas finales: ${pending.length} pendientes, ${completed.length} completadas, ${late.length} atrasadas`)

    return NextResponse.json({
      success: true,
      data: {
        assignments: studentAssignments,
        stats: {
          total: studentAssignments.length,
          pending: pending.length,
          completed: completed.length,
          late: late.length
        }
      }
    })

  } catch (error: any) {
    console.error('Error general obteniendo tareas:', error)
    
    if (error.message?.includes('insufficient authentication scopes')) {
      return NextResponse.json({
        success: false,
        error: 'Permisos insuficientes. La aplicación necesita permisos adicionales para acceder a las tareas como estudiante.'
      }, { status: 403 })
    }

    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 })
  }
}
