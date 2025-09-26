'use client'

import { useEffect, useState } from 'react'
import { useTeacherData } from '@/hooks/useTeacherData'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { 
  BookOpen, 
  Users, 
  FileText, 
  TrendingUp, 
  Clock,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Calendar,
  GraduationCap,
  RefreshCw
} from 'lucide-react'
import Link from 'next/link'

interface TeacherDashboardProps {
  userName?: string
}

export default function TeacherDashboard({ userName }: TeacherDashboardProps) {
  const {
    courses,
    loadingCourses,
    errorCourses,
    fetchCourses,
    assignments,
    loadingAssignments,
    errorAssignments,
    fetchAssignments
  } = useTeacherData()

  const [stats, setStats] = useState({
    totalStudents: 0,
    activeAssignments: 0,
    pendingReview: 0,
    classAverage: 0
  })

  const [courseStats, setCourseStats] = useState<Array<{
    courseId: string
    courseName: string
    students: number
    assignments: number
    pendingReview: number
    average: number
  }>>([])

  const [recentSubmissions, setRecentSubmissions] = useState<Array<{
    studentId: string
    studentName: string
    courseName: string
    courseId: string
    assignmentTitle: string
    assignmentId: string
    submissionTime: string
    isLate: boolean
    grade?: number
    maxPoints?: number
    status: 'TURNED_IN' | 'RETURNED'
  }>>([])

  const [studentsAtRisk, setStudentsAtRisk] = useState<Array<{
    studentId: string
    studentName: string
    courseName: string
    courseId: string
    riskLevel: 'low' | 'medium' | 'high' | 'critical'
    reasons: string[]
    lateAssignments: number
    averageGrade: number
    totalAssignments: number
    completedAssignments: number
  }>>([])

  useEffect(() => {
    fetchCourses()
  }, [])

  // Función para cargar entregas recientes de estudiantes
  const loadRecentSubmissions = async () => {
    try {
      const response = await fetch('/api/teacher/recent-submissions')
      const data = await response.json()
      
      if (data.success) {
        setRecentSubmissions(data.data.recentSubmissions)
      } else {
        console.error('Error cargando entregas recientes:', data.error)
        setRecentSubmissions([])
      }
    } catch (error) {
      console.error('Error cargando entregas recientes:', error)
      setRecentSubmissions([])
    }
  }

  // Función para cargar calificaciones de todas las clases
  const loadAllGrades = async () => {
    if (courses.length === 0) return

    const allGrades: Array<{
      courseId: string
      courseName: string
      students: number
      assignments: number
      pendingReview: number
      average: number
    }> = []

    for (const course of courses) {
      try {
        const response = await fetch(`/api/teacher/courses/${course.id}/grades`)
        const data = await response.json()
        
        if (data.success) {
          const grades = data.data
          allGrades.push({
            courseId: course.id,
            courseName: grades.courseName,
            students: grades.totalStudents,
            assignments: grades.totalAssignments,
            pendingReview: grades.pendingReview || 0,
            average: grades.classAverage
          })
        } else {
          // Si no se pueden obtener calificaciones, intentar obtener solo las entregas pendientes
          try {
            const assignmentsResponse = await fetch(`/api/teacher/courses/${course.id}/assignments`)
            const assignmentsData = await assignmentsResponse.json()
            
            let pendingCount = 0
            let classAverage = 0
            let activeAssignments = 0
            if (assignmentsData.success) {
              // Contar entregas pendientes de revisión
              pendingCount = assignmentsData.data.assignments.reduce((sum: number, assignment: any) => {
                return sum + (assignment.pendingCount || 0)
              }, 0)
              
              // Usar el promedio real de la clase
              classAverage = assignmentsData.data.classAverage || 0
              
              // Usar el conteo real de tareas activas
              activeAssignments = assignmentsData.data.activeAssignments || 0
            }
            
            allGrades.push({
              courseId: course.id,
              courseName: course.name,
              students: course.studentCount || 0,
              assignments: activeAssignments,
              pendingReview: pendingCount,
              average: classAverage
            })
          } catch (error) {
            console.error(`Error obteniendo tareas de ${course.name}:`, error)
            // Fallback final con datos básicos
            allGrades.push({
              courseId: course.id,
              courseName: course.name,
              students: course.studentCount || 0,
              assignments: 0, // Sin tareas activas si no se pueden obtener datos
              pendingReview: 0,
              average: 0
            })
          }
        }
      } catch (error) {
        console.error(`Error cargando calificaciones de ${course.name}:`, error)
        // Usar datos básicos si hay error
        allGrades.push({
          courseId: course.id,
          courseName: course.name,
          students: course.studentCount || 0,
          assignments: 0, // Sin tareas activas si hay error
          pendingReview: 0,
          average: 0
        })
      }
    }

    setCourseStats(allGrades)

    // Calcular estadísticas totales
    const totalStudents = allGrades.reduce((sum, course) => sum + course.students, 0)
    const totalAssignments = allGrades.reduce((sum, course) => sum + course.assignments, 0)
    const totalPendingReview = allGrades.reduce((sum, course) => sum + course.pendingReview, 0)
    const totalAverage = allGrades.length > 0 
      ? Math.round(allGrades.reduce((sum, course) => sum + course.average, 0) / allGrades.length)
      : 0
    
    setStats({
      totalStudents,
      activeAssignments: totalAssignments,
      pendingReview: totalPendingReview,
      classAverage: totalAverage
    })
  }

  useEffect(() => {
    if (courses.length > 0) {
      // Cargar calificaciones reales
      loadAllGrades()
    } else {
      // Si no hay cursos, resetear estadísticas a 0
      setStats({
        totalStudents: 0,
        activeAssignments: 0,
        pendingReview: 0,
        classAverage: 0
      })
      setCourseStats([])
    }
  }, [courses])

  // Función para cargar estudiantes en riesgo
  const loadStudentsAtRisk = async () => {
    try {
      const response = await fetch('/api/teacher/students-at-risk')
      const data = await response.json()
      
      if (data.success) {
        setStudentsAtRisk(data.data.studentsAtRisk)
      } else {
        console.error('Error cargando estudiantes en riesgo:', data.error)
        setStudentsAtRisk([])
      }
    } catch (error) {
      console.error('Error cargando estudiantes en riesgo:', error)
      setStudentsAtRisk([])
    }
  }

  // Cargar entregas recientes cuando se carguen los cursos
  useEffect(() => {
    if (courses.length > 0) {
      loadRecentSubmissions()
      loadStudentsAtRisk()
    }
  }, [courses])

  // Actualizar datos automáticamente cada 30 segundos
  useEffect(() => {
    if (courses.length > 0) {
      const interval = setInterval(() => {
        loadAllGrades() // Actualizar tareas activas
        loadRecentSubmissions() // Actualizar entregas recientes
        loadStudentsAtRisk() // Actualizar estudiantes en riesgo
      }, 30000) // 30 segundos

      return () => clearInterval(interval)
    }
  }, [courses])

  if (loadingCourses) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (errorCourses) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error al cargar datos</h2>
            <p className="text-gray-600 mb-4">{errorCourses}</p>
            <Button onClick={fetchCourses}>Reintentar</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              ¡Bienvenido, {userName || 'Profesor'}!
            </h1>
            <p className="text-gray-600">
              Gestiona tus clases, estudiantes y tareas desde tu panel de control
            </p>
          </div>
          <Button 
            onClick={() => {
              if (courses.length > 0) {
                loadAllGrades()
                loadRecentSubmissions()
                loadStudentsAtRisk()
              }
            }}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </Button>
        </div>

        {/* Estadísticas principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Estudiantes</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalStudents}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <BookOpen className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Tareas Activas</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeAssignments}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Clock className="w-6 h-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Por Revisar</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pendingReview}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Promedio Clase</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.classAverage}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Estadísticas por clase */}
        {courseStats.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                Estadísticas por Clase
                <Badge variant="outline" className="ml-auto">
                  {courseStats.length} clases
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {courseStats.map((course) => (
                  <div key={course.courseId} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <h3 className="font-semibold text-gray-900 mb-3 truncate">{course.courseName}</h3>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-600" />
                        <span className="text-gray-600">Estudiantes:</span>
                        <span className="font-medium">{course.students}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-green-600" />
                        <span className="text-gray-600">Tareas:</span>
                        <span className="font-medium">{course.assignments}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-orange-600" />
                        <span className="text-gray-600">Por revisar:</span>
                        <span className="font-medium">{course.pendingReview}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-purple-600" />
                        <span className="text-gray-600">Promedio:</span>
                        <span className="font-medium">{course.average}%</span>
                      </div>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t">
                      <Button asChild size="sm" className="w-full">
                        <Link href={`/profesor/clases/${course.courseId}`}>
                          Ver Detalles
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Contenido principal */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Rendimiento por Clase */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Rendimiento por Clase
              </CardTitle>
            </CardHeader>
            <CardContent>
              {courseStats.length > 0 ? (
                <div className="space-y-4">
                  {courseStats.slice(0, 3).map((course) => (
                    <div key={course.courseId} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-900">{course.courseName}</span>
                        <span className="text-sm text-gray-600">{course.average}%</span>
                      </div>
                      <Progress 
                        value={course.average} 
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <TrendingUp className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 text-sm">No hay datos de rendimiento</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Entregas Recientes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-green-600" />
                Entregas Recientes
                {recentSubmissions.length > 0 && (
                  <Badge variant="outline" className="ml-auto">
                    {recentSubmissions.length} entregas
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentSubmissions.length > 0 ? (
                <div className="space-y-3">
                  {recentSubmissions.slice(0, 3).map((submission) => (
                    <div key={`${submission.studentId}-${submission.assignmentId}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-gray-600">
                          {submission.studentName.split(' ').map(word => word[0]).join('').slice(0, 2)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{submission.studentName}</p>
                        <p className="text-xs text-gray-500 truncate">{submission.assignmentTitle}</p>
                        <p className="text-xs text-gray-400 truncate">{submission.courseName}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge 
                          variant={submission.isLate ? 'destructive' : 'default'}
                          className="text-xs"
                        >
                          {submission.isLate ? 'Tarde' : 'A tiempo'}
                        </Badge>
                        {submission.grade !== undefined && submission.maxPoints && (
                          <span className="text-xs text-gray-500">
                            {submission.grade}/{submission.maxPoints}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {recentSubmissions.length > 3 && (
                    <div className="text-center pt-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href="/profesor/estudiantes">
                          Ver todas las entregas ({recentSubmissions.length})
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Clock className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 text-sm">No hay entregas recientes</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Los estudiantes aparecerán aquí cuando entreguen tareas
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Estudiantes en Riesgo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                Estudiantes en Riesgo
                {studentsAtRisk.length > 0 && (
                  <Badge variant="outline" className="ml-auto">
                    {studentsAtRisk.length} estudiantes
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {studentsAtRisk.length > 0 ? (
                <div className="space-y-3">
                  {studentsAtRisk.slice(0, 3).map((student) => (
                    <div 
                      key={`${student.studentId}-${student.courseId}`}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${
                        student.riskLevel === 'critical' 
                          ? 'bg-red-50 border-red-200' 
                          : student.riskLevel === 'high'
                          ? 'bg-orange-50 border-orange-200'
                          : 'bg-yellow-50 border-yellow-200'
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full ${
                        student.riskLevel === 'critical' 
                          ? 'bg-red-500' 
                          : student.riskLevel === 'high'
                          ? 'bg-orange-500'
                          : 'bg-yellow-500'
                      }`}></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {student.studentName}
                        </p>
                        <p className="text-xs text-gray-600 truncate">
                          {student.courseName}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {student.reasons.join(', ')}
                        </p>
                      </div>
                      <Badge 
                        variant={student.riskLevel === 'critical' ? 'destructive' : 'outline'}
                        className={`text-xs ${
                          student.riskLevel === 'critical' 
                            ? '' 
                            : student.riskLevel === 'high'
                            ? 'text-orange-700 border-orange-300'
                            : 'text-yellow-700 border-yellow-300'
                        }`}
                      >
                        {student.riskLevel === 'critical' ? 'Crítico' : 
                         student.riskLevel === 'high' ? 'Alto' : 
                         student.riskLevel === 'medium' ? 'Medio' : 'Bajo'}
                      </Badge>
                    </div>
                  ))}
                  
                  {studentsAtRisk.length > 3 && (
                    <div className="text-center pt-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href="/profesor/estudiantes">
                          Ver todos los estudiantes ({studentsAtRisk.length})
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <AlertTriangle className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 text-sm">No hay estudiantes en riesgo</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Todos los estudiantes están al día
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

        </div>

        {/* Tareas Activas (si hay clases) */}
        {courses.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Tareas Activas
                <Badge variant="outline" className="ml-auto">
                  {stats.activeAssignments} tareas
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.activeAssignments > 0 ? (
                <div className="space-y-4">
                  {courseStats.slice(0, 5).map((course) => (
                    <div key={course.courseId} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">{course.courseName}</h3>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {course.students} estudiantes
                          </div>
                          <div className="flex items-center gap-1">
                            <FileText className="w-4 h-4" />
                            {course.assignments} tareas activas
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {course.pendingReview} por revisar
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">{course.average}%</div>
                          <div className="text-xs text-gray-500">Promedio</div>
                        </div>
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/profesor/clases/${course.courseId}`}>
                            Ver
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="text-center pt-4 border-t">
                    <Button variant="outline" asChild>
                      <Link href="/profesor/tareas">
                        Ver todas las tareas
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 mb-2">No hay tareas activas</p>
                  <p className="text-sm text-gray-500">
                    Las tareas de tus clases aparecerán aquí cuando tengan estudiantes pendientes
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
