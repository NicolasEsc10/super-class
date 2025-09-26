'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  Users, 
  BookOpen, 
  FileText, 
  TrendingUp, 
  AlertTriangle,
  BarChart3,
  GraduationCap,
  Clock,
  CheckCircle,
  RefreshCw,
  Eye,
  Target
} from 'lucide-react'

interface OverviewData {
  totalStudents: number
  totalAssignments: number
  totalSubmissions: number
  totalPendingReview: number
  overallAverage: number
  activeCourses: number
  studentsAtRisk: number
}

interface CourseData {
  id: string
  name: string
  section: string
  students: number
  assignments: number
  submissions: number
  pendingReview: number
  average: number
  studentsAtRisk: number
  cohort: string
}

interface CohortData {
  name: string
  students: number
  assignments: number
  average: number
  courses: number
}

interface StudentAtRisk {
  studentId: string
  studentName: string
  courseId: string
  courseName: string
  cohort: string
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  reasons: string[]
  lateAssignments: number
  lowGradeAssignments: number
  missedAssignments: number
  average: number
  totalAssignments: number
  completedAssignments: number
}

export default function CoordinadorPage() {
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [courses, setCourses] = useState<CourseData[]>([])
  const [cohorts, setCohorts] = useState<CohortData[]>([])
  const [studentsAtRisk, setStudentsAtRisk] = useState<StudentAtRisk[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Cargar datos generales
      const overviewResponse = await fetch('/api/coordinator/overview')
      const overviewData = await overviewResponse.json()

      if (overviewData.success) {
        setOverview(overviewData.data.overview)
        setCourses(overviewData.data.courses)
        setCohorts(overviewData.data.cohorts)
      } else {
        throw new Error(overviewData.error)
      }

      // Cargar estudiantes en riesgo
      const riskResponse = await fetch('/api/coordinator/students-at-risk')
      const riskData = await riskResponse.json()

      if (riskData.success) {
        setStudentsAtRisk(riskData.data.studentsAtRisk)
      } else {
        console.error('Error cargando estudiantes en riesgo:', riskData.error)
        setStudentsAtRisk([])
      }

    } catch (error) {
      console.error('Error cargando datos:', error)
      setError(error instanceof Error ? error.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading) {
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

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error al cargar datos</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={loadData}>Reintentar</Button>
          </div>
        </div>
      </div>
    )
  }

  if (!overview) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay datos disponibles</h3>
            <p className="text-gray-600">Los datos del coordinador aparecerán aquí</p>
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
              Panel de Coordinador
            </h1>
            <p className="text-gray-600">
              Métricas consolidadas y análisis de rendimiento académico
            </p>
          </div>
          <Button 
            onClick={loadData}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </Button>
        </div>

        {/* Métricas principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Estudiantes</p>
                  <p className="text-2xl font-bold text-gray-900">{overview.totalStudents}</p>
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
                  <p className="text-sm font-medium text-gray-600">Cursos Activos</p>
                  <p className="text-2xl font-bold text-gray-900">{overview.activeCourses}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <FileText className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Tareas Totales</p>
                  <p className="text-2xl font-bold text-gray-900">{overview.totalAssignments}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">En Riesgo</p>
                  <p className="text-2xl font-bold text-gray-900">{overview.studentsAtRisk}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Métricas adicionales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Promedio General</p>
                  <p className="text-3xl font-bold text-gray-900">{overview.overallAverage}%</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Entregas Totales</p>
                  <p className="text-3xl font-bold text-gray-900">{overview.totalSubmissions}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Por Revisar</p>
                  <p className="text-3xl font-bold text-gray-900">{overview.totalPendingReview}</p>
                </div>
                <Clock className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Comparación entre cohortes */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              Comparación entre Cohortes
              <Badge variant="outline" className="ml-auto">
                {cohorts.length} cohortes
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cohorts.length > 0 ? (
              <div className="space-y-4">
                {cohorts.map((cohort) => (
                  <div key={cohort.name} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900">{cohort.name}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {cohort.students} estudiantes
                        </div>
                        <div className="flex items-center gap-1">
                          <BookOpen className="w-4 h-4" />
                          {cohort.courses} cursos
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900">{cohort.average}%</p>
                        <p className="text-xs text-gray-600">Promedio</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900">{cohort.assignments}</p>
                        <p className="text-xs text-gray-600">Tareas</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900">
                          {cohort.students > 0 ? Math.round(cohort.assignments / cohort.students) : 0}
                        </p>
                        <p className="text-xs text-gray-600">Tareas/Estudiante</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Rendimiento</span>
                        <span>{cohort.average}%</span>
                      </div>
                      <Progress value={cohort.average} className="h-2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <BarChart3 className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 text-sm">No hay datos de cohortes disponibles</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Estudiantes en riesgo */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              Estudiantes en Riesgo
              <Badge variant="outline" className="ml-auto">
                {studentsAtRisk.length} estudiantes
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {studentsAtRisk.length > 0 ? (
              <div className="space-y-4">
                {studentsAtRisk.slice(0, 10).map((student) => (
                  <div 
                    key={`${student.studentId}-${student.courseId}`}
                    className={`p-4 rounded-lg border ${
                      student.riskLevel === 'critical' 
                        ? 'bg-red-50 border-red-200' 
                        : student.riskLevel === 'high'
                        ? 'bg-orange-50 border-orange-200'
                        : student.riskLevel === 'medium'
                        ? 'bg-yellow-50 border-yellow-200'
                        : 'bg-blue-50 border-blue-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {student.studentName}
                          </h3>
                          <Badge 
                            variant={student.riskLevel === 'critical' ? 'destructive' : 'outline'}
                            className={`text-xs ${
                              student.riskLevel === 'critical' 
                                ? '' 
                                : student.riskLevel === 'high'
                                ? 'text-orange-700 border-orange-300'
                                : student.riskLevel === 'medium'
                                ? 'text-yellow-700 border-yellow-300'
                                : 'text-blue-700 border-blue-300'
                            }`}
                          >
                            {student.riskLevel === 'critical' ? 'Crítico' : 
                             student.riskLevel === 'high' ? 'Alto' : 
                             student.riskLevel === 'medium' ? 'Medio' : 'Bajo'}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-2">
                          <div>
                            <span className="font-medium">Curso:</span> {student.courseName}
                          </div>
                          <div>
                            <span className="font-medium">Cohorte:</span> {student.cohort}
                          </div>
                          <div>
                            <span className="font-medium">Promedio:</span> {student.average}%
                          </div>
                          <div>
                            <span className="font-medium">Completadas:</span> {student.completedAssignments}/{student.totalAssignments}
                          </div>
                        </div>
                        
                        <div className="text-sm">
                          <span className="font-medium text-gray-700">Problemas identificados:</span>
                          <p className="text-gray-600 mt-1">{student.reasons.join(', ')}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {studentsAtRisk.length > 10 && (
                  <div className="text-center pt-4 border-t">
                    <p className="text-sm text-gray-600">
                      Mostrando 10 de {studentsAtRisk.length} estudiantes en riesgo
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
                <p className="text-gray-600 text-sm">No hay estudiantes en riesgo</p>
                <p className="text-xs text-gray-500 mt-1">
                  Todos los estudiantes están al día con sus tareas
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resumen de cursos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-blue-600" />
              Resumen por Curso
              <Badge variant="outline" className="ml-auto">
                {courses.length} cursos
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {courses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {courses.map((course) => (
                  <div key={course.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <h3 className="font-semibold text-gray-900 mb-3 truncate">{course.name}</h3>
                    {course.section && (
                      <p className="text-sm text-gray-600 mb-3">{course.section}</p>
                    )}
                    
                    <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-600" />
                        <span className="text-gray-600">Estudiantes:</span>
                        <span className="font-medium">{course.students}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-green-600" />
                        <span className="text-gray-600">Tareas:</span>
                        <span className="font-medium">{course.assignments}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-purple-600" />
                        <span className="text-gray-600">Promedio:</span>
                        <span className="font-medium">{course.average}%</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-orange-600" />
                        <span className="text-gray-600">En riesgo:</span>
                        <span className="font-medium">{course.studentsAtRisk}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Rendimiento</span>
                        <span>{course.average}%</span>
                      </div>
                      <Progress value={course.average} className="h-2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <GraduationCap className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 text-sm">No hay cursos disponibles</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
