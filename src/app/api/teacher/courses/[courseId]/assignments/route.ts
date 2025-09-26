import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { google } from 'googleapis'

interface TeacherAssignment {
  id: string
  title: string
  description?: string
  materials?: any[]
  state: 'PUBLISHED' | 'DRAFT' | 'DELETED'
  alternateLink?: string
  creationTime: string
  updateTime: string
  dueDate?: string
  dueTime?: string
  scheduledTime?: string
  maxPoints?: number
  workType: 'ASSIGNMENT' | 'SHORT_ANSWER_QUESTION' | 'MULTIPLE_CHOICE_QUESTION'
  associatedWithDeveloper: boolean
  assigneeMode: 'ALL_STUDENTS' | 'INDIVIDUAL_STUDENTS'
  individualStudentsOptions?: {
    studentIds: string[]
  }
  submissionModificationMode: 'MODIFIABLE_UNTIL_TURNED_IN' | 'MODIFIABLE'
  creatorUserId: string
  topicId?: string
  gradeCategory?: {
    id: string
    name: string
  }
  assignment?: {
    studentWorkFolder?: {
      id: string
      title: string
      alternateLink?: string
    }
  }
  multipleChoiceQuestion?: {
    choices: string[]
  }
  // Estadísticas agregadas
  totalStudents: number
  submittedCount: number
  gradedCount: number
  pendingCount: number
  lateCount: number
  averageGrade?: number
  completionRate: number
  isActive: boolean
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
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

    const { courseId } = await params

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

    // Verificar que soy profesor en este curso
    try {
      await classroom.courses.teachers.get({
        courseId: courseId,
        userId: 'me'
      })
    } catch (teacherError: any) {
      // Si no es profesor, devolver lista vacía en lugar de error
      if (teacherError.code === 403 || teacherError.code === 404) {
        return NextResponse.json({
          success: true,
          data: {
            assignments: [],
            total: 0,
            courseId: courseId,
            totalStudents: 0
          }
        })
      }
      console.error('Error verificando permisos de profesor:', teacherError.message)
      return NextResponse.json({
        success: false,
        error: 'Error verificando permisos de profesor'
      }, { status: 500 })
    }

    // Obtener tareas del curso
    let assignments = []
    try {
      const assignmentsResponse = await classroom.courses.courseWork.list({
        courseId: courseId,
        pageSize: 100
      })
      assignments = assignmentsResponse.data.courseWork || []
    } catch (assignmentsError: any) {
      // Si no hay permisos para ver tareas, devolver lista vacía en lugar de error
      if (assignmentsError.code === 403) {
        return NextResponse.json({
          success: true,
          data: {
            assignments: [],
            total: 0,
            courseId: courseId,
            totalStudents: 0
          }
        })
      }
      // Solo logear errores que no sean de permisos
      console.error('Error obteniendo tareas del curso:', assignmentsError.message)
      throw assignmentsError
    }
    const teacherAssignments: TeacherAssignment[] = []

    // Obtener lista de estudiantes para calcular estadísticas
    let totalStudents = 0
    try {
      const studentsResponse = await classroom.courses.students.list({
        courseId: courseId,
        pageSize: 1000
      })
      totalStudents = studentsResponse.data.students?.length || 0
    } catch (error) {
      // Error obteniendo estudiantes
    }

