'use client'

import Header from '@/components/shared/Header'

export default function CalendarioPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="pt-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">📅 Calendario</h2>
          <p className="text-gray-600 mb-6">
            Vista de calendario con todas tus fechas importantes próximamente disponible.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800 text-sm">
              🚧 Esta funcionalidad está en desarrollo. Pronto podrás ver todas tus tareas y eventos en un calendario interactivo.
            </p>
          </div>
        </div>
        </div>
      </main>
    </div>
  )
}
