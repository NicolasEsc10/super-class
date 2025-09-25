import { NextRequest, NextResponse } from 'next/server'
import { createClassroomService } from '@/lib/google-classroom'

export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const classroomService = await createClassroomService()
    const courseWork = await classroomService.getCourseWork(params.courseId)
    
    return NextResponse.json({
      success: true,
      data: courseWork
    })
  } catch (error) {
    console.error('Error en API de tareas:', error)
    return NextResponse.json({
      success: false,
      error: 'Error al obtener las tareas'
    }, { status: 500 })
  }
}

