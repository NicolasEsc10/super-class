'use client'

import { useEffect, useState } from 'react'
import { useTeacherData } from '@/hooks/useTeacherData'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  FileText, 
  Users, 
  Clock, 
  TrendingUp, 
  Calendar,
  Search,
  Filter,
  RefreshCw,
  BookOpen,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'
import Link from 'next/link'

interface AssignmentWithCourse {
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
  isActive: boolean
  courseId: string
  courseName: string
}

export default function ProfesorTareasPage() {
  const { courses, loadingCourses, errorCourses, fetchCourses } = useTeacherData()
  const [allAssignments, setAllAssignments] = useState<AssignmentWithCourse[]>([])
  const [loadingAssignments, setLoadingAssignments] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterState, setFilterState] = useState<'all' | 'active' | 'completed' | 'draft'>('all')
  const [sortBy, setSortBy] = useState<'dueDate' | 'title' | 'course' | 'completion'>('dueDate')

  // Cargar todas las tareas de todas las clases
  const loadAllAssignments = async () => {
    if (courses.length === 0) return

    setLoadingAssignments(true)
    const assignments: AssignmentWithCourse[] = []

    for (const course of courses) {
      try {
        const response = await fetch(`/api/teacher/courses/${course.id}/assignments`)
        const data = await response.json()
        
        if (data.success && data.data.assignments) {
          const courseAssignments = data.data.assignments.map((assignment: any) => ({
            ...assignment,
            courseId: course.id,
            courseName: course.name
          }))
          assignments.push(...courseAssignments)
        }
      } catch (error) {
        console.error(`Error cargando tareas de ${course.name}:`, error)
      }
    }

    setAllAssignments(assignments)
    setLoadingAssignments(false)
  }

  useEffect(() => {
    fetchCourses()
  }, [])

  useEffect(() => {
    if (courses.length > 0) {
      loadAllAssignments()
    }
  }, [courses])

  // Filtrar y ordenar tareas
  const filteredAssignments = allAssignments
    .filter(assignment => {
      const matchesSearch = assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           assignment.courseName.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesFilter = filterState === 'all' || 
                           (filterState === 'active' && assignment.isActive) ||
                           (filterState === 'completed' && !assignment.isActive && assignment.submittedCount > 0) ||
                           (filterState === 'draft' && assignment.state === 'DRAFT')
      
      return matchesSearch && matchesFilter
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'dueDate':
          if (!a.dueDate && !b.dueDate) return 0
          if (!a.dueDate) return 1
          if (!b.dueDate) return -1
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        case 'title':
          return a.title.localeCompare(b.title)
        case 'course':
          return a.courseName.localeCompare(b.courseName)
        case 'completion':
          return b.completionRate - a.completionRate
        default:
          return 0
      }
    })

  const getStateColor = (state: string) => {
    switch (state) {
      case 'PUBLISHED':
        return 'bg-green-100 text-green-800'
      case 'DRAFT':
        return 'bg-yellow-100 text-yellow-800'
      case 'DELETED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStateText = (state: string) => {
    switch (state) {
      case 'PUBLISHED':
        return 'Publicada'
      case 'DRAFT':
        return 'Borrador'
      case 'DELETED':
        return 'Eliminada'
      default:
        return state
    }
  }

  if (loadingCourses) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando tareas...</p>
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Tareas</h1>
            <p className="text-gray-600">
              Gestiona todas las tareas de tus clases
            </p>
          </div>
          <Button 
            onClick={loadAllAssignments}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            disabled={loadingAssignments}
          >
            <RefreshCw className={`w-4 h-4 ${loadingAssignments ? 'animate-spin' : ''}`} />
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
                    placeholder="Buscar por título o clase..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Filtros */}
              <div className="flex gap-2">
                <select
                  value={filterState}
                  onChange={(e) => setFilterState(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  aria-label="Filtrar tareas por estado"
                >
                  <option value="all">Todas las tareas</option>
                  <option value="active">Tareas activas</option>
                  <option value="completed">Completadas</option>
                  <option value="draft">Borradores</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  aria-label="Ordenar tareas"
                >
                  <option value="dueDate">Ordenar por fecha</option>
                  <option value="title">Ordenar por título</option>
                  <option value="course">Ordenar por clase</option>
                  <option value="completion">Ordenar por completitud</option>
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
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Tareas</p>
                  <p className="text-2xl font-bold text-gray-900">{allAssignments.length}</p>
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
                  <p className="text-sm font-medium text-gray-600">Tareas Activas</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {allAssignments.filter(a => a.isActive).length}
                  </p>
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
                  <p className="text-2xl font-bold text-gray-900">
                    {allAssignments.reduce((sum, a) => sum + a.pendingCount, 0)}
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
                    {allAssignments.length > 0 
                      ? Math.round(allAssignments.reduce((sum, a) => sum + (a.averageGrade || 0), 0) / allAssignments.length)
                      : 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de tareas */}
        <div className="space-y-4">
          {loadingAssignments ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Cargando tareas...</p>
            </div>
          ) : filteredAssignments.length > 0 ? (
            filteredAssignments.map((assignment) => (
              <Card key={`${assignment.courseId}-${assignment.id}`} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {assignment.title}
                        </h3>
                        <Badge className={getStateColor(assignment.state)}>
                          {getStateText(assignment.state)}
                        </Badge>
                        {assignment.isActive && (
                          <Badge variant="outline" className="text-green-700 border-green-300">
                            Activa
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-1">
                          <BookOpen className="w-4 h-4" />
                          {assignment.courseName}
                        </div>
                        {assignment.dueDate && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(assignment.dueDate).toLocaleDateString('es-ES')}
                          </div>
                        )}
                        {assignment.maxPoints && (
                          <div className="flex items-center gap-1">
                            <TrendingUp className="w-4 h-4" />
                            {assignment.maxPoints} puntos
                          </div>
                        )}
                      </div>

                      {assignment.description && (
                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                          {assignment.description}
                        </p>
                      )}

                      <div className="flex items-center gap-6 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {assignment.submittedCount}/{assignment.totalStudents} entregados
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {assignment.pendingCount} por revisar
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-4 h-4" />
                          {assignment.completionRate.toFixed(1)}% completado
                        </div>
                        {assignment.averageGrade !== undefined && (
                          <div className="flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" />
                            Promedio: {assignment.averageGrade.toFixed(1)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/profesor/clases/${assignment.courseId}`}>
                          Ver Clase
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {searchTerm || filterState !== 'all' ? 'No se encontraron tareas' : 'No hay tareas'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || filterState !== 'all' 
                    ? 'Intenta ajustar los filtros de búsqueda'
                    : 'Las tareas de tus clases aparecerán aquí'
                  }
                </p>
                {(searchTerm || filterState !== 'all') && (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSearchTerm('')
                      setFilterState('all')
                    }}
                  >
                    Limpiar filtros
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
