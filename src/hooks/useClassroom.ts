import { useState, useEffect } from 'react'
import { createSupabaseClient } from '@/lib/supabase'
import type { Course, Student, Teacher, CourseWork } from '@/lib/google-classroom'

interface UseClassroomReturn {
  courses: Course[]
  loading: boolean
  error: string | null
  refetch: () => void
}

interface UseCourseDetailsReturn {
  course: Course | null
  students: Student[]
  teachers: Teacher[]
  courseWork: CourseWork[]
  loading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Hook para obtener todos los cursos del usuario
 */
export function useClassroomCourses(): UseClassroomReturn {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [session, setSession] = useState<any>(null)
  
  const supabase = createSupabaseClient()

  const fetchCourses = async () => {
    if (!session) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/classroom/courses')
      const data = await response.json()

      if (data.success) {
        setCourses(data.data)
      } else {
        setError(data.error || 'Error al obtener los cursos')
      }
    } catch (err) {
      setError('Error de conexión')
      console.error('Error fetching courses:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    // Escuchar cambios en la autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    fetchCourses()
  }, [session])

  return {
    courses,
    loading,
    error,
    refetch: fetchCourses
  }
}

/**
 * Hook para obtener los detalles completos de un curso
 */
export function useCourseDetails(courseId: string | null): UseCourseDetailsReturn {
  const [course, setCourse] = useState<Course | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [courseWork, setCourseWork] = useState<CourseWork[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [session, setSession] = useState<any>(null)
  
  const supabase = createSupabaseClient()

  const fetchCourseDetails = async () => {
    if (!session || !courseId) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/classroom/courses/${courseId}`)
      const data = await response.json()

      if (data.success) {
        setCourse(data.data.course)
        setStudents(data.data.students)
        setTeachers(data.data.teachers)
        setCourseWork(data.data.courseWork)
      } else {
        setError(data.error || 'Error al obtener los detalles del curso')
      }
    } catch (err) {
      setError('Error de conexión')
      console.error('Error fetching course details:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    // Escuchar cambios en la autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    fetchCourseDetails()
  }, [session, courseId])

  return {
    course,
    students,
    teachers,
    courseWork,
    loading,
    error,
    refetch: fetchCourseDetails
  }
}

/**
 * Hook para obtener solo los estudiantes de un curso
 */
export function useCourseStudents(courseId: string | null) {
  const { data: session } = useSession()
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStudents = async () => {
    if (!session || !courseId) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/classroom/courses/${courseId}/students`)
      const data = await response.json()

      if (data.success) {
        setStudents(data.data)
      } else {
        setError(data.error || 'Error al obtener los estudiantes')
      }
    } catch (err) {
      setError('Error de conexión')
      console.error('Error fetching students:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStudents()
  }, [session, courseId])

  return {
    students,
    loading,
    error,
    refetch: fetchStudents
  }
}

/**
 * Hook para obtener solo las tareas de un curso
 */
export function useCoursework(courseId: string | null) {
  const { data: session } = useSession()
  const [courseWork, setCourseWork] = useState<CourseWork[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCoursework = async () => {
    if (!session || !courseId) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/classroom/courses/${courseId}/coursework`)
      const data = await response.json()

      if (data.success) {
        setCourseWork(data.data)
      } else {
        setError(data.error || 'Error al obtener las tareas')
      }
    } catch (err) {
      setError('Error de conexión')
      console.error('Error fetching coursework:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCoursework()
  }, [session, courseId])

  return {
    courseWork,
    loading,
    error,
    refetch: fetchCoursework
  }
}

