'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { MessageCircle, Sparkles } from 'lucide-react'

interface EasyPeasySimpleWidgetProps {
  botId?: string
}

export default function EasyPeasySimpleWidget({ 
  botId = '8eab1da1-1fa3-451f-8365-f61dc7b4bf89' // Tu bot ID extraído de la URL
}: EasyPeasySimpleWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleOpenWidget = () => {
    if (isOpen) {
      // Si ya está abierto, cerrar
      setIsOpen(false)
    } else {
      // Abrir el chat
      setIsOpen(true)
    }
  }

  const botUrl = `https://bots.easy-peasy.ai/bot/${botId}`

  return (
    <>
      {/* Botón flotante */}
      <div className="fixed bottom-6 right-6 z-50 group">
        <Button
          onClick={handleOpenWidget}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-105"
          size="icon"
          title="Semillerito - Asistente IA"
        >
          <MessageCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
        </Button>
        
        {/* Tooltip */}
        <div className="absolute bottom-16 right-0 bg-gray-900 text-white text-sm px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap pointer-events-none">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Semillerito
          </div>
          <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      </div>

      {/* Chat embebido */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-40 w-96 h-[500px] bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
          <div className="h-full flex flex-col">
            {/* Header del chat */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <span className="font-semibold">Semillerito</span>
              </div>
              <Button
                onClick={() => setIsOpen(false)}
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white hover:bg-opacity-20 h-8 w-8"
              >
                ×
              </Button>
            </div>
            
            {/* Iframe del chat */}
            <div className="flex-1">
              <iframe
                src={botUrl}
                className="w-full h-full border-0"
                title="Easy-Peasy AI Chat"
                allow="microphone; camera; clipboard-write"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
