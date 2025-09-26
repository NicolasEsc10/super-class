'use client'

import StudentProgressView from './StudentProgressView'

export default function ProgressDashboard() {
  // Por defecto siempre es estudiante - sin detección de roles
  const role = 'student'
  const isStudent = true
  const isTeacher = false
  const isCoordinator = false
  const isAdmin = false
  const loading = false
  const error = null
  const coursesAsStudent = 0
  const coursesAsTeacher = 0

  // Sin loading ni error - siempre muestra vista de estudiante

  // Siempre estudiante - sin funciones adicionales necesarias

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Contenido principal - siempre vista de estudiante */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <StudentProgressView />
      </div>
    </div>
  )
}
