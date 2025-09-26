# 🎓 Semillero Digital Dashboard

Una plataforma educativa integral que integra Google Classroom con funcionalidades avanzadas de gestión académica, análisis de progreso estudiantil y herramientas de coordinación para instituciones educativas.

## ✨ Características Principales

### 👨‍🎓 **Vista de Estudiante**
- **Dashboard personalizado** con resumen de cursos y tareas
- **Gestión de tareas** con seguimiento de fechas de entrega
- **Seguimiento de progreso** con métricas detalladas
- **Calendario integrado** para visualizar fechas importantes
- **Notificaciones** de tareas pendientes y vencidas

### 👨‍🏫 **Vista de Profesor**
- **Dashboard de profesor** con métricas de clases
- **Gestión de cursos** y estudiantes
- **Sistema de calificaciones** integrado
- **Análisis de estudiantes en riesgo** académico
- **Seguimiento de entregas recientes**
- **Herramientas de comunicación** con estudiantes

### 👨‍💼 **Vista de Coordinador**
- **Panel de coordinación** con métricas institucionales
- **Análisis de estudiantes en riesgo** a nivel institucional
- **Vista general** del rendimiento académico
- **Herramientas de supervisión** y reportes

### 🤖 **Asistente IA Integrado**
- **EasyPeasy AI Widget** integrado en toda la plataforma
- **Asistencia contextual** para estudiantes y profesores
- **Respuestas inteligentes** sobre contenido académico
- **Soporte 24/7** para consultas educativas

## 🛠️ Tecnologías Utilizadas

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, Radix UI
- **Base de datos**: Supabase
- **Autenticación**: Supabase Auth + Google OAuth
- **APIs**: Google Classroom API
- **Estado**: Zustand
- **Iconos**: Lucide React

## 🚀 Instalación y Configuración

### Prerrequisitos

- Node.js 18+ 
- pnpm (recomendado) o npm
- Cuenta de Google Cloud Platform
- Proyecto de Supabase

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/classroom-plus.git
cd classroom-plus
```

### 2. Instalar dependencias

```bash
pnpm install
# o
npm install
```

### 3. Configurar variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url_aqui
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key_aqui
SUPABASE_SERVICE_ROLE_KEY=tu_supabase_service_role_key_aqui

# Google OAuth Configuration
GOOGLE_CLIENT_ID=tu_google_client_id_aqui
GOOGLE_CLIENT_SECRET=tu_google_client_secret_aqui

# EasyPeasy AI Assistant Configuration
NEXT_PUBLIC_EASY_PEASY_API_KEY=tu_easy_peasy_api_key_aqui
NEXT_PUBLIC_EASY_PEASY_WIDGET_URL=tu_easy_peasy_widget_url_aqui

# Google Classroom API (opcional - se puede configurar dinámicamente)
GOOGLE_CLASSROOM_ACCESS_TOKEN=tu_access_token_aqui
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback

```

### 4. Configurar Google Cloud Platform

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita la **Google Classroom API**
4. Ve a "Credenciales" y crea credenciales OAuth 2.0
5. Configura las URIs de redirección autorizadas:
   - `http://localhost:3000/auth/callback` (desarrollo)
   - `https://tu-dominio.com/auth/callback` (producción)

### 5. Configurar Supabase

1. Ve a [Supabase](https://supabase.com/) y crea un nuevo proyecto
2. En la configuración del proyecto, obtén:
   - **Project URL** (NEXT_PUBLIC_SUPABASE_URL)
   - **Anon Key** (NEXT_PUBLIC_SUPABASE_ANON_KEY)
   - **Service Role Key** (SUPABASE_SERVICE_ROLE_KEY)
3. Configura la autenticación con Google:
   - Ve a Authentication > Providers
   - Habilita Google
   - Agrega tu Client ID y Client Secret de Google

### 6. Configurar EasyPeasy AI

1. Ve a [EasyPeasy](https://easypeasy.ai/) y crea una cuenta
2. Obtén tu API Key y Widget URL desde el dashboard
3. Configura las variables en tu `.env.local`:
   - `NEXT_PUBLIC_EASY_PEASY_API_KEY`: Tu API key de EasyPeasy
   - `NEXT_PUBLIC_EASY_PEASY_WIDGET_URL`: URL del widget de EasyPeasy

### 7. Ejecutar en desarrollo

```bash
pnpm dev
# o
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

**Desarrollado por Nicolas Escobar**