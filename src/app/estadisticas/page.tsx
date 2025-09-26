'use client'

export default function EstadisticasPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="pt-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">📊 Estadísticas</h2>
          <p className="text-gray-600 mb-6">
            Análisis detallado de tu rendimiento académico próximamente disponible.
          </p>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 text-sm">
              📈 Esta sección incluirá gráficos de progreso, estadísticas de entrega, y análisis de rendimiento por materia.
            </p>
          </div>
        </div>
        </div>
      </main>
    </div>
  )
}
