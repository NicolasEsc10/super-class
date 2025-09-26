'use client'

import { useState } from 'react'
import { useStudentAssignments, assignmentUtils, type StudentAssignment } from '@/hooks/useStudentAssignments'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  BookOpen,
  ExternalLink,
  Calendar,
  FileText,
  GraduationCap
} from 'lucide-react'

interface AssignmentCardProps {
  assignment: StudentAssignment
  showCourse?: boolean
}

function AssignmentCard({ assignment, showCourse = true }: AssignmentCardProps) {
  const getStateIcon = () => {
    if (assignment.isLate) return <AlertTriangle className="w-5 h-5 text-red-500" />
    if (assignment.state === 'TURNED_IN') return <CheckCircle className="w-5 h-5 text-green-500" />
    if (assignment.state === 'RETURNED') return <GraduationCap className="w-5 h-5 text-blue-500" />
    return <Clock className="w-5 h-5 text-yellow-500" />
  }

  const getWorkTypeIcon = () => {
    switch (assignment.workType) {
      case 'ASSIGNMENT':
        return <FileText className="w-4 h-4" />
      case 'SHORT_ANSWER_QUESTION':
      case 'MULTIPLE_CHOICE_QUESTION':
        return <BookOpen className="w-4 h-4" />
      default:
        return <FileText className="w-4 h-4" />
    }
  }

  return (
    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-gray-50 transition-all">
      {/* Icono de estado + Información principal */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {getStateIcon()}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 truncate">
            {assignment.title}
          </h3>
          {showCourse && (
            <p className="text-sm text-gray-500 truncate">
              {assignment.courseName}
            </p>
          )}
        </div>
      </div>

      {/* Fecha de vencimiento */}
      <div className="flex items-center gap-4">
        {assignment.dueDate && (
          <div className="text-sm text-right">
            <div className={`font-medium ${assignment.isLate ? 'text-red-600' : 'text-gray-700'}`}>
              {assignmentUtils.formatDueDate(assignment.dueDate)}
            </div>
          </div>
        )}

        {/* Calificación */}
        {assignment.maxPoints && (
          <div className="text-sm text-gray-500 text-right min-w-0">
            <div>
              {assignment.assignedGrade !== undefined ? assignment.assignedGrade : '--'}/{assignment.maxPoints}
            </div>
          </div>
        )}

        {/* Estados - Doble Badge */}
        <div className="flex gap-1">
          {assignment.isLate && (
            <Badge 
              variant="destructive"
              className="text-xs bg-red-100 text-red-800"
            >
              Atrasada
            </Badge>
          )}
          {assignment.isPending && (
            <Badge 
              variant="outline"
              className="text-xs text-yellow-700 border-yellow-300"
            >
              Pendiente
            </Badge>
          )}
          {assignment.state === 'TURNED_IN' && !assignment.isLate && (
            <Badge 
              variant="default"
              className="text-xs bg-green-100 text-green-800"
            >
              Entregada
            </Badge>
          )}
          {assignment.state === 'RETURNED' && (
            <Badge 
              variant="outline"
              className="text-xs bg-blue-100 text-blue-800"
            >
              Calificada
            </Badge>
          )}
        </div>

        {/* Enlace a Classroom */}
        {assignment.alternateLink && (
          <Button variant="ghost" size="sm" asChild>
            <a 
              href={assignment.alternateLink} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 p-1"
              title="Abrir en Google Classroom"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </Button>
        )}
      </div>
    </div>
  )
}

export default function StudentAssignments() {
  const { 
    assignments, 
    stats, 
    loading, 
    error,
    pendingAssignments,
    completedAssignments,
    lateAssignments,
    upcomingAssignments
  } = useStudentAssignments()

  const [activeTab, setActiveTab] = useState('pending')

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Cargando tus tareas...</p>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-red-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error al cargar tareas</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Intentar de nuevo
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div>
      {/* Header con estadísticas */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Mis Tareas</h1>
        <p className="text-gray-600 mb-6">Gestiona y realiza seguimiento de tus tareas de Google Classroom</p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-600">Total</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <div className="text-sm text-gray-600">Pendientes</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              <div className="text-sm text-gray-600">Completadas</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{stats.late}</div>
              <div className="text-sm text-gray-600">Atrasadas</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs con filtros */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending">
            Pendientes ({stats.pending})
          </TabsTrigger>
          <TabsTrigger value="upcoming">
            Próximas ({upcomingAssignments.length})
          </TabsTrigger>
          <TabsTrigger value="late">
            Atrasadas ({stats.late})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completadas ({stats.completed})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          <div className="space-y-4">
            {pendingAssignments.length > 0 ? (
              pendingAssignments.map((assignment) => (
                <AssignmentCard key={assignment.id} assignment={assignment} />
              ))
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">¡Excelente!</h3>
                  <p className="text-gray-600">No tienes tareas pendientes</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="upcoming" className="mt-6">
          <div className="space-y-4">
            {upcomingAssignments.length > 0 ? (
              upcomingAssignments.map((assignment) => (
                <AssignmentCard key={assignment.id} assignment={assignment} />
              ))
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Calendar className="w-12 h-12 text-blue-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Todo tranquilo</h3>
                  <p className="text-gray-600">No tienes tareas próximas a vencer</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="late" className="mt-6">
          <div className="space-y-4">
            {lateAssignments.length > 0 ? (
              lateAssignments.map((assignment) => (
                <AssignmentCard key={assignment.id} assignment={assignment} />
              ))
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">¡Perfecto!</h3>
                  <p className="text-gray-600">No tienes tareas atrasadas</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          <div className="space-y-4">
            {completedAssignments.length > 0 ? (
              completedAssignments.map((assignment) => (
                <AssignmentCard key={assignment.id} assignment={assignment} />
              ))
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Aún no hay tareas completadas</h3>
                  <p className="text-gray-600">Las tareas que completes aparecerán aquí</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
