import { NextRequest, NextResponse } from 'next/server'
import { createClassroomService } from '@/lib/google-classroom'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params
    const classroomService = await createClassroomService()
    const teachers = await classroomService.getTeachers(courseId)
    
    return NextResponse.json({
      success: true,
      data: teachers
    })
  } catch (error) {
    console.error('Error en API de profesores:', error)
    return NextResponse.json({
      success: false,
      error: 'Error al obtener los profesores'
    }, { status: 500 })
  }
}

