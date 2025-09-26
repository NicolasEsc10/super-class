'use client'

import { useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useStudentProgressData } from '@/stores/progressStore'
import { useStudentAssignments } from '@/hooks/useStudentAssignments'
import { 
  BookOpen, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp,
  Calendar,
  Award,
  Target,
  FileText
} from 'lucide-react'

export default function StudentProgressView() {
  const { progress, loading, error, fetch } = useStudentProgressData()
  const { upcomingAssignments, assignmentUtils } = useStudentAssignments()

  useEffect(() => {
    fetch()
  }, [fetch])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-600 mb-2">Error al cargar el progreso</p>
            <p className="text-sm text-gray-500 mb-4">{error}</p>
            <Button onClick={fetch} variant="outline">
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!progress) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <BookOpen className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">No hay datos de progreso disponibles</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const completionRate = progress.totalAssignments > 0 
    ? (progress.completedAssignments / progress.totalAssignments) * 100 
    : 0

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200'
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      default: return 'text-green-600 bg-green-50 border-green-200'
    }
  }

  const getRiskText = (level: string) => {
    switch (level) {
      case 'high': return 'Alto Riesgo'
      case 'medium': return 'Riesgo Medio'
      default: return 'Bajo Riesgo'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mi Progreso Académico</h1>
          <p className="text-gray-600">Vista consolidada de tu rendimiento</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getRiskColor(progress.riskLevel)}>
            {getRiskText(progress.riskLevel)}
          </Badge>
          <Button onClick={fetch} variant="outline" size="sm">
            🔄 Actualizar
          </Button>
        </div>
      </div>

      {/* Métricas Generales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Tareas</p>
                <p className="text-2xl font-bold text-gray-900">{progress.totalAssignments}</p>
              </div>
              <BookOpen className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completadas</p>
                <p className="text-2xl font-bold text-green-600">{progress.completedAssignments}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pendientes</p>
                <p className="text-2xl font-bold text-yellow-600">{progress.pendingAssignments}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Atrasadas</p>
                <p className="text-2xl font-bold text-red-600">{progress.lateAssignments}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progreso General */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Progreso General
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Tasa de Completitud</span>
              <span className="text-sm font-bold">{completionRate.toFixed(1)}%</span>
            </div>
            <Progress value={completionRate} className="h-3" />
            
            {progress.averageGrade && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm font-medium">Promedio de Calificaciones</span>
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm font-bold">{progress.averageGrade.toFixed(1)}</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tareas Próximas a Vencer */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-500" />
            Tareas Próximas a Vencer
            <Badge variant="outline" className="ml-auto">
              {upcomingAssignments.length} tareas
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingAssignments.length > 0 ? (
            <div className="space-y-3">
              {upcomingAssignments.slice(0, 8).map((assignment) => (
                <div key={assignment.id} className="flex items-center justify-between p-3 rounded-lg border hover:border-orange-300 hover:bg-orange-50 transition-all">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      {assignment.isLate ? (
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                      ) : (
                        <Clock className="w-5 h-5 text-orange-500" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">{assignment.title}</h4>
                      <p className="text-sm text-gray-600 truncate">{assignment.courseName}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-sm text-right">
                      <div className={`font-medium ${
                        assignment.isLate ? 'text-red-600' : 'text-orange-600'
                      }`}>
                        {assignmentUtils.formatDueDate(assignment.dueDate)}
                      </div>
                      {assignment.maxPoints && (
                        <div className="text-xs text-gray-500">
                          {assignment.assignedGrade || '--'}/{assignment.maxPoints} pts
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-1">
                      {assignment.isLate && (
                        <Badge variant="destructive" className="text-xs">
                          Atrasada
                        </Badge>
                      )}
                      {assignment.isPending && !assignment.isLate && (
                        <Badge variant="outline" className="text-xs text-orange-700 border-orange-300">
                          Pendiente
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {upcomingAssignments.length > 8 && (
                <div className="text-center pt-3 border-t">
                  <p className="text-sm text-gray-500">
                    Y {upcomingAssignments.length - 8} tareas más...
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-2">¡Excelente!</p>
              <p className="text-sm text-gray-500">
                No tienes tareas próximas a vencer
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progreso por Clase */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Progreso por Clase
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {progress.courseProgress.map((course) => (
              <div key={course.courseId} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">{course.courseName}</h3>
                  <Badge variant="outline">
                    {course.completionRate.toFixed(0)}% completado
                  </Badge>
                </div>
                
                <Progress value={course.completionRate} className="mb-3" />
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <p className="font-medium text-gray-900">{course.totalAssignments}</p>
                    <p className="text-gray-600">Total</p>
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-green-600">{course.completedAssignments}</p>
                    <p className="text-gray-600">Completadas</p>
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-yellow-600">{course.pendingAssignments}</p>
                    <p className="text-gray-600">Pendientes</p>
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-red-600">{course.lateAssignments}</p>
                    <p className="text-gray-600">Atrasadas</p>
                  </div>
                </div>

                {course.averageGrade && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex items-center justify-center gap-2">
                      <Award className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm">
                        Promedio: <span className="font-semibold">{course.averageGrade.toFixed(1)}</span>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Alertas y Recomendaciones */}
      {(progress.lateAssignments > 0 || progress.riskLevel !== 'low') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="w-5 h-5" />
              Alertas y Recomendaciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {progress.lateAssignments > 0 && (
                <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-800">
                      Tienes {progress.lateAssignments} tarea{progress.lateAssignments > 1 ? 's' : ''} atrasada{progress.lateAssignments > 1 ? 's' : ''}
                    </p>
                    <p className="text-sm text-red-700">
                      Es importante ponerte al día lo antes posible para mantener tu rendimiento académico.
                    </p>
                  </div>
                </div>
              )}

              {progress.riskLevel === 'high' && (
                <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-800">Nivel de riesgo alto</p>
                    <p className="text-sm text-red-700">
                      Tu tasa de completitud está por debajo del 50%. Te recomendamos hablar con tus profesores y crear un plan de recuperación.
                    </p>
                  </div>
                </div>
              )}

              {progress.riskLevel === 'medium' && (
                <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <Clock className="w-5 h-5 text-yellow-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-800">Nivel de riesgo medio</p>
                    <p className="text-sm text-yellow-700">
                      Tu rendimiento podría mejorar. Considera organizar mejor tu tiempo y priorizar las tareas pendientes.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
