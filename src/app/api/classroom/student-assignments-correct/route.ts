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

    console.log('🔍 Obteniendo tareas del estudiante (método correcto según documentación)...')

    const studentAssignments: StudentAssignment[] = []
    const now = new Date()

    // PASO 1: Obtener cursos donde soy estudiante
    const coursesResponse = await classroom.courses.list({
      pageSize: 50,
      courseStates: ['ACTIVE']
    })

    const courses = coursesResponse.data.courses || []
    console.log(`📚 Encontrados ${courses.length} cursos`)

    // PASO 2: Para cada curso, usar el método CORRECTO según la documentación
    for (const course of courses) {
      try {
        console.log(`🔍 Procesando curso: ${course.name}`)
        
        // MÉTODO RECOMENDADO: Obtener TODAS las entregas del estudiante en este curso
        // Esto nos dará las tareas donde tengo una entrega (asignadas a mí)
        const allSubmissionsResponse = await classroom.courses.courseWork.studentSubmissions.list({
          courseId: course.id!,
          userId: 'me', // Usuario autenticado
          pageSize: 50
        })

        const submissions = allSubmissionsResponse.data.studentSubmissions || []
        console.log(`📝 Encontradas ${submissions.length} entregas en ${course.name}`)

        // PASO 3: Para cada entrega, obtener los detalles de la tarea
        for (const submission of submissions) {
          try {
            // Obtener detalles de la tarea usando courseWork.get()
            const workResponse = await classroom.courses.courseWork.get({
              courseId: course.id!,
              id: submission.courseWorkId!
            })

            const work = workResponse.data

            if (work && work.title) {
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
                title: work.title,
                description: work.description,
                dueDate: dueDate?.toISOString(),
                creationTime: work.creationTime!,
                state: submission.state as any,
                assignedGrade: submission.assignedGrade,
                maxPoints: work.maxPoints,
                alternateLink: work.alternateLink,
                workType: work.workType as any || 'ASSIGNMENT',
                isLate,
                isPending
              }

              studentAssignments.push(assignment)
              console.log(`✅ Agregada tarea: ${work.title} (Estado: ${submission.state})`)
            }
          } catch (workError: any) {
            console.warn(`⚠️ Error obteniendo detalles de tarea ${submission.courseWorkId}: ${workError.message}`)
          }
        }
      } catch (courseError: any) {
        console.warn(`⚠️ Error procesando curso "${course.name}": ${courseError.message}`)
        
        // Si es error 403, significa que no tengo permisos en este curso
        if (courseError.code !== 403) {
          console.error(`Error inesperado en curso ${course.name}:`, courseError)
        }
      }
    }

    // Ordenar por fecha de vencimiento (próximas primero)
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
    console.log(`📋 Tareas encontradas:`)
    studentAssignments.forEach(assignment => {
      console.log(`  - ${assignment.title} (${assignment.courseName}) - ${assignment.state}`)
    })

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
        error: 'Permisos insuficientes. Necesitas re-autenticarte con los permisos correctos.'
      }, { status: 403 })
    }

    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 })
  }
}
