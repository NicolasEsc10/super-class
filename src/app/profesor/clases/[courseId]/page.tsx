'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useTeacherData } from '@/hooks/useTeacherData'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  BookOpen, 
  Users, 
  FileText, 
  Calendar,
  ExternalLink,
  ArrowLeft,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'
import Link from 'next/link'

export default function ProfesorClaseDetallePage() {
  const params = useParams()
  const courseId = params.courseId as string
  
  const {
    courses,
    assignments,
    students,
    loadingCourses,
    loadingAssignments,
    loadingStudents,
    errorCourses,
    errorAssignments,
    errorStudents,
    fetchCourses,
    fetchAssignments,
    fetchStudents
  } = useTeacherData()

  const [currentCourse, setCurrentCourse] = useState<{ 
    id: string; 
    name: string; 
    description?: string;
    section?: string;
    courseState?: string;
    enrollmentCode?: string;
    room?: string;
    alternateLink?: string;
  } | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'assignments' | 'students'>('overview')

  useEffect(() => {
    fetchCourses()
  }, [])

  useEffect(() => {
    if (courses.length > 0) {
      const course = courses.find(c => c.id === courseId)
      if (course) {
        setCurrentCourse({
          id: course.id,
          name: course.name,
          description: course.description,
          section: course.section,
          courseState: course.courseState,
          enrollmentCode: course.enrollmentCode,
          room: course.room,
          alternateLink: course.alternateLink
        })
      }
    }
  }, [courses, courseId])

  useEffect(() => {
    if (courseId) {
      fetchAssignments(courseId)
      fetchStudents(courseId)
    }
  }, [courseId])

  if (loadingCourses) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="h-64 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    )
  }

  if (errorCourses || !currentCourse) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {errorCourses ? 'Error al cargar la clase' : 'Clase no encontrada'}
            </h2>
            <p className="text-gray-600 mb-4">
              {errorCourses || 'La clase que buscas no existe o no tienes permisos para verla'}
            </p>
            <Button asChild>
              <Link href="/profesor/clases">
                Volver a Mis Clases
              </Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Calcular estadísticas
  const totalStudents = students.length
  const totalAssignments = assignments.length
  const publishedAssignments = assignments.filter(a => a.state === 'PUBLISHED').length
  const averageCompletion = assignments.length > 0 
    ? assignments.reduce((sum, a) => sum + a.completionRate, 0) / assignments.length 
    : 0

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button asChild variant="outline" size="sm">
              <Link href="/profesor/clases">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Link>
            </Button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">{currentCourse.name}</h1>
              {currentCourse.section && (
                <p className="text-gray-600">{currentCourse.section}</p>
              )}
            </div>
            <Badge 
              variant={currentCourse.courseState === 'ACTIVE' ? 'default' : 'secondary'}
            >
              {currentCourse.courseState === 'ACTIVE' ? 'Activa' : 'Archivada'}
            </Badge>
          </div>
          
          {currentCourse.description && (
            <p className="text-gray-600 max-w-3xl">{currentCourse.description}</p>
          )}
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Estudiantes</p>
                  <p className="text-2xl font-bold text-gray-900">{totalStudents}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <FileText className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Tareas</p>
                  <p className="text-2xl font-bold text-gray-900">{totalAssignments}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Publicadas</p>
                  <p className="text-2xl font-bold text-gray-900">{publishedAssignments}</p>
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
                  <p className="text-sm font-medium text-gray-600">Completado</p>
                  <p className="text-2xl font-bold text-gray-900">{averageCompletion.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Resumen
              </button>
              <button
                onClick={() => setActiveTab('assignments')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'assignments'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Tareas ({totalAssignments})
              </button>
              <button
                onClick={() => setActiveTab('students')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'students'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Estudiantes ({totalStudents})
              </button>
            </nav>
          </div>
        </div>

        {/* Contenido de tabs */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Información de la Clase</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Código de inscripción:</span>
                  <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                    {currentCourse.enrollmentCode || 'N/A'}
                  </span>
                </div>
                {currentCourse.room && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Aula:</span>
                    <span>{currentCourse.room}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Estado:</span>
                  <Badge variant={currentCourse.courseState === 'ACTIVE' ? 'default' : 'secondary'}>
                    {currentCourse.courseState === 'ACTIVE' ? 'Activa' : 'Archivada'}
                  </Badge>
                </div>
                {currentCourse.alternateLink && (
                  <div className="pt-4">
                    <Button asChild variant="outline" className="w-full">
                      <a 
                        href={currentCourse.alternateLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Abrir en Google Classroom
                      </a>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Estadísticas de Completado</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Promedio general</span>
                      <span>{averageCompletion.toFixed(1)}%</span>
                    </div>
                    <Progress value={averageCompletion} className="h-2" />
                  </div>
                  <div className="text-sm text-gray-600">
                    Basado en {totalAssignments} tareas asignadas
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'assignments' && (
          <div className="space-y-4">
            {loadingAssignments ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Cargando tareas...</p>
              </div>
            ) : errorAssignments ? (
              <div className="text-center py-8">
                <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-gray-600">{errorAssignments}</p>
              </div>
            ) : assignments.length > 0 ? (
              assignments.map((assignment) => (
                <Card key={assignment.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {assignment.title}
                        </h3>
                        {assignment.description && (
                          <p className="text-gray-600 mb-3 line-clamp-2">
                            {assignment.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {assignment.submittedCount}/{assignment.totalStudents} entregados
                          </div>
                          <div className="flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" />
                            {assignment.gradedCount} calificados
                          </div>
                          {assignment.maxPoints && (
                            <div className="flex items-center gap-1">
                              <TrendingUp className="w-4 h-4" />
                              {assignment.maxPoints} puntos
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="ml-4 flex flex-col items-end gap-2">
                        <div className="text-sm text-gray-500">
                          {assignment.completionRate.toFixed(1)}% completado
                        </div>
                      </div>
                    </div>
                    <div className="mt-4">
                      <Progress value={assignment.completionRate} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No hay tareas en esta clase</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'students' && (
          <div className="space-y-4">
            {loadingStudents ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Cargando estudiantes...</p>
              </div>
            ) : errorStudents ? (
              <div className="text-center py-8">
                <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-gray-600">{errorStudents}</p>
              </div>
            ) : students.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {students.map((student) => (
                  <Card key={student.userId}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-gray-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 truncate">
                            {student.profile.name.fullName || 
                             `${student.profile.name.givenName || ''} ${student.profile.name.familyName || ''}`.trim() ||
                             'Sin nombre'}
                          </h4>
                          <p className="text-sm text-gray-600 truncate">
                            {student.profile.emailAddress}
                          </p>
                        </div>
                        <Badge 
                          variant={student.state === 'ACTIVE' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {student.state === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No hay estudiantes en esta clase</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
