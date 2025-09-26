'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  Users,
  User, 
  Settings, 
  Palette, 
  LogOut,
  Home,
  BookOpen,
  FileText,
  Clock,
  Star,
  BookMarked,
  TrendingUp,
  GraduationCap,
  UserCheck,
  ArrowRightLeft
} from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase'
import { useUserRole } from '@/hooks/useUserRole'

interface HeaderProps {
  // Props opcionales para futuro uso
}

export default function Header(props: HeaderProps = {}) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createSupabaseClient()
  const { userRole, setUserRole } = useUserRole()
  const [session, setSession] = useState<any>(null)
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [avatarSrc, setAvatarSrc] = useState('')
  const [initials, setInitials] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const updateUserData = (session: any) => {
    if (session?.user) {
      const name = session.user.user_metadata?.full_name || session.user.user_metadata?.name || 'Usuario'
      const email = session.user.email || ''
      const avatar = session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || ''
      
      setUserName(name)
      setUserEmail(email)
      setAvatarSrc(avatar)
      setInitials(name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2))
    }
  }

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      updateUserData(session)
    }

    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      updateUserData(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Determinar página actual desde la ruta
  const getCurrentPage = (): 'dashboard' | 'tareas' | 'progreso' | 'perfil' | 'profesor-dashboard' | 'profesor-clases' | 'profesor-estudiantes' | 'profesor-tareas' => {
    switch (pathname) {
      case '/tareas':
        return 'tareas'
      case '/progreso':
        return 'progreso'
      case '/perfil':
        return 'perfil'
      case '/profesor/dashboard':
        return 'profesor-dashboard'
      case '/profesor/clases':
        return 'profesor-clases'
      case '/profesor/estudiantes':
        return 'profesor-estudiantes'
      case '/profesor/tareas':
        return 'profesor-tareas'
      default:
        return 'dashboard'
    }
  }

  const currentPage = getCurrentPage()

  // Efecto para reaccionar a cambios de ruta
  useEffect(() => {
    console.log('📍 Ruta actual:', pathname, '| Página detectada:', currentPage)
  }, [pathname, currentPage])

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error al cerrar sesión:', error)
    }
    router.push('/')
  }

  const handleRoleChange = (newRole: 'student' | 'teacher') => {
    setUserRole(newRole)
    // Redirigir a la página principal del rol seleccionado
    if (newRole === 'teacher') {
      router.push('/profesor/dashboard')
    } else {
      router.push('/')
    }
  }

  // Navegación para estudiantes
  const studentNavigationItems = [
    {
      key: 'dashboard',
      label: 'Dashboard',
      icon: Home,
      href: '/',
      active: currentPage === 'dashboard'
    },
    {
      key: 'tareas',
      label: 'Mis Tareas',
      icon: FileText,
      href: '/tareas',
      active: currentPage === 'tareas'
    },
    {
      key: 'progreso',
      label: 'Seguimiento',
      icon: TrendingUp,
      href: '/progreso',
      active: currentPage === 'progreso'
    }
  ]

  // Navegación para profesores
  const teacherNavigationItems = [
    {
      key: 'profesor-dashboard',
      label: 'Dashboard',
      icon: Home,
      href: '/profesor/dashboard',
      active: currentPage === 'profesor-dashboard'
    },
    {
      key: 'profesor-clases',
      label: 'Mis Clases',
      icon: BookOpen,
      href: '/profesor/clases',
      active: currentPage === 'profesor-clases'
    },
    {
      key: 'profesor-estudiantes',
      label: 'Estudiantes',
      icon: Users,
      href: '/profesor/estudiantes',
      active: currentPage === 'profesor-estudiantes'
    },
    {
      key: 'profesor-tareas',
      label: 'Tareas',
      icon: FileText,
      href: '/profesor/tareas',
      active: currentPage === 'profesor-tareas'
    }
  ]

  // Seleccionar navegación basada en el rol
  const navigationItems = userRole === 'teacher' ? teacherNavigationItems : studentNavigationItems


  // Solo mostrar header cuando hay sesión activa
  if (!session) {
    return null
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 h-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
        <div className="flex justify-between items-center h-full">
          {/* Lado izquierdo - Logo + Navegación */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center gap-2">
              <BookMarked className="w-6 h-6 text-blue-600" />
              <h1 className="text-xl font-semibold text-gray-900">
                Semillero Digital Dashboard
              </h1>
            </div>

            {/* Navegación principal */}
            <nav className="hidden md:flex items-center space-x-1">
              {navigationItems.map((item) => {
                const Icon = item.icon
                return (
                  <Button
                    key={item.key}
                    variant={item.active ? "default" : "ghost"}
                    onClick={() => router.push(item.href)}
                    className={`flex items-center gap-2 ${
                      item.active 
                        ? "bg-blue-100 text-blue-700 hover:bg-blue-200" 
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Button>
                )
              })}
            </nav>
          </div>

          {/* Lado derecho - Usuario */}
          <div className="flex items-center space-x-3">

            {/* Menú de usuario */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10 border-2 border-blue-200 hover:border-blue-400 transition-colors">
                    {avatarSrc && (
                      <AvatarImage src={avatarSrc} alt={userName} />
                    )}
                    <AvatarFallback className="bg-blue-100 text-blue-600 font-medium">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{userName}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {userEmail}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {/* Selector de Rol */}
                <div className="px-2 py-1">
                  <p className="text-xs font-medium text-gray-500 mb-2">Cambiar Vista</p>
                  <div className="flex gap-1">
                    <Button
                      variant={userRole === 'student' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleRoleChange('student')}
                      className="flex-1 h-8 text-xs"
                    >
                      <GraduationCap className="w-3 h-3 mr-1" />
                      Estudiante
                    </Button>
                    <Button
                      variant={userRole === 'teacher' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleRoleChange('teacher')}
                      className="flex-1 h-8 text-xs"
                    >
                      <UserCheck className="w-3 h-3 mr-1" />
                      Profesor
                    </Button>
                  </div>
                </div>
                <DropdownMenuSeparator />
                
                {/* Navegación móvil */}
                <div className="md:hidden">
                  {navigationItems.map((item) => {
                    const Icon = item.icon
                    return (
                      <DropdownMenuItem 
                        key={item.key}
                        onClick={() => router.push(item.href)}
                        className="cursor-pointer"
                      >
                        <Icon className="w-4 h-4 mr-2" />
                        <span>{item.label}</span>
                      </DropdownMenuItem>
                    )
                  })}
                  <DropdownMenuSeparator />
                </div>

                <DropdownMenuItem className="cursor-pointer">
                  <User className="w-4 h-4 mr-2" />
                  <span>Mi Perfil</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <Settings className="w-4 h-4 mr-2" />
                  <span>Configuración</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <Star className="w-4 h-4 mr-2" />
                  <span>Favoritos</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <Clock className="w-4 h-4 mr-2" />
                  <span>Historial</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <Palette className="w-4 h-4 mr-2" />
                  <span>Tema</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={signOut}
                  className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  <span>Cerrar sesión</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}
