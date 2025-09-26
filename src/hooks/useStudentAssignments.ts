import { useState, useEffect } from 'react'
import { createSupabaseClient } from '@/lib/supabase'

export interface StudentAssignment {
  id: string
  courseId: string
  courseName: string
  title: string
  description?: string
  dueDate?: string
  creationTime: string
  state: 'NEW' | 'CREATED' | 'TURNED_IN' | 'RETURNED' | 'RECLAIMED_BY_STUDENT'
  assignedGrade?: number
  maxPoints?: number
  alternateLink?: string
  workType: 'ASSIGNMENT' | 'SHORT_ANSWER_QUESTION' | 'MULTIPLE_CHOICE_QUESTION'
  materials?: any[]
  isLate: boolean
  isPending: boolean
}

export interface AssignmentStats {
  total: number
  pending: number
  completed: number
  late: number
}

interface UseStudentAssignmentsReturn {
  assignments: StudentAssignment[]
  stats: AssignmentStats
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  forceRefresh: () => Promise<void>
  
  // Funciones de filtrado
  pendingAssignments: StudentAssignment[]
  completedAssignments: StudentAssignment[]
  lateAssignments: StudentAssignment[]
  upcomingAssignments: StudentAssignment[]
}

// Cache global para evitar peticiones repetidas
const CACHE_KEY = 'student_assignments_cache'
const CACHE_DURATION = 10 * 60 * 1000 // 10 minutos en milisegundos (más tiempo)

// Control global de peticiones para evitar duplicadas
let isCurrentlyFetching = false
let lastGlobalFetch = 0

interface CacheData {
  assignments: StudentAssignment[]
  stats: AssignmentStats
  timestamp: number
}

// Función para obtener datos del cache
const getCachedData = (): CacheData | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) return null
    
    const data: CacheData = JSON.parse(cached)
    const now = Date.now()
    
    // Verificar si el cache ha expirado
    if (now - data.timestamp > CACHE_DURATION) {
      localStorage.removeItem(CACHE_KEY)
      return null
    }
    
    return data
  } catch (error) {
    console.warn('Error leyendo cache:', error)
    return null
  }
}

// Función para guardar datos en cache
const setCachedData = (assignments: StudentAssignment[], stats: AssignmentStats) => {
  try {
    const cacheData: CacheData = {
      assignments,
      stats,
      timestamp: Date.now()
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData))
  } catch (error) {
    console.warn('Error guardando en cache:', error)
  }
}

/**
 * Hook para obtener y gestionar las tareas del estudiante
 */
