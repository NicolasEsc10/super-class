import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'

// Interfaces para los datos de progreso
export interface StudentProgress {
  studentId: string
  studentName: string
  studentEmail: string
  totalAssignments: number
  completedAssignments: number
  pendingAssignments: number
  lateAssignments: number
  averageGrade?: number
  lastActivity?: string
  riskLevel: 'low' | 'medium' | 'high'
  courseProgress: CourseProgress[]
}

export interface CourseProgress {
  courseId: string
  courseName: string
  totalAssignments: number
  completedAssignments: number
  pendingAssignments: number
  lateAssignments: number
  averageGrade?: number
  completionRate: number
}

export interface TeacherMetrics {
  totalStudents: number
  totalAssignments: number
  averageCompletionRate: number
  studentsAtRisk: StudentProgress[]
  mostProblematicAssignments: ProblematicAssignment[]
  recentActivity: ActivityLog[]
}

export interface ProblematicAssignment {
  assignmentId: string
  assignmentTitle: string
  courseId: string
  courseName: string
  totalStudents: number
  submittedCount: number
  submissionRate: number
  averageGrade?: number
  dueDate?: string
}

export interface ActivityLog {
  id: string
  studentId: string
  studentName: string
  action: 'submitted' | 'late_submission' | 'missing' | 'graded'
  assignmentTitle: string
  courseName: string
  timestamp: string
}

export interface CoordinatorMetrics {
  totalCourses: number
  totalStudents: number
  totalTeachers: number
  globalCompletionRate: number
  studentsAtRisk: StudentProgress[]
  courseComparison: CourseComparison[]
  cohortMetrics: CohortMetrics[]
}

export interface CourseComparison {
  courseId: string
  courseName: string
  teacherName: string
  totalStudents: number
  completionRate: number
  averageGrade: number
  riskStudentsCount: number
}

export interface CohortMetrics {
  cohortId: string
  cohortName: string
  totalStudents: number
  completionRate: number
  averageGrade: number
  topPerformers: string[]
  strugglingStudents: string[]
}

// Estado del store
interface ProgressState {
  // Datos
  studentProgress: StudentProgress | null
  teacherMetrics: TeacherMetrics | null
  coordinatorMetrics: CoordinatorMetrics | null
  
  // Estados de carga
  loadingStudent: boolean
  loadingTeacher: boolean
  loadingCoordinator: boolean
  
  // Errores
  errorStudent: string | null
  errorTeacher: string | null
  errorCoordinator: string | null
  
  // Filtros y configuración
  selectedCourseId: string | null
  selectedTimeRange: '7d' | '30d' | '90d' | 'all'
  showOnlyAtRisk: boolean
  
  // Última actualización
  lastUpdated: {
    student?: string
    teacher?: string
    coordinator?: string
  }
}

// Acciones del store
interface ProgressActions {
  // Acciones para estudiantes
  fetchStudentProgress: () => Promise<void>
  setStudentProgress: (progress: StudentProgress) => void
  clearStudentProgress: () => void
  
  // Acciones para profesores
  fetchTeacherMetrics: () => Promise<void>
  setTeacherMetrics: (metrics: TeacherMetrics) => void
  clearTeacherMetrics: () => void
  
  // Acciones para coordinadores
  fetchCoordinatorMetrics: () => Promise<void>
  setCoordinatorMetrics: (metrics: CoordinatorMetrics) => void
  clearCoordinatorMetrics: () => void
  
  // Filtros
  setSelectedCourse: (courseId: string | null) => void
  setTimeRange: (range: '7d' | '30d' | '90d' | 'all') => void
  setShowOnlyAtRisk: (show: boolean) => void
  
  // Utilidades
  refreshAll: () => Promise<void>
  clearAll: () => void
}

type ProgressStore = ProgressState & ProgressActions

