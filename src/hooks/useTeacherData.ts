import { useState, useEffect } from 'react'

interface TeacherCourse {
  id: string
  name: string
  description?: string
  section?: string
  room?: string
  ownerId: string
  creationTime: string
  updateTime: string
  enrollmentCode?: string
  courseState: 'ACTIVE' | 'ARCHIVED' | 'PROVISIONED' | 'DECLINED' | 'SUSPENDED'
  alternateLink?: string
  teacherGroup?: string
  courseGroup?: string
  guardiansEnabled: boolean
  calendarId: string
  studentCount?: number
  assignmentCount?: number
}

interface TeacherAssignment {
  id: string
  title: string
  description?: string
  state: 'PUBLISHED' | 'DRAFT' | 'DELETED'
  creationTime: string
  updateTime: string
  dueDate?: string
  maxPoints?: number
  workType: 'ASSIGNMENT' | 'SHORT_ANSWER_QUESTION' | 'MULTIPLE_CHOICE_QUESTION'
  totalStudents: number
  submittedCount: number
  gradedCount: number
  pendingCount: number
  lateCount: number
  averageGrade?: number
  completionRate: number
}

interface TeacherStudent {
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
  state: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'DELETED'
  creationTime: string
  updateTime: string
}

interface CourseGrades {
  courseId: string
  courseName: string
  classAverage: number
  totalStudents: number
  totalAssignments: number
  studentStats: Array<{
    studentId: string
    studentName: string
    totalPoints: number
    maxPoints: number
    completedAssignments: number
    totalAssignments: number
    average: number
  }>
}

interface UseTeacherDataReturn {
  // Cursos
  courses: TeacherCourse[]
  loadingCourses: boolean
  errorCourses: string | null
  fetchCourses: () => Promise<void>
  
  // Tareas de un curso específico
  assignments: TeacherAssignment[]
  loadingAssignments: boolean
  errorAssignments: string | null
  fetchAssignments: (courseId: string) => Promise<void>
  
  // Estudiantes de un curso específico
  students: TeacherStudent[]
  loadingStudents: boolean
  errorStudents: string | null
  fetchStudents: (courseId: string) => Promise<void>
  
  // Calificaciones de un curso específico
  grades: CourseGrades | null
  loadingGrades: boolean
  errorGrades: string | null
  fetchGrades: (courseId: string) => Promise<void>
  
  // Limpiar datos
  clearData: () => void
}

export function useTeacherData(): UseTeacherDataReturn {
  const [courses, setCourses] = useState<TeacherCourse[]>([])
  const [loadingCourses, setLoadingCourses] = useState(false)
  const [errorCourses, setErrorCourses] = useState<string | null>(null)
  
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([])
  const [loadingAssignments, setLoadingAssignments] = useState(false)
  const [errorAssignments, setErrorAssignments] = useState<string | null>(null)
  
  const [students, setStudents] = useState<TeacherStudent[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [errorStudents, setErrorStudents] = useState<string | null>(null)
  
  const [grades, setGrades] = useState<CourseGrades | null>(null)
  const [loadingGrades, setLoadingGrades] = useState(false)
  const [errorGrades, setErrorGrades] = useState<string | null>(null)

  // Fetch cursos
  const fetchCourses = async () => {
    setLoadingCourses(true)
    setErrorCourses(null)
    
    try {
      const response = await fetch('/api/teacher/courses')
      const data = await response.json()
      
      if (data.success) {
        setCourses(data.data.courses)
      } else {
        setErrorCourses(data.error)
      }
    } catch (error: unknown) {
      setErrorCourses('Error al cargar cursos')
    } finally {
      setLoadingCourses(false)
    }
  }

  // Fetch tareas de un curso
  const fetchAssignments = async (courseId: string) => {
    setLoadingAssignments(true)
    setErrorAssignments(null)
    
    try {
      const response = await fetch(`/api/teacher/courses/${courseId}/assignments`)
      const data = await response.json()
      
      if (data.success) {
        setAssignments(data.data.assignments)
      } else {
        setErrorAssignments(data.error)
      }
    } catch (error: unknown) {
      setErrorAssignments('Error al cargar tareas')
    } finally {
      setLoadingAssignments(false)
    }
  }

  // Fetch estudiantes de un curso
  const fetchStudents = async (courseId: string) => {
    setLoadingStudents(true)
    setErrorStudents(null)
    
    try {
      const response = await fetch(`/api/teacher/courses/${courseId}/students`)
      const data = await response.json()
      
      if (data.success) {
        setStudents(data.data.students)
      } else {
        setErrorStudents(data.error)
      }
    } catch (error: unknown) {
      setErrorStudents('Error al cargar estudiantes')
    } finally {
      setLoadingStudents(false)
    }
  }

  // Fetch calificaciones de un curso
  const fetchGrades = async (courseId: string) => {
    setLoadingGrades(true)
    setErrorGrades(null)
    
    try {
      const response = await fetch(`/api/teacher/courses/${courseId}/grades`)
      const data = await response.json()
      
      if (data.success) {
        setGrades(data.data)
      } else {
        setErrorGrades(data.error)
      }
    } catch (error: unknown) {
      setErrorGrades('Error al cargar calificaciones')
    } finally {
      setLoadingGrades(false)
    }
  }

  // Limpiar datos
  const clearData = () => {
    setCourses([])
    setAssignments([])
    setStudents([])
    setGrades(null)
    setErrorCourses(null)
    setErrorAssignments(null)
    setErrorStudents(null)
    setErrorGrades(null)
  }

  return {
    courses,
    loadingCourses,
    errorCourses,
    fetchCourses,
    assignments,
    loadingAssignments,
    errorAssignments,
    fetchAssignments,
    students,
    loadingStudents,
    errorStudents,
    fetchStudents,
    grades,
    loadingGrades,
    errorGrades,
    fetchGrades,
    clearData
  }
}
