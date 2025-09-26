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
    
    // Métricas consolidadas
    let totalStudents = 0
    let totalAssignments = 0
    let totalSubmissions = 0
    let totalPendingReview = 0
    let overallAverage = 0
    let activeCourses = 0
    let studentsAtRisk = 0

    const courseDetails = []
    const cohortData = new Map<string, {
      name: string
      students: number
      assignments: number
      average: number
      courses: number
    }>()

    for (const course of courses) {
      try {
        // Obtener estudiantes del curso
        const studentsResponse = await classroom.courses.students.list({
          courseId: course.id!,
          pageSize: 100
        })
        const students = studentsResponse.data.students || []
        const studentCount = students.length

        // Obtener tareas del curso
        const assignmentsResponse = await classroom.courses.courseWork.list({
          courseId: course.id!,
          pageSize: 100
        })
        const assignments = assignmentsResponse.data.courseWork || []
        const assignmentCount = assignments.length

        // Calcular entregas y calificaciones
        let courseSubmissions = 0
        let coursePendingReview = 0
        let courseAverage = 0
        let courseStudentsAtRisk = 0

        for (const assignment of assignments) {
          try {
            const submissionsResponse = await classroom.courses.courseWork.studentSubmissions.list({
              courseId: course.id!,
              courseWorkId: assignment.id!,
              pageSize: 100
            })
            const submissions = submissionsResponse.data.studentSubmissions || []
            
            courseSubmissions += submissions.length
            coursePendingReview += submissions.filter(s => s.state === 'TURNED_IN').length
            
            // Calcular promedio del curso
            const gradedSubmissions = submissions.filter(s => s.assignedGrade !== undefined)
            if (gradedSubmissions.length > 0) {
              const totalGrade = gradedSubmissions.reduce((sum, s) => sum + (s.assignedGrade || 0), 0)
              courseAverage = totalGrade / gradedSubmissions.length
            }

            // Identificar estudiantes en riesgo (entregas tardías o calificaciones bajas)
            const lateSubmissions = submissions.filter(s => s.late === true)
            const lowGradeSubmissions = submissions.filter(s => 
              s.assignedGrade !== undefined && s.assignedGrade !== null && s.assignedGrade < 60
            )
            courseStudentsAtRisk += new Set([
              ...lateSubmissions.map(s => s.userId),
              ...lowGradeSubmissions.map(s => s.userId)
            ]).size

          } catch (error) {
            console.error(`Error obteniendo entregas para tarea ${assignment.id}:`, error)
          }
        }

        // Determinar cohorte basada en el nombre o sección del curso
        const cohortName = course.section || course.name?.split(' ')[0] || 'General'
        
        if (!cohortData.has(cohortName)) {
          cohortData.set(cohortName, {
            name: cohortName,
            students: 0,
            assignments: 0,
            average: 0,
            courses: 0
          })
        }

        const cohort = cohortData.get(cohortName)!
        cohort.students += studentCount
        cohort.assignments += assignmentCount
        cohort.average += courseAverage
        cohort.courses += 1

        // Actualizar métricas totales
        totalStudents += studentCount
        totalAssignments += assignmentCount
        totalSubmissions += courseSubmissions
        totalPendingReview += coursePendingReview
        overallAverage += courseAverage
        studentsAtRisk += courseStudentsAtRisk
        activeCourses += 1

        courseDetails.push({
          id: course.id,
          name: course.name,
          section: course.section,
          students: studentCount,
          assignments: assignmentCount,
          submissions: courseSubmissions,
          pendingReview: coursePendingReview,
          average: Math.round(courseAverage),
          studentsAtRisk: courseStudentsAtRisk,
          cohort: cohortName
        })

      } catch (error) {
        console.error(`Error procesando curso ${course.id}:`, error)
      }
    }

    // Calcular promedios de cohortes
    const cohortArray = Array.from(cohortData.values()).map(cohort => ({
      ...cohort,
      average: cohort.courses > 0 ? Math.round(cohort.average / cohort.courses) : 0
    }))

    // Calcular promedio general
    overallAverage = activeCourses > 0 ? Math.round(overallAverage / activeCourses) : 0

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalStudents,
          totalAssignments,
          totalSubmissions,
          totalPendingReview,
          overallAverage,
          activeCourses,
          studentsAtRisk
        },
        courses: courseDetails,
        cohorts: cohortArray
      }
    })
  } catch (error) {
    console.error('Error en API de coordinador:', error)
    return NextResponse.json({
      success: false,
      error: 'Error al obtener datos del coordinador'
    }, { status: 500 })
  }
}
