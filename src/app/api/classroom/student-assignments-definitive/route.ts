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

    console.log('🔍 Obteniendo tareas del estudiante (método definitivo)...')

    const studentAssignments: StudentAssignment[] = []
    const now = new Date()

    // PASO 1: Obtener cursos
    const coursesResponse = await classroom.courses.list({
      pageSize: 50,
      courseStates: ['ACTIVE']
    })

    const courses = coursesResponse.data.courses || []
    console.log(`📚 Encontrados ${courses.length} cursos`)

    // PASO 2: Para cada curso, intentar diferentes enfoques
    for (const course of courses) {
      try {
        console.log(`🔍 Procesando curso: ${course.name}`)
        
        // VERIFICAR PRIMERO SI SOY ESTUDIANTE (no profesor)
        let isStudent = false
        try {
          await classroom.courses.students.get({
            courseId: course.id!,
            userId: 'me'
          })
          isStudent = true
          console.log(`✅ Confirmado como estudiante en: ${course.name}`)
        } catch (studentError: any) {
          console.log(`❌ No soy estudiante en el curso: ${course.name}`)
          continue // Saltar este curso si no soy estudiante
        }

        // SOLO PROCESAR SI SOY ESTUDIANTE
        if (!isStudent) {
          continue
        }

        // ENFOQUE PARA ESTUDIANTES: Intentar obtener tareas del curso
        let coursework: any[] = []
        try {
          const courseworkResponse = await classroom.courses.courseWork.list({
            courseId: course.id!,
            pageSize: 50
          })
          coursework = courseworkResponse.data.courseWork || []
          console.log(`📝 Encontradas ${coursework.length} tareas en ${course.name} (como estudiante)`)
        } catch (courseworkError: any) {
          if (courseworkError.code === 403) {
            console.log(`⚠️ Sin permisos para ver tareas en "${course.name}" como estudiante`)
            continue
          } else {
            throw courseworkError
          }
        }

        // PASO 3: Para cada tarea, obtener mi entrega (CONTAR TODAS LAS TAREAS)
        for (const work of coursework) {
          try {
            const submissionsResponse = await classroom.courses.courseWork.studentSubmissions.list({
              courseId: course.id!,
              courseWorkId: work.id!,
              userId: 'me',
              pageSize: 1
            })

            const submissions = submissionsResponse.data.studentSubmissions || []
            
            // Calcular fecha de vencimiento
            const dueDate = work.dueDate ? new Date(
              work.dueDate.year!,
              work.dueDate.month! - 1,
              work.dueDate.day!,
              work.dueTime?.hours || 23,
              work.dueTime?.minutes || 59
            ) : null

            let assignment: StudentAssignment

            if (submissions.length > 0) {
              // HAY ENTREGA: Usar datos reales de la entrega
              const submission = submissions[0]
              
              const isLate = dueDate ? now > dueDate && submission.state !== 'TURNED_IN' : false
              const isPending = submission.state === 'NEW' || submission.state === 'CREATED' || submission.state === 'RECLAIMED_BY_STUDENT'

              assignment = {
                id: work.id!,
                courseId: course.id!,
                courseName: course.name!,
                title: work.title!,
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

              console.log(`✅ Agregada tarea con entrega: ${work.title} (Estado: ${submission.state})`)
            } else {
              // NO HAY ENTREGA: Crear entrega virtual como "NEW" (pendiente)
              const isLate = dueDate ? now > dueDate : false
              const isPending = true // Siempre pendiente si no hay entrega

              assignment = {
                id: work.id!,
                courseId: course.id!,
                courseName: course.name!,
                title: work.title!,
                description: work.description,
                dueDate: dueDate?.toISOString(),
                creationTime: work.creationTime!,
                state: 'NEW' as any, // Estado virtual para tarea sin entrega
                assignedGrade: undefined,
                maxPoints: work.maxPoints,
                alternateLink: work.alternateLink,
                workType: work.workType as any || 'ASSIGNMENT',
                isLate,
                isPending
              }

              console.log(`✅ Agregada tarea SIN entrega: ${work.title} (Estado: NEW - Pendiente)`)
            }

            studentAssignments.push(assignment)
          } catch (submissionError: any) {
            console.warn(`⚠️ Error obteniendo entrega para "${work.title}": ${submissionError.message}`)
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
    
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 })
  }
}
