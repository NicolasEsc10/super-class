import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseApiClient } from '@/lib/supabase-api'
import { google } from 'googleapis'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseApiClient()
    
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

    console.log('🔍 Iniciando obtención de datos de Classroom...')

    // Obtener cursos
    const coursesResponse = await classroom.courses.list({
      pageSize: 50,
      courseStates: ['ACTIVE']
    })

    const courses = coursesResponse.data.courses || []
    console.log(`📚 Encontrados ${courses.length} cursos`)

    // Para cada curso, obtener detalles completos
    const detailedCourses = await Promise.all(
      courses.map(async (course) => {
        try {
          console.log(`📖 Procesando curso: ${course.name}`)

          // Intentar obtener estudiantes (puede fallar si no tienes permisos)
          let students = []
          try {
            const studentsResponse = await classroom.courses.students.list({
              courseId: course.id,
              pageSize: 100
            })
            students = studentsResponse.data.students || []
          } catch (error) {
            console.warn(`⚠️ Sin permisos para estudiantes en ${course.name}:`, error.message)
          }

          // Intentar obtener profesores
          let teachers = []
          try {
            const teachersResponse = await classroom.courses.teachers.list({
              courseId: course.id,
              pageSize: 100
            })
            teachers = teachersResponse.data.teachers || []
          } catch (error) {
            console.warn(`⚠️ Sin permisos para profesores en ${course.name}:`, error.message)
          }

          // Intentar obtener tareas
          let coursework = []
          try {
            const courseworkResponse = await classroom.courses.courseWork.list({
              courseId: course.id,
              pageSize: 100,
              courseWorkStates: ['PUBLISHED']
            })
            coursework = courseworkResponse.data.courseWork || []
          } catch (error) {
            console.warn(`⚠️ Sin permisos para tareas en ${course.name}:`, error.message)
          }

          // Obtener entregas para cada tarea (solo las primeras 3 tareas para no saturar)
          const courseworkWithSubmissions = await Promise.all(
            coursework.slice(0, 3).map(async (work) => {
              try {
                const submissionsResponse = await classroom.courses.courseWork.studentSubmissions.list({
                  courseId: course.id,
                  courseWorkId: work.id,
                  pageSize: 50
                })
                const submissions = submissionsResponse.data.studentSubmissions || []

                return {
                  ...work,
                  submissions: submissions.map(sub => ({
                    id: sub.id,
                    userId: sub.userId,
                    state: sub.state,
                    assignedGrade: sub.assignedGrade,
                    submissionHistory: sub.submissionHistory?.length || 0
                  }))
                }
              } catch (error) {
                console.warn(`⚠️ Error obteniendo entregas para tarea ${work.id}:`, error.message)
                return {
                  ...work,
                  submissions: []
                }
              }
            })
          )

          const hasPermissions = students.length > 0 || teachers.length > 0 || coursework.length > 0
          const permissionStatus = hasPermissions ? '✅' : '⚠️ (permisos limitados)'
          console.log(`${permissionStatus} Curso ${course.name}: ${students.length} estudiantes, ${teachers.length} profesores, ${coursework.length} tareas`)

          return {
            id: course.id,
            name: course.name,
            section: course.section,
            description: course.description,
            room: course.room,
            ownerId: course.ownerId,
            creationTime: course.creationTime,
            updateTime: course.updateTime,
            enrollmentCode: course.enrollmentCode,
            courseState: course.courseState,
            alternateLink: course.alternateLink,
            students: students.map(student => ({
              userId: student.userId,
              profile: {
                id: student.profile?.id,
                name: {
                  givenName: student.profile?.name?.givenName,
                  familyName: student.profile?.name?.familyName,
                  fullName: student.profile?.name?.fullName
                },
                emailAddress: student.profile?.emailAddress,
                photoUrl: student.profile?.photoUrl
              }
            })),
            teachers: teachers.map(teacher => ({
              userId: teacher.userId,
              profile: {
                id: teacher.profile?.id,
                name: {
                  givenName: teacher.profile?.name?.givenName,
                  familyName: teacher.profile?.name?.familyName,
                  fullName: teacher.profile?.name?.fullName
                },
                emailAddress: teacher.profile?.emailAddress,
                photoUrl: teacher.profile?.photoUrl
              }
            })),
            coursework: courseworkWithSubmissions.map(work => ({
              id: work.id,
              title: work.title,
              description: work.description,
              materials: work.materials,
              state: work.state,
              alternateLink: work.alternateLink,
              creationTime: work.creationTime,
              updateTime: work.updateTime,
              dueDate: work.dueDate,
              dueTime: work.dueTime,
              maxPoints: work.maxPoints,
              workType: work.workType,
              submissions: work.submissions || []
            }))
          }
        } catch (error) {
          console.error(`❌ Error procesando curso ${course.name}:`, error.message)
          return {
            id: course.id,
            name: course.name,
            error: error.message,
            students: [],
            teachers: [],
            coursework: []
          }
        }
      })
    )

    // Calcular estadísticas generales
    const stats = {
      totalCourses: detailedCourses.length,
      totalStudents: detailedCourses.reduce((sum, course) => sum + course.students.length, 0),
      totalTeachers: detailedCourses.reduce((sum, course) => sum + course.teachers.length, 0),
      totalCoursework: detailedCourses.reduce((sum, course) => sum + course.coursework.length, 0),
      totalSubmissions: detailedCourses.reduce((sum, course) => 
        sum + course.coursework.reduce((subSum, work) => subSum + (work.submissions?.length || 0), 0), 0
      )
    }

    console.log('📊 Estadísticas finales:', stats)

    return NextResponse.json({
      success: true,
      data: {
        courses: detailedCourses,
        stats,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('❌ Error general obteniendo datos de Classroom:', error)
    return NextResponse.json({
      success: false,
      error: 'Error obteniendo datos: ' + error.message
    }, { status: 500 })
  }
}
