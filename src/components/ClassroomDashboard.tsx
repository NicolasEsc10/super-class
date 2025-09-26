'use client'

import { useEffect, useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase'
import { useClassroomCourses, useCourseDetails } from '@/hooks/useClassroom'
import { useStudentAssignments, assignmentUtils } from '@/hooks/useStudentAssignments'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Header from '@/components/shared/Header'
import { 
  Bell, 
  Settings, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Mail,
  MessageSquare,
  GraduationCap,
  Users,
  BookOpen,
  LogOut,
  User,
  Palette,
  BookMarked
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Session } from '@supabase/supabase-js'

export default function ClassroomDashboard() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createSupabaseClient()
  
  // Estado simplificado - solo para mostrar que está conectado
  const [isConnected, setIsConnected] = useState(false)
  const [courses, setCourses] = useState<any[]>([])
  const [loadingCourses, setLoadingCourses] = useState(false)
  const [coursesLoaded, setCoursesLoaded] = useState(false) // Para evitar recargas innecesarias

  // Hook para tareas del estudiante
  const { 
    assignments, 
    stats, 
    loading: loadingAssignments, 
    error: assignmentsError,
    forceRefresh,
    pendingAssignments,
    upcomingAssignments,
    lateAssignments
  } = useStudentAssignments()

  useEffect(() => {
    // Timeout de seguridad para evitar loading infinito
    const loadingTimeout = setTimeout(() => {
      setLoading(false)
    }, 5000) // Aumentado a 5 segundos para dar más tiempo

    // Inicializar autenticación con mejor manejo de errores
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.warn('Error al obtener sesión inicial:', error.message)
          // Si hay error, asumir que no hay sesión válida
          setSession(null)
          setIsConnected(false)
        } else {
          setSession(session)
          setIsConnected(!!session)
        }
      } catch (error: any) {
        console.error('Error inesperado al obtener sesión:', error)
        setSession(null)
        setIsConnected(false)
      } finally {
        clearTimeout(loadingTimeout)
        setLoading(false)
      }
    }

    initializeAuth()

    // Escuchar cambios en la autenticación con mejor manejo de errores
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', event, session?.user?.email || 'No user')
      
      setSession(session)
      setIsConnected(!!session)
      
      // Manejar eventos específicos
      if (event === 'SIGNED_OUT' || !session) {
        setCourses([])
        setCoursesLoaded(false)
        setLoadingCourses(false)
      }
      
      if (event === 'TOKEN_REFRESHED') {
        console.log('Token refrescado exitosamente')
      }
      
      if (event === 'SIGNED_IN') {
        console.log('Usuario autenticado:', session?.user?.email)
      }
    })

    return () => {
      clearTimeout(loadingTimeout)
      subscription.unsubscribe()
    }
  }, [])

  // Cargar cursos automáticamente cuando el usuario se conecte (solo una vez)
  useEffect(() => {
    if (session && isConnected && !coursesLoaded && !loadingCourses) {
      loadCourses()
    }
  }, [session, isConnected, coursesLoaded, loadingCourses])

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: [
          'openid',
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/userinfo.profile',
          'https://www.googleapis.com/auth/classroom.courses.readonly',
          'https://www.googleapis.com/auth/classroom.rosters.readonly',
          'https://www.googleapis.com/auth/classroom.coursework.me.readonly',
          'https://www.googleapis.com/auth/classroom.student-submissions.me.readonly',
          'https://www.googleapis.com/auth/classroom.courseworkmaterials.readonly'
        ].join(' ')
      }
    })
    
    if (error) {
      console.error('Error al iniciar sesión:', error)
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error al cerrar sesión:', error)
    }
  }

  // Función para cargar cursos automáticamente (solo donde soy estudiante)
  const loadCourses = async () => {
    if (!session || coursesLoaded) return
    
    setLoadingCourses(true)
    try {
      const response = await fetch('/api/classroom/courses-student-only')
      const data = await response.json()
      
      if (data.success) {
        setCourses(data.data.courses)
        setCoursesLoaded(true) // Marcar como cargado para evitar recargas
        console.log(`📚 Cursos cargados: ${data.data.courses.length}`)
      } else {
        console.error('Error cargando cursos:', data.error)
        
        // Si el error es de autenticación, cerrar sesión automáticamente
        if (response.status === 401) {
          console.warn('Sesión expirada, cerrando sesión automáticamente...')
          await signOut()
        }
      }
    } catch (error: any) {
      console.error('Error de red al cargar cursos:', error)
      
      // Si hay error de red y parece ser de autenticación, manejar apropiadamente
      if (error.message?.includes('fetch') || error.message?.includes('network')) {
        console.warn('Posible problema de conectividad o autenticación')
      }
    } finally {
      setLoadingCourses(false)
    }
  }


  // Mostrar loading solo si realmente está cargando por mucho tiempo
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        {/* Contenido de loading */}
        <main className="pt-4">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="text-center">
                <div className="flex items-center justify-center space-x-2 mb-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="text-lg text-gray-600">Conectando con Google Classroom...</span>
                </div>
                <div className="animate-pulse">
                  <div className="h-8 bg-gray-200 rounded w-1/3 mx-auto mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto"></div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 mx-4">
          {/* Logo y título */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <BookMarked className="w-8 h-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">Classroom Plus</h1>
            </div>
            <p className="text-gray-600">
              Gestiona tus tareas de Google Classroom de manera inteligente
            </p>
          </div>
          
          {/* Botón de login */}
          <Button
            onClick={signInWithGoogle}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors text-base font-medium"
          >
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Iniciar sesión con Google
          </Button>
          
          {/* Información adicional */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Necesitas una cuenta de Google para acceder a tus cursos de Classroom
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Helper function para obtener datos del avatar
  const getAvatarData = () => {
    const originalAvatarSrc = session.user?.user_metadata?.picture || 
                             session.user?.user_metadata?.avatar_url ||
                             session.user?.identities?.[0]?.identity_data?.picture ||
                             session.user?.identities?.[0]?.identity_data?.avatar_url;
    
    const avatarSrc = originalAvatarSrc ? 
      `/api/image-proxy?url=${encodeURIComponent(originalAvatarSrc)}` : 
      null;
    
    const userName = session.user?.user_metadata?.full_name || 
                    session.user?.user_metadata?.name ||
                    session.user?.email || 'Usuario';
    
    const initials = userName
      .split(' ')
      .map((part: string) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    return { avatarSrc, userName, initials };
  };

  const { avatarSrc, userName, initials } = getAvatarData();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Contenido principal con espaciado para header fijo */}
      <main className="pt-4">
        <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* User Profile Section */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <Avatar className="w-16 h-16">
                    {avatarSrc && (
                      <AvatarImage src={avatarSrc} alt={userName} />
                    )}
                    <AvatarFallback className="bg-blue-100 text-blue-600 text-lg font-medium">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{userName}</h2>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Progress Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    Progreso General
                    {loadingAssignments && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    )}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={forceRefresh}
                    disabled={loadingAssignments}
                    className="text-xs"
                    title="Forzar actualización desde Google Classroom"
                  >
                    {loadingAssignments ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1"></div>
                        Cargando...
                      </>
                    ) : (
                      <>🔄 Actualizar</>
                    )}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Rendimiento Académico</span>
                    <span className="text-sm font-bold">
                      {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
                    </span>
                  </div>
                  <Progress 
                    value={stats.total > 0 ? (stats.completed / stats.total) * 100 : 0} 
                    className="h-2" 
                  />
                </div>

                <div className="grid grid-cols-3 gap-6 pt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
                    <div className="text-sm text-gray-600">Tareas Completadas</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                    <div className="text-sm text-gray-600">Pendientes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{stats.late}</div>
                    <div className="text-sm text-gray-600">Atrasadas</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Mis Clases como Estudiante */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5" />
                  Mis Clases como Estudiante
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingCourses ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
                    <span className="text-gray-600">Cargando clases...</span>
                  </div>
                ) : courses.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {courses.map((course) => (
                      <div key={course.id} className="p-4 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-semibold">
                              {course.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900 line-clamp-1">
                                {course.name}
                              </h3>
                              {course.section && (
                                <p className="text-sm text-gray-600">
                                  {course.section}
                                </p>
                              )}
                            </div>
                          </div>
                          <Badge 
                            variant="outline" 
                            className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                          >
                            Estudiante
                          </Badge>
                        </div>
                        
                        <div className="flex justify-end mt-3">
                          {course.alternateLink && (
                            <a
                              href={course.alternateLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              Ver en Classroom →
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <GraduationCap className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600 mb-2">No estás inscrito como estudiante en ninguna clase</p>
                    <p className="text-sm text-gray-500">
                      Solo se muestran las clases donde eres estudiante, no profesor
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Tasks */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Tareas Próximas
                  <div className="flex items-center gap-2">
                    {assignmentsError && (
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => window.location.href = '/tareas'}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Ver todas →
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingAssignments ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
                    <span className="text-gray-600">Cargando tareas...</span>
                  </div>
                ) : assignmentsError ? (
                  <div className="text-center py-8">
                    <AlertTriangle className="w-8 h-8 text-red-300 mx-auto mb-3" />
                    <p className="text-red-600 mb-2">Error al cargar tareas</p>
                    <p className="text-sm text-gray-500">{assignmentsError}</p>
                  </div>
                ) : upcomingAssignments.length > 0 ? (
                  upcomingAssignments.slice(0, 6).map((assignment) => (
                    <div key={assignment.id} className="flex items-center justify-between p-3 rounded-lg border hover:border-blue-300 hover:bg-gray-50 transition-all">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {assignment.isLate ? (
                          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                        ) : assignment.state === 'TURNED_IN' ? (
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        ) : (
                          <Clock className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{assignment.title}</h4>
                          <p className="text-sm text-gray-500 truncate">
                            {assignment.courseName}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-sm text-right">
                          <div className={`font-medium ${assignment.isLate ? 'text-red-600' : 'text-gray-700'}`}>
                            {assignmentUtils.formatDueDate(assignment.dueDate)}
                          </div>
                          {assignment.maxPoints && (
                            <div className="text-xs text-gray-500">
                              {assignment.assignedGrade || '--'}/{assignment.maxPoints}
                            </div>
                          )}
                        </div>
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
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-3" />
                    <p className="text-gray-600 mb-2">¡Genial! No tienes tareas próximas</p>
                    <p className="text-sm text-gray-500">
                      Todas tus tareas están al día
                    </p>
                  </div>
                )}

              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            {/* Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notificaciones
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(() => {
                  // Combinar TODAS las notificaciones y ordenar SOLO por fecha de creación más reciente
                  const allNotifications = [
                    ...lateAssignments.map(assignment => ({ ...assignment, type: 'late' })),
                    ...upcomingAssignments.map(assignment => ({ ...assignment, type: 'upcoming' }))
                  ]
                  .sort((a, b) => {
                    // SOLO ordenar por fecha de creación más reciente (sin prioridades)
                    return new Date(b.creationTime || 0).getTime() - new Date(a.creationTime || 0).getTime()
                  })
                  .slice(0, 4) // Mostrar máximo 4 notificaciones

                  return allNotifications.map((assignment) => {
                    const isLate = assignment.type === 'late'
                    const bgColor = isLate ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
                    const textColor = isLate ? 'text-red-800' : 'text-yellow-800'
                    const subtextColor = isLate ? 'text-red-700' : 'text-yellow-700'
                    const iconColor = isLate ? 'text-red-600' : 'text-yellow-600'
                    const Icon = isLate ? AlertTriangle : Clock

                    return (
                      <div key={`${assignment.type}-${assignment.id}`} className={`flex items-start gap-3 p-3 rounded-lg ${bgColor}`}>
                        <Icon className={`w-4 h-4 ${iconColor} mt-0.5`} />
                        <div className="flex-1">
                          <h4 className={`font-medium ${textColor} line-clamp-1`}>{assignment.title}</h4>
                          <p className={`text-sm ${subtextColor}`}>
                            {assignment.courseName} - {assignmentUtils.formatDueDate(assignment.dueDate)}
                          </p>
                        </div>
                      </div>
                    )
                  })
                })()}

                {/* Mensaje cuando no hay notificaciones */}
                {lateAssignments.length === 0 && upcomingAssignments.length === 0 && !loadingAssignments && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-green-800">Todo al día</h4>
                      <p className="text-sm text-green-700">No tienes tareas urgentes pendientes</p>
                    </div>
                  </div>
                )}

                {/* Botón para ver todas */}
                {(lateAssignments.length > 0 || upcomingAssignments.length > 0) && (
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-blue-600 hover:text-blue-800"
                    onClick={() => window.location.href = '/tareas'}
                  >
                    Ver todas
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Notification Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Configuración de Notificaciones</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    <span className="text-sm">Email</span>
                  </div>
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                    Activado
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    <span className="text-sm">WhatsApp</span>
                  </div>
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                    Activado
                  </Badge>
                </div>

                <Button variant="outline" className="w-full">
                  Configurar
                </Button>
              </CardContent>
            </Card>

          </div>
        </div>
        </div>
      </main>
    </div>
  )
}

