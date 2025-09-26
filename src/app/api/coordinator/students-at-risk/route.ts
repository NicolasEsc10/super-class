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
        error: 'Token de Google no encontrado. Inicia sesión con Google.'
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

    // Obtener todos los cursos
    const coursesResponse = await classroom.courses.list({
      pageSize: 100,
      courseStates: ['ACTIVE']
    })

    const courses = coursesResponse.data.courses || []
    const studentsAtRisk = []

    for (const course of courses) {
      try {
        // Obtener estudiantes del curso
        const studentsResponse = await classroom.courses.students.list({
          courseId: course.id!,
          pageSize: 100
        })
        const students = studentsResponse.data.students || []

        // Obtener tareas del curso
        const assignmentsResponse = await classroom.courses.courseWork.list({
          courseId: course.id!,
          pageSize: 100
        })
        const assignments = assignmentsResponse.data.courseWork || []

        for (const student of students) {
          try {
            let lateAssignments = 0
            let lowGradeAssignments = 0
            let totalGrade = 0
            let gradedAssignments = 0
            let missedAssignments = 0
            const totalAssignments = assignments.length

            // Analizar cada tarea para este estudiante
            for (const assignment of assignments) {
              try {
                const submissionResponse = await classroom.courses.courseWork.studentSubmissions.list({
                  courseId: course.id!,
                  courseWorkId: assignment.id!,
                  userId: student.userId!,
                  pageSize: 1
                })
                
                const submissions = (submissionResponse as any).data.studentSubmissions || []
                
                if (submissions.length === 0) {
                  // No hay entrega
                  missedAssignments++
                } else {
                  const submission = submissions[0]
                  
                  if (submission.late) {
                    lateAssignments++
                  }
                  
                  if (submission.assignedGrade !== undefined) {
                    const grade = submission.assignedGrade
                    totalGrade += grade
                    gradedAssignments++
                    
                    if (grade < 60) {
                      lowGradeAssignments++
                    }
                  }
                }
              } catch (error) {
                console.error(`Error obteniendo entrega para estudiante ${student.userId} en tarea ${assignment.id}:`, error)
              }
            }

            // Calcular promedio del estudiante
            const studentAverage = gradedAssignments > 0 ? totalGrade / gradedAssignments : 0

            // Determinar nivel de riesgo
            let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'
            const reasons = []

            if (missedAssignments > totalAssignments * 0.3) {
              riskLevel = 'critical'
              reasons.push('Muchas tareas sin entregar')
            } else if (missedAssignments > totalAssignments * 0.2) {
              riskLevel = 'high'
              reasons.push('Tareas sin entregar')
            }

            if (lateAssignments > totalAssignments * 0.4) {
              if (riskLevel === 'low') riskLevel = 'medium'
              reasons.push('Muchas entregas tardías')
            } else if (lateAssignments > totalAssignments * 0.2) {
              if (riskLevel === 'low') riskLevel = 'low'
              reasons.push('Entregas tardías')
            }

            if (studentAverage > 0 && studentAverage < 50) {
              riskLevel = 'critical'
              reasons.push('Calificaciones muy bajas')
            } else if (studentAverage > 0 && studentAverage < 70) {
              if (riskLevel === 'low') riskLevel = 'medium'
              reasons.push('Calificaciones bajas')
            }

            if (lowGradeAssignments > gradedAssignments * 0.5) {
              if (riskLevel === 'low') riskLevel = 'medium'
              reasons.push('Muchas calificaciones bajas')
            }

            // Solo incluir estudiantes con algún nivel de riesgo
            if (riskLevel !== 'low' || reasons.length > 0) {
              studentsAtRisk.push({
                studentId: student.userId,
                studentName: student.profile?.name?.fullName || 'Estudiante',
                courseId: course.id,
                courseName: course.name,
                cohort: course.section || course.name?.split(' ')[0] || 'General',
                riskLevel,
                reasons: reasons.length > 0 ? reasons : ['Rendimiento general bajo'],
                lateAssignments,
                lowGradeAssignments,
                missedAssignments,
                average: Math.round(studentAverage),
                totalAssignments,
                completedAssignments: totalAssignments - missedAssignments
              })
            }

          } catch (error) {
            console.error(`Error analizando estudiante ${student.userId}:`, error)
          }
        }

      } catch (error) {
        console.error(`Error procesando curso ${course.id}:`, error)
      }
    }

    // Ordenar por nivel de riesgo (crítico primero)
    const riskOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 }
    studentsAtRisk.sort((a, b) => riskOrder[b.riskLevel] - riskOrder[a.riskLevel])

    return NextResponse.json({
      success: true,
      data: {
        studentsAtRisk,
        totalAtRisk: studentsAtRisk.length,
        criticalCount: studentsAtRisk.filter(s => s.riskLevel === 'critical').length,
        highCount: studentsAtRisk.filter(s => s.riskLevel === 'high').length,
        mediumCount: studentsAtRisk.filter(s => s.riskLevel === 'medium').length,
        lowCount: studentsAtRisk.filter(s => s.riskLevel === 'low').length
      }
    })
  } catch (error) {
    console.error('Error en API de estudiantes en riesgo:', error)
    return NextResponse.json({
      success: false,
      error: 'Error al obtener estudiantes en riesgo'
    }, { status: 500 })
  }
}
