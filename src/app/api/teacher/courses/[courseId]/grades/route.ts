import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { google } from 'googleapis'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params
    const supabase = await createSupabaseServerClient()
    
    // Obtener la sesión del usuario
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener el token de acceso de Google
    const { data: tokenData, error: tokenError } = await supabase
      .from('user_tokens')
      .select('access_token, refresh_token')
      .eq('user_id', session.user.id)
      .single()

    if (tokenError || !tokenData) {
      return NextResponse.json({ error: 'Token no encontrado' }, { status: 401 })
    }

    // Configurar OAuth2
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    )

    oauth2Client.setCredentials({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token
    })

    const classroom = google.classroom({ version: 'v1', auth: oauth2Client })

    // Verificar que el usuario es profesor del curso
    try {
      const course = await classroom.courses.get({ id: courseId })
      if (!course.data.teacherGroupEmail?.includes(session.user.email || '')) {
        return NextResponse.json({ error: 'No tienes permisos para ver este curso' }, { status: 403 })
      }
    } catch (error) {
      return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 })
    }

    // Obtener todas las tareas del curso
    const courseworkResponse = await classroom.courses.courseWork.list({
      courseId: courseId,
      pageSize: 100
    })

    const coursework = courseworkResponse.data.courseWork || []
    
    // Obtener las entregas de estudiantes para cada tarea
    const allSubmissions: any[] = []
    
    for (const work of coursework) {
      if (work.id) {
        try {
          const submissionsResponse = await classroom.courses.courseWork.studentSubmissions.list({
            courseId: courseId,
            courseWorkId: work.id,
            pageSize: 100
          })
          
          const submissions = submissionsResponse.data.studentSubmissions || []
          allSubmissions.push(...submissions.map(submission => ({
            ...submission,
            courseWorkId: work.id,
            courseWorkTitle: work.title,
            maxPoints: work.maxPoints || 0
          })))
        } catch (error) {
          console.error(`Error obteniendo entregas para tarea ${work.id}:`, error)
          // Continuar con la siguiente tarea
        }
      }
    }

    // Calcular estadísticas por estudiante y contar entregas pendientes
    const studentStats = new Map<string, {
      studentId: string
      studentName: string
      totalPoints: number
      maxPoints: number
      completedAssignments: number
      totalAssignments: number
      average: number
    }>()

    let pendingReviewCount = 0

    // Agrupar entregas por estudiante
    for (const submission of allSubmissions) {
      if (submission.userId) {
        const studentId = submission.userId
        const studentName = submission.assignedGrade?.toString() || 'Estudiante'
        
        if (!studentStats.has(studentId)) {
          studentStats.set(studentId, {
            studentId,
            studentName,
            totalPoints: 0,
            maxPoints: 0,
            completedAssignments: 0,
            totalAssignments: 0,
            average: 0
          })
        }

        const stats = studentStats.get(studentId)!
        stats.totalAssignments++
        
        // Contar entregas pendientes de revisión
        if (submission.state === 'TURNED_IN') {
          pendingReviewCount++
        }
        
        if (submission.state === 'TURNED_IN' || submission.state === 'RETURNED') {
          stats.completedAssignments++
          if (submission.assignedGrade !== undefined) {
            stats.totalPoints += submission.assignedGrade
            stats.maxPoints += submission.maxPoints || 0
          }
        }
      }
    }

    // Calcular promedios
    for (const [studentId, stats] of studentStats) {
      if (stats.maxPoints > 0) {
        stats.average = Math.round((stats.totalPoints / stats.maxPoints) * 100)
      } else if (stats.completedAssignments > 0) {
        // Si no hay puntos máximos, calcular basado en completitud
        stats.average = Math.round((stats.completedAssignments / stats.totalAssignments) * 100)
      }
    }

    // Calcular promedio general de la clase
    const classAverage = studentStats.size > 0 
      ? Math.round(Array.from(studentStats.values()).reduce((sum, stats) => sum + stats.average, 0) / studentStats.size)
      : 0

    // Obtener información del curso
    const courseInfo = await classroom.courses.get({ id: courseId })

    return NextResponse.json({
      success: true,
      data: {
        courseId,
        courseName: courseInfo.data.name,
        classAverage,
        totalStudents: studentStats.size,
        totalAssignments: coursework.length,
        pendingReview: pendingReviewCount,
        studentStats: Array.from(studentStats.values())
      }
    })

  } catch (error) {
    console.error('Error obteniendo calificaciones:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}
