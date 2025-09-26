import { useState, useEffect } from 'react'
import { createSupabaseClient } from '@/lib/supabase'

export type UserRole = 'student' | 'teacher' | 'coordinator'

interface UseUserRoleReturn {
  userRole: UserRole | null
  setUserRole: (role: UserRole) => void
  clearUserRole: () => void
  loading: boolean
}

const ROLE_STORAGE_KEY = 'user_role'

export function useUserRole(): UseUserRoleReturn {
  const [userRole, setUserRoleState] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createSupabaseClient()

  // Cargar rol guardado al inicializar
  useEffect(() => {
    const loadSavedRole = () => {
      try {
        const savedRole = localStorage.getItem(ROLE_STORAGE_KEY)
        if (savedRole && ['student', 'teacher', 'coordinator'].includes(savedRole)) {
          setUserRoleState(savedRole as UserRole)
        }
      } catch (error) {
        console.warn('Error cargando rol guardado:', error)
      } finally {
        setLoading(false)
      }
    }

    loadSavedRole()
  }, [])

  // Función para establecer el rol
  const setUserRole = (role: UserRole) => {
    try {
      localStorage.setItem(ROLE_STORAGE_KEY, role)
      setUserRoleState(role)
    } catch (error) {
      console.error('Error guardando rol:', error)
    }
  }

  // Función para limpiar el rol
  const clearUserRole = () => {
    try {
      localStorage.removeItem(ROLE_STORAGE_KEY)
      setUserRoleState(null)
    } catch (error) {
      console.error('Error limpiando rol:', error)
    }
  }

  // Limpiar rol cuando el usuario cierra sesión
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        clearUserRole()
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return {
    userRole,
    setUserRole,
    clearUserRole,
    loading
  }
}
