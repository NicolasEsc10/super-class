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

    console.log('🔍 Obteniendo tareas del estudiante (versión v2)...')

    const studentAssignments: StudentAssignment[] = []
    const now = new Date()

    // Obtener cursos donde el usuario es explícitamente estudiante
    const coursesResponse = await classroom.courses.list({
      pageSize: 50,
      courseStates: ['ACTIVE'],
      studentId: user.email // Solo cursos donde soy estudiante
    })

    const studentCourses = coursesResponse.data.courses || []
    console.log(`📚 Encontrados ${studentCourses.length} cursos donde soy estudiante`)

    // Si no hay cursos como estudiante, intentar obtener todos los cursos
    let coursesToProcess = studentCourses
    if (studentCourses.length === 0) {
      console.log('🔄 No se encontraron cursos como estudiante, obteniendo todos los cursos...')
      const allCoursesResponse = await classroom.courses.list({
        pageSize: 50,
        courseStates: ['ACTIVE']
      })
      coursesToProcess = allCoursesResponse.data.courses || []
      console.log(`📚 Encontrados ${coursesToProcess.length} cursos en total`)
    }

    // Para cada curso, intentar obtener las entregas del estudiante
    for (const course of coursesToProcess) {
      try {
        console.log(`🔍 Procesando curso: ${course.name}`)
        
        // Verificar si soy estudiante en este curso
        try {
          await classroom.courses.students.get({
            courseId: course.id!,
            userId: user.email
          })
          console.log(`✅ Confirmado como estudiante en: ${course.name}`)
        } catch (studentCheckError) {
          console.log(`⏭️ No soy estudiante en: ${course.name}, saltando...`)
          continue
        }

        // Obtener todas las tareas del curso (solo si soy estudiante)
        const courseworkResponse = await classroom.courses.courseWork.list({
          courseId: course.id!,
          pageSize: 50
        })

        const coursework = courseworkResponse.data.courseWork || []
        console.log(`📝 Encontradas ${coursework.length} tareas en ${course.name}`)

        // Para cada tarea, obtener mi entrega
        for (const work of coursework) {
          try {
            const submissionsResponse = await classroom.courses.courseWork.studentSubmissions.list({
              courseId: course.id!,
              courseWorkId: work.id!,
              userId: user.email,
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
                workType: work.workType as any || 'ASSIGNMENT',
                isLate,
                isPending
              }

              studentAssignments.push(assignment)
            }
          } catch (submissionError: any) {
            console.warn(`⚠️ Error obteniendo entrega para tarea "${work.title}": ${submissionError.message}`)
          }
        }
      } catch (courseError: any) {
        console.warn(`⚠️ Error procesando curso "${course.name}": ${courseError.message}`)
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
        error: 'Permisos insuficientes. Por favor, vuelve a autorizar la aplicación.'
      }, { status: 403 })
    }

    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 })
  }
}
