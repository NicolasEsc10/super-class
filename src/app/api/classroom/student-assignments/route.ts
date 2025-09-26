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
  materials?: unknown[]
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

    // Obteniendo tareas del estudiante

    // Obtener todos los cursos activos donde el usuario participa
    const coursesResponse = await classroom.courses.list({
      pageSize: 50,
      courseStates: ['ACTIVE']
    })

    const courses = coursesResponse.data.courses || []
    // Cursos encontrados

    const studentAssignments: StudentAssignment[] = []
    const now = new Date()

    // Para cada curso, obtener las entregas del estudiante directamente
    for (const course of courses) {
      try {
        // Obtener todas las entregas del estudiante en este curso
        const submissionsResponse = await classroom.courses.courseWork.studentSubmissions.list({
          courseId: course.id!,
          userId: user.email, // Filtrar solo las entregas del usuario actual
          pageSize: 50
        })

        const submissions = submissionsResponse.data.studentSubmissions || []

        // Para cada entrega, obtener los detalles de la tarea
        for (const submission of submissions) {
          try {
            // Obtener los detalles de la tarea (courseWork)
            const workResponse = await classroom.courses.courseWork.get({
              courseId: course.id!,
              id: submission.courseWorkId!
            })

            const work = workResponse.data

            if (work) {
              const dueDate = work.dueDate ? new Date(
                work.dueDate.year!,
                work.dueDate.month! - 1, // JavaScript months are 0-indexed
                work.dueDate.day!,
                work.dueTime?.hours || 23,
                work.dueTime?.minutes || 59
              ) : null

              const isLate = dueDate ? now > dueDate && submission.state !== 'TURNED_IN' : false
              const isPending = submission.state === 'NEW' || submission.state === 'CREATED'

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
                workType: work.workType as any,
                materials: work.materials,
                isLate,
                isPending
              }

              studentAssignments.push(assignment)
            }
          } catch (error) {
            console.warn(`⚠️ Error obteniendo detalles de tarea ${submission.courseWorkId}:`, error)
          }
        }
      } catch (error) {
        console.warn(`⚠️ Error obteniendo entregas del curso ${course.name}:`, error)
      }
    }

    // Ordenar por fecha de vencimiento (próximas primero)
    studentAssignments.sort((a, b) => {
      // Tareas sin fecha van al final
      if (!a.dueDate && !b.dueDate) return 0
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    })

    // Estadísticas
    const pending = studentAssignments.filter(a => a.isPending)
    const completed = studentAssignments.filter(a => a.state === 'TURNED_IN' || a.state === 'RETURNED')
    const late = studentAssignments.filter(a => a.isLate)

    console.log(`📊 Estadísticas: ${pending.length} pendientes, ${completed.length} completadas, ${late.length} atrasadas`)

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

  } catch (error: unknown) {
    console.error('Error obteniendo tareas del estudiante:', error)
    
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (errorMessage.includes('insufficient authentication scopes')) {
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
