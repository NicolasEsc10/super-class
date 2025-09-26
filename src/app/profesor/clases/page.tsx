'use client'

import { useEffect, useState } from 'react'
import { useTeacherData } from '@/hooks/useTeacherData'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  BookOpen, 
  Users, 
  FileText, 
  Calendar,
  ExternalLink,
  Plus,
  Search,
  Filter
} from 'lucide-react'
import Link from 'next/link'

export default function ProfesorClasesPage() {
  const {
    courses,
    loadingCourses,
    errorCourses,
    fetchCourses
  } = useTeacherData()

  const [searchTerm, setSearchTerm] = useState('')
  const [filterState, setFilterState] = useState<'all' | 'active' | 'archived'>('all')

  useEffect(() => {
    fetchCourses()
  }, [])

  // Filtrar cursos
  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.section?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filterState === 'all' || 
                         (filterState === 'active' && course.courseState === 'ACTIVE') ||
                         (filterState === 'archived' && course.courseState !== 'ACTIVE')
    
    return matchesSearch && matchesFilter
  })

  if (loadingCourses) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
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
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error al cargar clases</h2>
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
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Mis Clases</h1>
              <p className="text-gray-600">
                Gestiona todas tus clases y su contenido
              </p>
            </div>
            <Button asChild>
              <Link href="/profesor/dashboard">
                <BookOpen className="w-4 h-4 mr-2" />
                Volver al Dashboard
              </Link>
            </Button>
          </div>
        </div>

        {/* Filtros y búsqueda */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar clases..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={filterState}
              onChange={(e) => setFilterState(e.target.value as 'all' | 'active' | 'archived')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="Filtrar clases por estado"
            >
              <option value="all">Todas las clases</option>
              <option value="active">Activas</option>
              <option value="archived">Archivadas</option>
            </select>
          </div>
        </div>

        {/* Lista de clases */}
        {filteredCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <Card key={course.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg font-semibold text-gray-900 truncate">
                        {course.name}
                      </CardTitle>
                      {course.section && (
                        <p className="text-sm text-gray-600 mt-1">{course.section}</p>
                      )}
                    </div>
                    <Badge 
                      variant={course.courseState === 'ACTIVE' ? 'default' : 'secondary'}
                      className="ml-2"
                    >
                      {course.courseState === 'ACTIVE' ? 'Activa' : 'Archivada'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {course.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {course.description}
                    </p>
                  )}
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1 text-gray-600">
                        <Users className="w-4 h-4" />
                        <span>Estudiantes</span>
                      </div>
                      <span className="font-medium">{course.studentCount || 0}</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1 text-gray-600">
                        <FileText className="w-4 h-4" />
                        <span>Tareas</span>
                      </div>
                      <span className="font-medium">{course.assignmentCount || 0}</span>
                    </div>
                    
                    {course.room && (
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1 text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span>Aula</span>
                        </div>
                        <span className="font-medium">{course.room}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-6 flex gap-2">
                    <Button asChild className="flex-1">
                      <Link href={`/profesor/clases/${course.id}`}>
                        Ver Detalles
                      </Link>
                    </Button>
                    {course.alternateLink && (
                      <Button asChild variant="outline" size="sm">
                        <a 
                          href={course.alternateLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          aria-label="Abrir clase en Google Classroom"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || filterState !== 'all' ? 'No se encontraron clases' : 'No tienes clases'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || filterState !== 'all' 
                ? 'Intenta ajustar los filtros de búsqueda'
                : 'Las clases aparecerán aquí cuando te unas a ellas como profesor'
              }
            </p>
            {(searchTerm || filterState !== 'all') && (
              <Button 
                onClick={() => {
                  setSearchTerm('')
                  setFilterState('all')
                }}
                variant="outline"
              >
                Limpiar filtros
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
