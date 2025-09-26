'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  GraduationCap, 
  Users, 
  Building2,
  CheckCircle
} from 'lucide-react'

export type UserRole = 'student' | 'teacher' | 'coordinator'

interface RoleSelectionDialogProps {
  isOpen: boolean
  onRoleSelect: (role: UserRole) => void
  userName?: string
}

export default function RoleSelectionDialog({ isOpen, onRoleSelect, userName }: RoleSelectionDialogProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)

  if (!isOpen) return null

  const roles = [
    {
      id: 'student' as UserRole,
      title: 'Estudiante',
      description: 'Soy estudiante y quiero ver mis tareas, progreso y calificaciones',
      icon: GraduationCap,
      color: 'bg-orange-100 text-orange-800 border-orange-200',
      iconColor: 'text-orange-600'
    },
    {
      id: 'teacher' as UserRole,
      title: 'Profesor',
      description: 'Soy profesor y quiero gestionar mis clases y estudiantes',
      icon: Users,
      color: 'bg-green-100 text-green-800 border-green-200',
      iconColor: 'text-green-600'
    },
    {
      id: 'coordinator' as UserRole,
      title: 'Coordinador',
      description: 'Soy coordinador y quiero ver métricas generales de la institución',
      icon: Building2,
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      iconColor: 'text-blue-600'
    }
  ]

  const handleConfirm = () => {
    if (selectedRole) {
      onRoleSelect(selectedRole)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">
            ¡Bienvenido{userName ? `, ${userName}` : ''}!
          </CardTitle>
          <p className="text-gray-600 mt-2">
            Para personalizar tu experiencia, por favor selecciona tu rol en la institución
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {roles.map((role) => {
              const Icon = role.icon
              const isSelected = selectedRole === role.id
              
              return (
                <div
                  key={role.id}
                  onClick={() => setSelectedRole(role.id)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                    isSelected 
                      ? `${role.color} border-current` 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-center">
                    <div className={`w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center ${
                      isSelected ? role.color : 'bg-gray-100'
                    }`}>
                      <Icon className={`w-6 h-6 ${
                        isSelected ? role.iconColor : 'text-gray-600'
                      }`} />
                    </div>
                    
                    <h3 className={`font-semibold text-lg mb-2 ${
                      isSelected ? 'text-current' : 'text-gray-900'
                    }`}>
                      {role.title}
                    </h3>
                    
                    <p className={`text-sm ${
                      isSelected ? 'text-current/80' : 'text-gray-600'
                    }`}>
                      {role.description}
                    </p>
                    
                    {isSelected && (
                      <div className="mt-3">
                        <Badge className={role.color}>
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Seleccionado
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          
          <div className="flex justify-center pt-4">
            <Button
              onClick={handleConfirm}
              disabled={!selectedRole}
              className="px-8 py-2"
            >
              Confirmar Rol
            </Button>
          </div>
          
          <p className="text-xs text-gray-500 text-center">
            Podrás cambiar este rol más tarde en la configuración de tu perfil
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
