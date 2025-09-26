'use client'

import { useEffect, useState } from 'react'
import { useTeacherData } from '@/hooks/useTeacherData'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Users, 
  Search, 
  RefreshCw, 
  BookOpen, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  TrendingUp,
  User,
  Mail,
  Calendar,
  FileText,
  Award,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'

interface StudentWithCourses {
  id: string
  name: string
  email: string
  courses: {
    courseId: string
    courseName: string
  }[]
  totalAssignments: number
  completedAssignments: number
  pendingAssignments: number
  averageGrade: number
  isAtRisk: boolean
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  riskReasons: string[]
  lastSubmission?: string
  totalPoints: number
  earnedPoints: number
}

interface StudentProfile {
  student: StudentWithCourses
  isOpen: boolean
}

export default function ProfesorEstudiantesPage() {
  const { courses, loadingCourses, errorCourses, fetchCourses } = useTeacherData()
  const [allStudents, setAllStudents] = useState<StudentWithCourses[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRisk, setFilterRisk] = useState<'all' | 'at-risk' | 'safe'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'grade' | 'completion' | 'risk'>('name')
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null)

  // Cargar todos los estudiantes de todas las clases
  const loadAllStudents = async () => {
    if (courses.length === 0) return

    setLoadingStudents(true)
    const studentsMap = new Map<string, StudentWithCourses>()

    for (const course of courses) {
      try {
        // Obtener estudiantes de la clase
        const studentsResponse = await fetch(`/api/teacher/courses/${course.id}/students`)
        const studentsData = await studentsResponse.json()
        
        if (studentsData.success && studentsData.data.students) {
          for (const student of studentsData.data.students) {
            const studentId = student.userId
            const existingStudent = studentsMap.get(studentId)
            
            if (existingStudent) {
              // Agregar clase a estudiante existente
              existingStudent.courses.push({
                courseId: course.id,
                courseName: course.name
              })
            } else {
              // Crear nuevo estudiante
              studentsMap.set(studentId, {
                id: studentId,
                name: student.profile?.name?.fullName || student.profile?.name?.givenName || 'Estudiante',
                email: student.profile?.emailAddress || '',
                courses: [{
                  courseId: course.id,
                  courseName: course.name
                }],
                totalAssignments: 0,
                completedAssignments: 0,
                pendingAssignments: 0,
                averageGrade: 0,
                isAtRisk: false,
                riskLevel: 'low',
                riskReasons: [],
                totalPoints: 0,
                earnedPoints: 0
              })
            }
          }
        }

        // Obtener estadísticas de tareas para esta clase
        const assignmentsResponse = await fetch(`/api/teacher/courses/${course.id}/assignments`)
        const assignmentsData = await assignmentsResponse.json()
        
        if (assignmentsData.success && assignmentsData.data.assignments) {
          for (const assignment of assignmentsData.data.assignments) {
            // Aquí podrías obtener las entregas específicas del estudiante
            // Por ahora usamos datos generales
          }
        }
      } catch (error) {
        console.error(`Error cargando estudiantes de ${course.name}:`, error)
      }
    }

    // Obtener datos de estudiantes en riesgo
    try {
      const atRiskResponse = await fetch('/api/teacher/students-at-risk')
      const atRiskData = await atRiskResponse.json()
      
      if (atRiskData.success && atRiskData.data.studentsAtRisk) {
        for (const atRiskStudent of atRiskData.data.studentsAtRisk) {
          const student = studentsMap.get(atRiskStudent.studentId)
          if (student) {
            student.isAtRisk = true
            student.riskLevel = atRiskStudent.riskLevel
            student.riskReasons = atRiskStudent.reasons
          }
        }
      }
    } catch (error) {
      console.error('Error cargando estudiantes en riesgo:', error)
    }

    setAllStudents(Array.from(studentsMap.values()))
    setLoadingStudents(false)
  }

  useEffect(() => {
    fetchCourses()
  }, [])

  useEffect(() => {
    if (courses.length > 0) {
      loadAllStudents()
    }
  }, [courses])

  // Filtrar y ordenar estudiantes
  const filteredStudents = allStudents
    .filter(student => {
      const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           student.courses.some(course => 
                             course.courseName.toLowerCase().includes(searchTerm.toLowerCase())
                           )
      
      const matchesRiskFilter = filterRisk === 'all' || 
                               (filterRisk === 'at-risk' && student.isAtRisk) ||
                               (filterRisk === 'safe' && !student.isAtRisk)
      
      return matchesSearch && matchesRiskFilter
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'grade':
          return b.averageGrade - a.averageGrade
        case 'completion':
          const aCompletion = a.totalAssignments > 0 ? (a.completedAssignments / a.totalAssignments) * 100 : 0
          const bCompletion = b.totalAssignments > 0 ? (b.completedAssignments / b.totalAssignments) * 100 : 0
          return bCompletion - aCompletion
        case 'risk':
          const riskOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 }
          return riskOrder[b.riskLevel] - riskOrder[a.riskLevel]
        default:
          return 0
      }
    })

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getRiskText = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical':
        return 'Crítico'
      case 'high':
        return 'Alto'
      case 'medium':
        return 'Medio'
      case 'low':
        return 'Bajo'
      default:
        return 'Desconocido'
    }
  }

  const openStudentProfile = (student: StudentWithCourses) => {
    setSelectedStudent({ student, isOpen: true })
  }

  const closeStudentProfile = () => {
    setSelectedStudent(null)
  }

  if (loadingCourses) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando estudiantes...</p>
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Estudiantes</h1>
            <p className="text-gray-600">
              Gestiona y supervisa a todos tus estudiantes
            </p>
          </div>
          <Button 
            onClick={loadAllStudents}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            disabled={loadingStudents}
          >
            <RefreshCw className={`w-4 h-4 ${loadingStudents ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>

        {/* Filtros y búsqueda */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Búsqueda */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre, email o clase..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Filtros */}
              <div className="flex gap-2">
                <select
                  value={filterRisk}
                  onChange={(e) => setFilterRisk(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  aria-label="Filtrar estudiantes por riesgo"
                >
                  <option value="all">Todos los estudiantes</option>
                  <option value="at-risk">En riesgo</option>
                  <option value="safe">Sin riesgo</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  aria-label="Ordenar estudiantes"
                >
                  <option value="name">Ordenar por nombre</option>
                  <option value="grade">Ordenar por calificación</option>
                  <option value="completion">Ordenar por completitud</option>
                  <option value="risk">Ordenar por riesgo</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Estudiantes</p>
                  <p className="text-2xl font-bold text-gray-900">{allStudents.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Sin Riesgo</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {allStudents.filter(s => !s.isAtRisk).length}
                  </p>
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
                  <p className="text-2xl font-bold text-gray-900">
                    {allStudents.filter(s => s.isAtRisk).length}
                  </p>
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
                  <p className="text-sm font-medium text-gray-600">Promedio General</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {allStudents.length > 0 
                      ? Math.round(allStudents.reduce((sum, s) => sum + s.averageGrade, 0) / allStudents.length)
                      : 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de estudiantes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loadingStudents ? (
            <div className="col-span-full text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Cargando estudiantes...</p>
            </div>
          ) : filteredStudents.length > 0 ? (
            filteredStudents.map((student) => (
              <Card 
                key={student.id} 
                className={`hover:shadow-md transition-all cursor-pointer ${
                  student.isAtRisk ? 'border-l-4 border-l-orange-500' : ''
                }`}
                onClick={() => openStudentProfile(student)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{student.name}</h3>
                        <p className="text-sm text-gray-500">{student.email}</p>
                      </div>
                    </div>
                    {student.isAtRisk && (
                      <AlertCircle className="w-5 h-5 text-orange-500" />
                    )}
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <BookOpen className="w-4 h-4" />
                      <span>{student.courses.length} clase{student.courses.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <FileText className="w-4 h-4" />
                      <span>{student.completedAssignments}/{student.totalAssignments} tareas completadas</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Award className="w-4 h-4" />
                      <span>Promedio: {student.averageGrade.toFixed(1)}%</span>
                    </div>
                  </div>

                  {student.isAtRisk && (
                    <div className="mb-4">
                      <Badge className={getRiskColor(student.riskLevel)}>
                        {getRiskText(student.riskLevel)} Riesgo
                      </Badge>
                    </div>
                  )}

                  <div className="text-xs text-gray-500">
                    <p>Clases: {student.courses.map(c => c.courseName).join(', ')}</p>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full">
              <Card>
                <CardContent className="p-12 text-center">
                  <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {searchTerm || filterRisk !== 'all' ? 'No se encontraron estudiantes' : 'No hay estudiantes'}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {searchTerm || filterRisk !== 'all' 
                      ? 'Intenta ajustar los filtros de búsqueda'
                      : 'Los estudiantes de tus clases aparecerán aquí'
                    }
                  </p>
                  {(searchTerm || filterRisk !== 'all') && (
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setSearchTerm('')
                        setFilterRisk('all')
                      }}
                    >
                      Limpiar filtros
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Modal de perfil del estudiante */}
        {selectedStudent && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={closeStudentProfile}
          >
            <Card 
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-3">
                  <User className="w-6 h-6" />
                  Perfil de {selectedStudent.student.name}
                </CardTitle>
                <Button variant="outline" size="sm" onClick={closeStudentProfile}>
                  ✕
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Información básica */}
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                    <User className="w-8 h-8 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">{selectedStudent.student.name}</h3>
                    <p className="text-gray-600 flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      {selectedStudent.student.email}
                    </p>
                  </div>
                </div>

                {/* Estado de riesgo */}
                {selectedStudent.student.isAtRisk && (
                  <div className={`p-4 rounded-lg border ${getRiskColor(selectedStudent.student.riskLevel)}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-5 h-5" />
                      <span className="font-semibold">Estudiante en Riesgo</span>
                    </div>
                    <p className="text-sm mb-2">Razones:</p>
                    <ul className="text-sm list-disc list-inside">
                      {selectedStudent.student.riskReasons.map((reason, index) => (
                        <li key={index}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Estadísticas de tareas */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <FileText className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-gray-900">{selectedStudent.student.totalAssignments}</p>
                      <p className="text-sm text-gray-600">Total Tareas</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-gray-900">{selectedStudent.student.completedAssignments}</p>
                      <p className="text-sm text-gray-600">Completadas</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Clock className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-gray-900">{selectedStudent.student.pendingAssignments}</p>
                      <p className="text-sm text-gray-600">Pendientes</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Award className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-gray-900">{selectedStudent.student.averageGrade.toFixed(1)}%</p>
                      <p className="text-sm text-gray-600">Promedio</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Clases del estudiante */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Clases</h4>
                  <div className="space-y-2">
                    {selectedStudent.student.courses.map((course) => (
                      <div key={course.courseId} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                        <BookOpen className="w-4 h-4 text-gray-600" />
                        <span className="text-sm">{course.courseName}</span>
                        <Button size="sm" variant="outline" asChild className="ml-auto">
                          <Link href={`/profesor/clases/${course.courseId}`}>
                            Ver
                          </Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
