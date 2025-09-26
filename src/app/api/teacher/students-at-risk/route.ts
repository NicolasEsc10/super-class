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
    const studentsAtRisk: Array<{
      studentId: string
      studentName: string
      courseName: string
      courseId: string
      riskLevel: 'low' | 'medium' | 'high' | 'critical'
      reasons: string[]
      lateAssignments: number
      averageGrade: number
      totalAssignments: number
      completedAssignments: number
    }> = []

    // Analizar cada curso
    for (const course of courses) {
      if (!course.id) continue

      try {
        // Obtener estudiantes del curso
        const studentsResponse = await classroom.courses.students.list({
          courseId: course.id,
          pageSize: 1000
        })

        const students = studentsResponse.data.students || []

        // Obtener tareas del curso
        const assignmentsResponse = await classroom.courses.courseWork.list({
          courseId: course.id,
          pageSize: 100
        })

        const assignments = assignmentsResponse.data.courseWork || []

        // Analizar cada estudiante
        for (const student of students) {
          if (!student.userId) continue

          let lateAssignments = 0
          let completedAssignments = 0
          let totalAssignments = 0
          let totalGrade = 0
          let gradeCount = 0
          const reasons: string[] = []

          // Analizar cada tarea
          for (const assignment of assignments) {
            if (!assignment.id) continue
            totalAssignments++

            try {
              // Obtener entregas de este estudiante para esta tarea
              const submissionsResponse = await classroom.courses.courseWork.studentSubmissions.list({
                courseId: course.id,
                courseWorkId: assignment.id,
                userId: student.userId
              })

              const submissions = submissionsResponse.data.studentSubmissions || []
              const submission = submissions[0] // Debería haber solo una entrega por estudiante

              if (submission) {
                if (submission.state === 'TURNED_IN' || submission.state === 'RETURNED') {
                  completedAssignments++

                  // Verificar si está atrasada
                  if (assignment.dueDate && submission.state === 'TURNED_IN') {
                    const dueDate = new Date(
                      assignment.dueDate.year!,
                      assignment.dueDate.month! - 1,
                      assignment.dueDate.day!,
                      assignment.dueTime?.hours || 23,
                      assignment.dueTime?.minutes || 59
                    )
                    const submissionDate = new Date(submission.updateTime || '')
                    if (submissionDate > dueDate) {
                      lateAssignments++
                    }
                  }

                  // Contar calificaciones
                  if (submission.assignedGrade !== undefined && submission.assignedGrade !== null) {
                    totalGrade += submission.assignedGrade
                    gradeCount++
                  }
                } else if (assignment.dueDate) {
                  // Tarea no entregada y ya pasó la fecha de vencimiento
                  const dueDate = new Date(
                    assignment.dueDate.year!,
                    assignment.dueDate.month! - 1,
                    assignment.dueDate.day!,
                    assignment.dueTime?.hours || 23,
                    assignment.dueTime?.minutes || 59
                  )
                  const now = new Date()
                  if (now > dueDate) {
                    lateAssignments++
                  }
                }
              } else if (assignment.dueDate) {
                // No hay entrega y ya pasó la fecha de vencimiento
                const dueDate = new Date(
                  assignment.dueDate.year!,
                  assignment.dueDate.month! - 1,
                  assignment.dueDate.day!,
                  assignment.dueTime?.hours || 23,
                  assignment.dueTime?.minutes || 59
                )
                const now = new Date()
                if (now > dueDate) {
                  lateAssignments++
                }
              }
            } catch (error) {
              // Error obteniendo entregas de esta tarea
              continue
            }
          }

          // Calcular promedio
          const averageGrade = gradeCount > 0 ? totalGrade / gradeCount : 0
          const completionRate = totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0

          // Determinar nivel de riesgo
          let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'

          if (lateAssignments >= 5) {
            riskLevel = 'critical'
            reasons.push(`${lateAssignments} tareas atrasadas`)
          } else if (lateAssignments >= 3) {
            riskLevel = 'high'
            reasons.push(`${lateAssignments} tareas atrasadas`)
          } else if (lateAssignments >= 1) {
            riskLevel = 'medium'
            reasons.push(`${lateAssignments} tareas atrasadas`)
          }

          if (averageGrade > 0 && averageGrade < 60) {
            riskLevel = riskLevel === 'critical' ? 'critical' : 'high'
            reasons.push('Bajo rendimiento académico')
          } else if (averageGrade > 0 && averageGrade < 70) {
            riskLevel = riskLevel === 'high' ? 'high' : 'medium'
            reasons.push('Rendimiento por debajo del promedio')
          }

          if (completionRate < 50) {
            riskLevel = riskLevel === 'critical' ? 'critical' : 'high'
            reasons.push('Baja tasa de completitud')
          } else if (completionRate < 70) {
            riskLevel = riskLevel === 'high' ? 'high' : 'medium'
            reasons.push('Tasa de completitud baja')
          }

          // Solo incluir estudiantes con algún nivel de riesgo
          if (riskLevel !== 'low' && reasons.length > 0) {
            studentsAtRisk.push({
              studentId: student.userId,
              studentName: student.profile?.name?.fullName || 
                          `${student.profile?.name?.givenName || ''} ${student.profile?.name?.familyName || ''}`.trim() ||
                          student.profile?.emailAddress?.split('@')[0] || 'Estudiante',
              courseName: course.name || 'Curso sin nombre',
              courseId: course.id,
              riskLevel,
              reasons,
              lateAssignments,
              averageGrade: Math.round(averageGrade * 100) / 100,
              totalAssignments,
              completedAssignments
            })
          }
        }
      } catch (error) {
        console.error(`Error analizando curso ${course.name}:`, error)
        // Continuar con el siguiente curso
      }
    }

    // Ordenar por nivel de riesgo (crítico primero)
    studentsAtRisk.sort((a, b) => {
      const riskOrder = { critical: 4, high: 3, medium: 2, low: 1 }
      return riskOrder[b.riskLevel] - riskOrder[a.riskLevel]
    })

    return NextResponse.json({
      success: true,
      data: {
        studentsAtRisk: studentsAtRisk.slice(0, 10), // Top 10 estudiantes en riesgo
        total: studentsAtRisk.length
      }
    })

  } catch (error) {
    console.error('Error obteniendo estudiantes en riesgo:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}
