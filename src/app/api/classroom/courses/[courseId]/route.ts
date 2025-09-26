import { NextRequest, NextResponse } from 'next/server'
import { createClassroomService } from '@/lib/google-classroom'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params
    const classroomService = await createClassroomService()
    const courseDetails = await classroomService.getCourseDetails(courseId)
    
    return NextResponse.json({
      success: true,
      data: courseDetails
    })
  } catch (error) {
    console.error('Error en API de detalles del curso:', error)
    return NextResponse.json({
      success: false,
      error: 'Error al obtener los detalles del curso'
    }, { status: 500 })
  }
}

