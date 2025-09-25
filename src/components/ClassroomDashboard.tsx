'use client'

import { useEffect, useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase'
import { useClassroomCourses, useCourseDetails } from '@/hooks/useClassroom'
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

  useEffect(() => {
    // Timeout de seguridad para evitar loading infinito
    const loadingTimeout = setTimeout(() => {
      setLoading(false)
    }, 3000) // Máximo 3 segundos de loading

    // Reducir el tiempo de loading inicial
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setSession(session)
        setIsConnected(!!session)
      } catch (error) {
        console.error('Error al obtener sesión:', error)
      } finally {
        clearTimeout(loadingTimeout)
        setLoading(false)
      }
    }

    initializeAuth()

    // Escuchar cambios en la autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setIsConnected(!!session)
      
      // Si se desconecta, limpiar el cache de cursos
      if (!session) {
        setCourses([])
        setCoursesLoaded(false)
        setLoadingCourses(false)
      }
      // No cambiar loading aquí para evitar parpadeos
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
          'https://www.googleapis.com/auth/classroom.student-submissions.students.readonly'
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

  // Función para cargar cursos automáticamente
  const loadCourses = async () => {
    if (!session || coursesLoaded) return
    
    setLoadingCourses(true)
    try {
      const response = await fetch('/api/classroom/courses-basic')
      const data = await response.json()
      
      if (data.success) {
        setCourses(data.data.courses)
        setCoursesLoaded(true) // Marcar como cargado para evitar recargas
        console.log(`📚 Cursos cargados: ${data.data.courses.length}`)
      } else {
        console.error('Error cargando cursos:', data.error)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoadingCourses(false)
    }
  }


  // Mostrar loading solo si realmente está cargando por mucho tiempo
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header simplificado durante loading */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <h1 className="text-2xl font-bold text-gray-900">Classroom Plus</h1>
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm text-gray-600">Conectando...</span>
              </div>
            </div>
          </div>
        </header>
        
        {/* Contenido de loading más sutil */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-1/3 mx-auto mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-center mb-6">Classroom Plus</h1>
          <p className="text-gray-600 text-center mb-6">
            Inicia sesión con Google para acceder a tus cursos de Classroom
          </p>
          <button
            onClick={signInWithGoogle}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Iniciar sesión con Google
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Classroom Plus</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Hola, {session.user?.user_metadata?.full_name || session.user?.email}
              </span>
              <button
                onClick={signOut}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Principal */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Dashboard de Google Classroom
            </h2>
            <div className="flex items-center justify-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className={`text-sm font-medium ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                {isConnected ? 'Conectado a Google Classroom' : 'Desconectado'}
              </span>
            </div>
          </div>

          {/* Lista de Cursos */}
          {loadingCourses ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando tus cursos...</p>
            </div>
          ) : courses.length > 0 ? (
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-6">
                Tus Cursos ({courses.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((course, index) => (
                  <div key={course.id} className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="text-2xl">📚</div>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        {course.isOwner ? 'Propietario' : 'Miembro'}
                      </span>
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                      {course.name}
                    </h4>
                    {course.section && (
                      <p className="text-sm text-gray-600 mb-2">
                        Sección: {course.section}
                      </p>
                    )}
                    {course.room && (
                      <p className="text-sm text-gray-600 mb-2">
                        Aula: {course.room}
                      </p>
                    )}
                    <div className="mt-4 pt-4 border-t border-blue-200">
                      <p className="text-xs text-gray-500">
                        Creado: {course.createdDate}
                      </p>
                      {course.alternateLink && (
                        <a
                          href={course.alternateLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline mt-1 block"
                        >
                          Ver en Classroom →
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : isConnected ? (
            <div className="text-center py-16">
              <div className="max-w-md mx-auto">
                <div className="bg-yellow-50 rounded-lg p-8">
                  <div className="text-6xl mb-4">⚠️</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    No se encontraron cursos
                  </h3>
                  <p className="text-gray-600">
                    Estás conectado a Google Classroom pero no tienes cursos visibles. 
                    Puede que necesites crear un curso o ser agregado a uno existente.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="max-w-md mx-auto">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-8">
                  <div className="text-6xl mb-4">🔐</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Inicia sesión para continuar
                  </h3>
                  <p className="text-gray-600">
                    Conecta tu cuenta de Google para acceder a tus cursos de Classroom.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

