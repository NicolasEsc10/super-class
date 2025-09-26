import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { google } from 'googleapis'

interface Student {
  userId: string
  profile: {
    id: string
    name: {
      givenName?: string
      familyName?: string
      fullName?: string
    }
    emailAddress?: string
    photoUrl?: string
  }
  courseId: string
  courseWorkId?: string
  state: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'DELETED'
  creationTime: string
  updateTime: string
  assignedGrade?: number
  maxPoints?: number
  late: boolean
  draftGrade?: number
  submissionHistory?: any[]
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
            students: [],
            total: 0,
            courseId: courseId
          }
        })
      }
      console.error('Error verificando permisos de profesor:', teacherError.message)
      return NextResponse.json({
        success: false,
        error: 'Error verificando permisos de profesor'
      }, { status: 500 })
    }

    // Obtener estudiantes del curso
    let students = []
    try {
      const studentsResponse = await classroom.courses.students.list({
        courseId: courseId,
        pageSize: 1000
      })
      students = studentsResponse.data.students || []
    } catch (studentsError: any) {
      // Si no hay permisos para ver estudiantes, devolver lista vacía
      if (studentsError.code === 403) {
        return NextResponse.json({
          success: true,
          data: {
            students: [],
            total: 0,
            courseId: courseId
          }
        })
      }
      console.error('Error obteniendo estudiantes del curso:', studentsError.message)
      throw studentsError
    }
    const studentList: Student[] = []

    // Procesar cada estudiante
    for (const student of students) {
      if (!student.userId || !student.profile) continue

      const studentData: Student = {
        userId: student.userId,
        profile: {
          id: student.profile.id || student.userId,
          name: {
            givenName: student.profile.name?.givenName || undefined,
            familyName: student.profile.name?.familyName || undefined,
            fullName: student.profile.name?.fullName || undefined
          },
          emailAddress: student.profile.emailAddress || undefined,
          photoUrl: student.profile.photoUrl || undefined
        },
        courseId: courseId,
        state: 'ACTIVE',
        creationTime: '',
        updateTime: '',
        late: false // Se calculará después si es necesario
      }

      studentList.push(studentData)
    }

    // Ordenar por nombre
    studentList.sort((a, b) => {
      const nameA = a.profile.name.fullName || a.profile.name.givenName || ''
      const nameB = b.profile.name.fullName || b.profile.name.givenName || ''
      return nameA.localeCompare(nameB)
    })

    return NextResponse.json({
      success: true,
      data: {
        students: studentList,
        total: studentList.length,
        courseId: courseId
      }
    })

  } catch (error: any) {
    console.error('Error obteniendo estudiantes del curso:', error.message)
    
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 })
  }
}