export function useStudentAssignments(): UseStudentAssignmentsReturn {
  const [assignments, setAssignments] = useState<StudentAssignment[]>([])
  const [stats, setStats] = useState<AssignmentStats>({
    total: 0,
    pending: 0,
    completed: 0,
    late: 0
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [session, setSession] = useState<any>(null)
  const [lastFetch, setLastFetch] = useState<number>(0)
  
  const supabase = createSupabaseClient()

  const fetchAssignments = async (forceRefresh = false) => {
    if (!session) return

    const now = Date.now()
    
    // CONTROL GLOBAL: Evitar peticiones si ya hay una en curso
    if (isCurrentlyFetching && !forceRefresh) {
      console.log('🔒 Petición ya en curso, esperando...')
      return
    }
    
    // CONTROL TEMPORAL: Verificar si ya hicimos una petición reciente (últimos 2 minutos)
    if (!forceRefresh && now - lastGlobalFetch < 120000) {
      console.log('⏭️ Evitando petición duplicada (última hace menos de 2 minutos)')
      return
    }

    // CACHE: Intentar usar cache primero (solo si no es refresh forzado)
    if (!forceRefresh) {
      const cachedData = getCachedData()
      if (cachedData) {
        console.log('📦 Usando datos del cache (válido por 10 minutos)')
        setAssignments(cachedData.assignments)
        setStats(cachedData.stats)
        setLastFetch(now)
        return
      }
    }

    // Marcar que estamos haciendo una petición
    isCurrentlyFetching = true
    setLoading(true)
    setError(null)

    try {
      console.log('🔄 Obteniendo tareas desde la API...')
      const response = await fetch('/api/classroom/student-assignments-definitive')
      const data = await response.json()

      if (data.success) {
        setAssignments(data.data.assignments)
        setStats(data.data.stats)
        setLastFetch(now)
        lastGlobalFetch = now
        
        // Guardar en cache
        setCachedData(data.data.assignments, data.data.stats)
        
        console.log(`📚 Tareas cargadas desde API: ${data.data.assignments.length} (Cache actualizado)`)
      } else {
        setError(data.error || 'Error al obtener las tareas')
        console.error('Error cargando tareas:', data.error)
      }
    } catch (err: any) {
      setError('Error de conexión')
      console.error('Error fetching assignments:', err)
    } finally {
      setLoading(false)
      isCurrentlyFetching = false // Liberar el lock
    }
  }

  useEffect(() => {
    // Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    // Escuchar cambios en la autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Cargar cache inicial al montar el componente
  useEffect(() => {
    const cachedData = getCachedData()
    if (cachedData) {
      console.log('📦 Cargando datos del cache al inicializar')
      setAssignments(cachedData.assignments)
      setStats(cachedData.stats)
    }
  }, [])

  useEffect(() => {
    if (session) {
      // Debounce para evitar múltiples llamadas cuando cambia la sesión
      const timeoutId = setTimeout(() => {
        fetchAssignments()
      }, 500) // Esperar 500ms antes de hacer la petición

      return () => clearTimeout(timeoutId)
    } else {
      // Limpiar datos cuando no hay sesión
      setAssignments([])
      setStats({ total: 0, pending: 0, completed: 0, late: 0 })
      setLastFetch(0)
      lastGlobalFetch = 0
      isCurrentlyFetching = false
      // Limpiar cache también
      localStorage.removeItem(CACHE_KEY)
    }
  }, [session])

  // Funciones de filtrado
  const pendingAssignments = assignments.filter(a => a.isPending)
  const completedAssignments = assignments.filter(a => 
    a.state === 'TURNED_IN' || a.state === 'RETURNED'
  )
  const lateAssignments = assignments.filter(a => a.isLate)
  
  // Tareas próximas: todas las pendientes que NO están vencidas ni entregadas
  const upcomingAssignments = assignments.filter(a => {
    // Debe estar pendiente (no entregada)
    if (!a.isPending) return false
    
    // Si no tiene fecha límite, incluirla (tareas sin fecha son válidas)
    if (!a.dueDate) return true
    
    const dueDate = new Date(a.dueDate)
    const now = new Date()
    
    // NO debe estar vencida (fecha límite debe ser en el futuro)
    return dueDate > now
  })

  return {
    assignments,
    stats,
    loading,
    error,
    refetch: () => fetchAssignments(false), // Refetch normal (con cache)
    forceRefresh: () => fetchAssignments(true), // Refetch forzado (sin cache)
    pendingAssignments,
    completedAssignments,
    lateAssignments,
    upcomingAssignments
  }
}

/**
 * Hook para obtener las tareas de un curso específico
 */
export function useCourseAssignments(courseId: string | null) {
  const { assignments, loading, error, refetch } = useStudentAssignments()
  
  const courseAssignments = courseId 
    ? assignments.filter(a => a.courseId === courseId)
    : []

  return {
    assignments: courseAssignments,
    loading,
    error,
    refetch
  }
}

/**
 * Utilidades para formatear fechas y estados
 */
export const assignmentUtils = {
  /**
   * Formatea la fecha de vencimiento
   */
  formatDueDate: (dueDate?: string): string => {
    if (!dueDate) return 'Sin fecha límite'
    
    const date = new Date(dueDate)
    const now = new Date()
    const diffTime = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return 'Vencida'
    if (diffDays === 0) return 'Vence hoy'
    if (diffDays === 1) return 'Vence mañana'
    if (diffDays <= 7) return `Vence en ${diffDays} días`
    
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  },

  /**
   * Obtiene el color del estado
   */
  getStateColor: (assignment: StudentAssignment): string => {
    if (assignment.isLate) return 'text-red-600'
    if (assignment.state === 'TURNED_IN') return 'text-green-600'
    if (assignment.state === 'RETURNED') return 'text-blue-600'
    if (assignment.isPending) return 'text-yellow-600'
    return 'text-gray-600'
  },

  /**
   * Obtiene el texto del estado
   */
  getStateText: (assignment: StudentAssignment): string => {
    if (assignment.isLate) return 'Atrasada'
    if (assignment.state === 'TURNED_IN') return 'Entregada'
    if (assignment.state === 'RETURNED') return 'Calificada'
    if (assignment.isPending) return 'Pendiente'
    return 'Sin estado'
  },

  /**
   * Calcula la prioridad de una tarea (para ordenamiento)
   */
  getPriority: (assignment: StudentAssignment): number => {
    if (assignment.isLate) return 1000 // Máxima prioridad
    if (!assignment.dueDate) return 100 // Sin fecha, prioridad media
    
    const now = new Date()
    const dueDate = new Date(assignment.dueDate)
    const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays <= 0) return 999 // Vencidas
    if (diffDays <= 1) return 900 // Vence hoy/mañana
    if (diffDays <= 3) return 800 // Próximos 3 días
    if (diffDays <= 7) return 700 // Próxima semana
    
    return Math.max(0, 500 - diffDays) // Menos prioridad mientras más lejos
  }
}
