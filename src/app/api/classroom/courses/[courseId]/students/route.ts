import { NextRequest, NextResponse } from 'next/server'
import { createClassroomService } from '@/lib/google-classroom'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params
    const classroomService = await createClassroomService()
    const students = await classroomService.getStudents(courseId)
    
    return NextResponse.json({
      success: true,
      data: students
    })
  } catch (error) {
    console.error('Error en API de estudiantes:', error)
    return NextResponse.json({
      success: false,
      error: 'Error al obtener los estudiantes'
    }, { status: 500 })
  }
}

