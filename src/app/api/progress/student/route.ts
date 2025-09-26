import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseApiClient } from '@/lib/supabase-api'
import { google } from 'googleapis'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseApiClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'No autenticado'
      }, { status: 401 })
    }

    // Obtener token de acceso
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.provider_token) {
      return NextResponse.json({
        success: false,
        error: 'Token de Google no disponible'
      }, { status: 401 })
    }

    // Configurar cliente de Google
    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({
      access_token: session.provider_token,
      refresh_token: session.provider_refresh_token
    })

    const classroom = google.classroom({ version: 'v1', auth: oauth2Client })

    // Obtener cursos donde es estudiante
    const coursesResponse = await classroom.courses.list({
      studentId: 'me',
      courseStates: ['ACTIVE']
    })

    const courses = coursesResponse.data.courses || []
    const courseProgress = []
    let totalAssignments = 0
    let completedAssignments = 0
    let pendingAssignments = 0
    let lateAssignments = 0
    let totalGrades = 0
    let gradeCount = 0

    // Procesar cada curso
    for (const course of courses) {
      try {
        // Obtener tareas del curso
        const courseworkResponse = await classroom.courses.courseWork.list({
          courseId: course.id!
        })

        const coursework = courseworkResponse.data.courseWork || []
        let courseCompleted = 0
        let coursePending = 0
        let courseLate = 0
        let courseGrades = 0
        let courseGradeCount = 0

        // Procesar cada tarea
        for (const work of coursework) {
          try {
            // Obtener submissions del estudiante
            const submissionsResponse = await classroom.courses.courseWork.studentSubmissions.list({
              courseId: course.id!,
              courseWorkId: work.id!,
              userId: 'me'
            })

            const submissions = submissionsResponse.data.studentSubmissions || []
            const submission = submissions[0] // Solo debería haber una por estudiante

            if (submission) {
              const isSubmitted = submission.state === 'TURNED_IN' || submission.state === 'RETURNED'
              const isLate = submission.late || false
              
              if (isSubmitted) {
                courseCompleted++
                if (submission.assignedGrade && work.maxPoints) {
                  courseGrades += submission.assignedGrade
                  courseGradeCount++
                }
              } else {
                coursePending++
                // Verificar si está atrasada
                if (work.dueDate) {
                  const dueDate = new Date(
                    work.dueDate.year!,
                    work.dueDate.month! - 1,
                    work.dueDate.day!
                  )
                  if (work.dueTime) {
                    dueDate.setHours(work.dueTime.hours || 23, work.dueTime.minutes || 59)
                  }
                  if (new Date() > dueDate) {
                    courseLate++
                  }
                }
              }
            } else {
              coursePending++
            }

            totalAssignments++
          } catch (submissionError) {
            console.warn(`Error obteniendo submissions para tarea ${work.id}:`, submissionError)
          }
        }

        // Calcular métricas del curso
        const courseTotalAssignments = coursework.length
        const courseCompletionRate = courseTotalAssignments > 0 
          ? (courseCompleted / courseTotalAssignments) * 100 
          : 0

        courseProgress.push({
          courseId: course.id!,
          courseName: course.name!,
          totalAssignments: courseTotalAssignments,
          completedAssignments: courseCompleted,
          pendingAssignments: coursePending,
          lateAssignments: courseLate,
          averageGrade: courseGradeCount > 0 ? courseGrades / courseGradeCount : undefined,
          completionRate: courseCompletionRate
        })

        // Acumular totales
        completedAssignments += courseCompleted
        pendingAssignments += coursePending
        lateAssignments += courseLate
        totalGrades += courseGrades
        gradeCount += courseGradeCount

      } catch (courseError) {
        console.warn(`Error procesando curso ${course.id}:`, courseError)
      }
    }

    // Calcular nivel de riesgo
    const completionRate = totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 100
    const lateRate = totalAssignments > 0 ? (lateAssignments / totalAssignments) * 100 : 0
    
    let riskLevel: 'low' | 'medium' | 'high' = 'low'
    if (completionRate < 50 || lateRate > 30) {
      riskLevel = 'high'
    } else if (completionRate < 75 || lateRate > 15) {
      riskLevel = 'medium'
    }

    const studentProgress = {
      studentId: user.id,
      studentName: user.user_metadata?.full_name || user.email || 'Usuario',
      studentEmail: user.email || '',
      totalAssignments,
      completedAssignments,
      pendingAssignments,
      lateAssignments,
      averageGrade: gradeCount > 0 ? totalGrades / gradeCount : undefined,
      lastActivity: new Date().toISOString(),
      riskLevel,
      courseProgress
    }

    return NextResponse.json({
      success: true,
      data: studentProgress
    })

  } catch (error: any) {
    console.error('Error obteniendo progreso del estudiante:', error)
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 })
  }
}