    // Procesar cada tarea
    for (const assignment of assignments) {
      if (!assignment.id) continue

      let submittedCount = 0
      let gradedCount = 0
      let pendingCount = 0
      let lateCount = 0
      let totalGrade = 0
      let gradeCount = 0

      try {
        // Obtener entregas de esta tarea
        const submissionsResponse = await classroom.courses.courseWork.studentSubmissions.list({
          courseId: courseId,
          courseWorkId: assignment.id,
          pageSize: 1000
        })

        const submissions = submissionsResponse.data.studentSubmissions || []
        
        for (const submission of submissions) {
          if (submission.state === 'TURNED_IN' || submission.state === 'RETURNED') {
            submittedCount++
          }
          
          if (submission.state === 'RETURNED' && submission.assignedGrade !== undefined) {
            gradedCount++
            if (submission.assignedGrade !== null) {
              totalGrade += submission.assignedGrade
              gradeCount++
            }
          }
          
          if (submission.state === 'TURNED_IN') {
            pendingCount++
          }

          // Verificar si está atrasada
          if (assignment.dueDate && submission.state !== 'TURNED_IN' && submission.state !== 'RETURNED') {
            const dueDate = new Date(
              assignment.dueDate.year!,
              assignment.dueDate.month! - 1,
              assignment.dueDate.day!,
              assignment.dueTime?.hours || 23,
              assignment.dueTime?.minutes || 59
            )
            const now = new Date()
            if (now > dueDate) {
              lateCount++
            }
          }
        }
      } catch (submissionError) {
        // Error obteniendo entregas
      }

      const averageGrade = gradeCount > 0 ? totalGrade / gradeCount : undefined
      const completionRate = totalStudents > 0 ? (submittedCount / totalStudents) * 100 : 0
      
      // Calcular promedio basado en calificaciones reales
      const realAverage = gradeCount > 0 ? Math.round((totalGrade / gradeCount) * 100) / 100 : 0

      const teacherAssignment: TeacherAssignment = {
        id: assignment.id,
        title: assignment.title || 'Sin título',
        description: assignment.description || undefined,
        materials: assignment.materials || [],
        state: (assignment.state as any) || 'PUBLISHED',
        alternateLink: assignment.alternateLink || undefined,
        creationTime: assignment.creationTime || '',
        updateTime: assignment.updateTime || '',
        dueDate: assignment.dueDate ? new Date(
          assignment.dueDate.year!,
          assignment.dueDate.month! - 1,
          assignment.dueDate.day!,
          assignment.dueTime?.hours || 23,
          assignment.dueTime?.minutes || 59
        ).toISOString() : undefined,
        dueTime: assignment.dueTime ? `${assignment.dueTime.hours?.toString().padStart(2, '0') || '00'}:${assignment.dueTime.minutes?.toString().padStart(2, '0') || '00'}` : undefined,
        scheduledTime: assignment.scheduledTime || undefined,
        maxPoints: assignment.maxPoints || undefined,
        workType: (assignment.workType as any) || 'ASSIGNMENT',
        associatedWithDeveloper: assignment.associatedWithDeveloper || false,
        assigneeMode: (assignment.assigneeMode as any) || 'ALL_STUDENTS',
        individualStudentsOptions: assignment.individualStudentsOptions ? {
          studentIds: assignment.individualStudentsOptions.studentIds || []
        } : undefined,
        submissionModificationMode: (assignment.submissionModificationMode as any) || 'MODIFIABLE_UNTIL_TURNED_IN',
        creatorUserId: assignment.creatorUserId || '',
        topicId: assignment.topicId || undefined,
        gradeCategory: assignment.gradeCategory ? {
          id: assignment.gradeCategory.id || '',
          name: assignment.gradeCategory.name || ''
        } : undefined,
        assignment: assignment.assignment ? {
          studentWorkFolder: assignment.assignment.studentWorkFolder ? {
            id: assignment.assignment.studentWorkFolder.id || '',
            title: assignment.assignment.studentWorkFolder.title || '',
            alternateLink: assignment.assignment.studentWorkFolder.alternateLink || undefined
          } : undefined
        } : undefined,
        multipleChoiceQuestion: assignment.multipleChoiceQuestion ? {
          choices: assignment.multipleChoiceQuestion.choices || []
        } : undefined,
        // Estadísticas
        totalStudents,
        submittedCount,
        gradedCount,
        pendingCount,
        lateCount,
        averageGrade,
        completionRate,
        // Tarea activa si hay estudiantes pendientes O si nadie ha entregado
        isActive: pendingCount > 0 || submittedCount === 0
      }

      teacherAssignments.push(teacherAssignment)
    }

    // Ordenar por fecha de vencimiento (más recientes primero)
    teacherAssignments.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()
    })

    // Calcular promedio general de la clase
    const allGrades = teacherAssignments
      .filter(assignment => assignment.averageGrade !== undefined)
      .map(assignment => assignment.averageGrade!)
    
    const classAverage = allGrades.length > 0 
      ? Math.round((allGrades.reduce((sum, grade) => sum + grade, 0) / allGrades.length) * 100) / 100
      : 0

    // Contar tareas activas (con estudiantes pendientes)
    const activeAssignments = teacherAssignments.filter(assignment => assignment.isActive).length

    return NextResponse.json({
      success: true,
      data: {
        assignments: teacherAssignments,
        total: teacherAssignments.length,
        activeAssignments,
        courseId: courseId,
        totalStudents,
        classAverage
      }
    })

  } catch (error: any) {
    console.error('Error obteniendo tareas del curso:', error.message)
    
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 })
  }
}