// Crear el store
export const useProgressStore = create<ProgressStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Estado inicial
        studentProgress: null,
        teacherMetrics: null,
        coordinatorMetrics: null,
        loadingStudent: false,
        loadingTeacher: false,
        loadingCoordinator: false,
        errorStudent: null,
        errorTeacher: null,
        errorCoordinator: null,
        selectedCourseId: null,
        selectedTimeRange: '30d',
        showOnlyAtRisk: false,
        lastUpdated: {},

        // Acciones para estudiantes
        fetchStudentProgress: async () => {
          const state = get()
          if (state.loadingStudent) return // Evitar llamadas duplicadas
          
          set({ loadingStudent: true, errorStudent: null })
          try {
            const response = await fetch('/api/progress/student')
            const data = await response.json()
            
            if (data.success) {
              set((state) => ({ 
                studentProgress: data.data,
                lastUpdated: { ...state.lastUpdated, student: new Date().toISOString() },
                loadingStudent: false
              }))
            } else {
              set({ errorStudent: data.error, loadingStudent: false })
            }
          } catch (error: any) {
            set({ errorStudent: 'Error al cargar progreso del estudiante', loadingStudent: false })
          }
        },

        setStudentProgress: (progress) => {
          set({ studentProgress: progress })
        },

        clearStudentProgress: () => {
          set({ studentProgress: null, errorStudent: null })
        },

        // Acciones para profesores
        fetchTeacherMetrics: async () => {
          const state = get()
          if (state.loadingTeacher) return // Evitar llamadas duplicadas
          
          set({ loadingTeacher: true, errorTeacher: null })
          try {
            const { selectedCourseId, selectedTimeRange } = state
            const params = new URLSearchParams({
              timeRange: selectedTimeRange,
              ...(selectedCourseId && { courseId: selectedCourseId })
            })
            
            const response = await fetch(`/api/progress/teacher?${params}`)
            const data = await response.json()
            
            if (data.success) {
              set((state) => ({ 
                teacherMetrics: data.data,
                lastUpdated: { ...state.lastUpdated, teacher: new Date().toISOString() },
                loadingTeacher: false
              }))
            } else {
              set({ errorTeacher: data.error, loadingTeacher: false })
            }
          } catch (error: any) {
            set({ errorTeacher: 'Error al cargar métricas del profesor', loadingTeacher: false })
          }
        },

        setTeacherMetrics: (metrics) => {
          set({ teacherMetrics: metrics })
        },

        clearTeacherMetrics: () => {
          set({ teacherMetrics: null, errorTeacher: null })
        },

        // Acciones para coordinadores
        fetchCoordinatorMetrics: async () => {
          const state = get()
          if (state.loadingCoordinator) return // Evitar llamadas duplicadas
          
          set({ loadingCoordinator: true, errorCoordinator: null })
          try {
            const { selectedTimeRange } = state
            const params = new URLSearchParams({
              timeRange: selectedTimeRange
            })
            
            const response = await fetch(`/api/progress/coordinator?${params}`)
            const data = await response.json()
            
            if (data.success) {
              set((state) => ({ 
                coordinatorMetrics: data.data,
                lastUpdated: { ...state.lastUpdated, coordinator: new Date().toISOString() },
                loadingCoordinator: false
              }))
            } else {
              set({ errorCoordinator: data.error, loadingCoordinator: false })
            }
          } catch (error: any) {
            set({ errorCoordinator: 'Error al cargar métricas del coordinador', loadingCoordinator: false })
          }
        },

        setCoordinatorMetrics: (metrics) => {
          set({ coordinatorMetrics: metrics })
        },

        clearCoordinatorMetrics: () => {
          set({ coordinatorMetrics: null, errorCoordinator: null })
        },

        // Filtros
        setSelectedCourse: (courseId) => {
          set({ selectedCourseId: courseId })
        },

        setTimeRange: (range) => {
          set({ selectedTimeRange: range })
        },

        setShowOnlyAtRisk: (show) => {
          set({ showOnlyAtRisk: show })
        },

        // Utilidades
        refreshAll: async () => {
          const promises = []
          
          if (get().studentProgress !== null) {
            promises.push(get().fetchStudentProgress())
          }
          
          if (get().teacherMetrics !== null) {
            promises.push(get().fetchTeacherMetrics())
          }
          
          if (get().coordinatorMetrics !== null) {
            promises.push(get().fetchCoordinatorMetrics())
          }
          
          await Promise.all(promises)
        },

        clearAll: () => {
          set({
            studentProgress: null,
            teacherMetrics: null,
            coordinatorMetrics: null,
            errorStudent: null,
            errorTeacher: null,
            errorCoordinator: null,
            lastUpdated: {}
          })
        }
      }),
      {
        name: 'progress-store',
        // Solo persistir configuraciones, no datos sensibles
        partialize: (state) => ({
          selectedTimeRange: state.selectedTimeRange,
          showOnlyAtRisk: state.showOnlyAtRisk
        })
      }
    ),
    {
      name: 'progress-store'
    }
  )
)

// Selectores útiles con shallow comparison para evitar re-renders
export const useStudentProgressData = () => useProgressStore(
  useShallow((state) => ({
    progress: state.studentProgress,
    loading: state.loadingStudent,
    error: state.errorStudent,
    fetch: state.fetchStudentProgress,
    clear: state.clearStudentProgress
  }))
)

// Selectores eliminados - solo se usa vista de estudiante
