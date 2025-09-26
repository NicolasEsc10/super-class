'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { MessageCircle, Sparkles } from 'lucide-react'

// Declaraciones de TypeScript para Easy-Peasy
declare global {
  interface Window {
    easyPeasy?: {
      openChat: () => void
      closeChat: () => void
    }
    easyPeasyConfig?: {
      botId: string
      position: string
      theme: string
      showOnLoad: boolean
    }
  }
}

interface EasyPeasyWidgetProps {
  apiKey?: string
  widgetUrl?: string
}

export default function EasyPeasyWidget({ 
  apiKey = process.env.NEXT_PUBLIC_EASY_PEASY_API_KEY,
  widgetUrl = process.env.NEXT_PUBLIC_EASY_PEASY_WIDGET_URL 
}: EasyPeasyWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  // Extraer el ID del bot de la URL de API
  const getBotId = () => {
    if (widgetUrl && widgetUrl.includes('/bot/')) {
      return widgetUrl.split('/bot/')[1]?.split('/')[0]
    }
    return null
  }

  const botId = getBotId()

  useEffect(() => {
    // Cargar el script de Easy-Peasy.ai
    if (botId) {
      const script = document.createElement('script')
      script.innerHTML = `
        window.easyPeasyConfig = {
          botId: '${botId}',
          position: 'bottom-right',
          theme: 'light',
          showOnLoad: false
        };
      `
      document.head.appendChild(script)

      // Cargar el script principal de Easy-Peasy
      const mainScript = document.createElement('script')
      mainScript.src = 'https://cdn.easy-peasy.ai/widget.js'
      mainScript.async = true
      mainScript.onload = () => {
        setIsLoaded(true)
        console.log('Easy-Peasy widget cargado correctamente')
      }
      mainScript.onerror = () => {
        console.log('Error cargando Easy-Peasy widget')
        setIsLoaded(false)
      }
      document.head.appendChild(mainScript)

      return () => {
        // Limpiar scripts al desmontar
        const scripts = document.querySelectorAll('script[src*="easy-peasy"], script[innerHTML*="easyPeasyConfig"]')
        scripts.forEach(script => script.remove())
      }
    }
  }, [botId])

  const handleOpenWidget = () => {
    if (isLoaded && botId) {
      // Usar la API de Easy-Peasy para abrir el chat
      if (window.easyPeasy && window.easyPeasy.openChat) {
        window.easyPeasy.openChat()
      } else {
        // Fallback: abrir en nueva ventana
        window.open(`https://bots.easy-peasy.ai/bot/${botId}`, '_blank')
      }
    } else {
      // Redirigir a Easy-Peasy.ai si no está cargado
      window.open('https://easy-peasy.ai/es', '_blank')
    }
  }

  return (
    <>
      {/* Botón flotante personalizado */}
      <div className="fixed bottom-6 right-6 z-50 group">
        <Button
          onClick={handleOpenWidget}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-105"
          size="icon"
          title="Asistente IA - Easy-Peasy"
        >
          <MessageCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
        </Button>
        
        {/* Tooltip */}
        <div className="absolute bottom-16 right-0 bg-gray-900 text-white text-sm px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap pointer-events-none">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Asistente IA
          </div>
          <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      </div>

      {/* El widget de Easy-Peasy se renderizará automáticamente cuando esté cargado */}
    </>
  )
}
