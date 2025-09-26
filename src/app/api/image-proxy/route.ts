import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const imageUrl = searchParams.get('url')
    
    if (!imageUrl) {
      return new NextResponse('URL de imagen requerida', { status: 400 })
    }

    // Validar que sea una URL de Google
    const allowedDomains = [
      'lh3.googleusercontent.com',
      'lh4.googleusercontent.com',
      'lh5.googleusercontent.com',
      'lh6.googleusercontent.com',
      'googleusercontent.com'
    ]

    const urlObj = new URL(imageUrl)
    const isAllowed = allowedDomains.some(domain => 
      urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain)
    )

    if (!isAllowed) {
      return new NextResponse('Dominio no permitido', { status: 403 })
    }

    // Hacer fetch de la imagen
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })

    if (!response.ok) {
      return new NextResponse('Error al obtener imagen', { status: response.status })
    }

    const imageBuffer = await response.arrayBuffer()
    const contentType = response.headers.get('content-type') || 'image/jpeg'

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600', // Cache por 1 hora
        'Access-Control-Allow-Origin': '*',
      }
    })

  } catch (error) {
    console.error('Error en image proxy:', error)
    return new NextResponse('Error interno del servidor', { status: 500 })
  }
}
