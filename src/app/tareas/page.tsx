'use client'

import { useRouter } from 'next/navigation'
import StudentAssignments from '@/components/StudentAssignments'
import Header from '@/components/shared/Header'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function TareasPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Espaciado para compensar header fijo */}
      <main className="pt-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Botón de volver */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al Dashboard
          </Button>
        </div>

        {/* Contenedor con altura mínima para evitar saltos */}
        <div className="min-h-[600px]">
          <StudentAssignments />
        </div>
        </div>
      </main>
    </div>
  )
}

