import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseApiClient } from '@/lib/supabase-api'
import { google } from 'googleapis'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseApiClient()
    
    // Usar getUser() en lugar de getSession() para mayor seguridad
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({
        success: false,
        error: 'No autorizado - Usuario no encontrado'
      }, { status: 401 })
    }

    // También obtenemos la sesión para los tokens
    const {
      data: { session },
    } = await supabase.auth.getSession()

    // Obtener información de la sesión
    const sessionInfo = {
      user: user,
      provider_token: session?.provider_token ? 'Presente' : 'No encontrado',
      provider_refresh_token: session?.provider_refresh_token ? 'Presente' : 'No encontrado',
      expires_at: session?.expires_at
    }

    // Intentar conectar con Google API (solo perfil básico primero)
    let googleProfile = null
    if (session?.provider_token) {
      try {
        const auth = new google.auth.OAuth2()
        auth.setCredentials({ access_token: session.provider_token })
        
        const oauth2 = google.oauth2({
          version: 'v2',
          auth: auth
        })
        
        const profileResponse = await oauth2.userinfo.get()
        googleProfile = profileResponse.data
      } catch (error) {
        console.error('Error obteniendo perfil de Google:', error)
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        sessionInfo,
        googleProfile,
        message: 'Conexión básica con Google funcionando'
      }
    })
  } catch (error) {
    console.error('Error en test de conexión:', error)
    return NextResponse.json({
      success: false,
      error: 'Error en el servidor: ' + error.message
    }, { status: 500 })
  }
}
