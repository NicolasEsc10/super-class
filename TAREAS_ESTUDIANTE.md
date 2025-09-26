# 📚 Sistema de Tareas para Estudiantes

## Resumen

Hemos implementado un sistema completo para que los estudiantes puedan **recuperar y gestionar sus tareas pendientes** de Google Classroom. Esta funcionalidad permite a los alumnos ver todas sus tareas organizadas por estado, fechas de vencimiento y cursos.

## 🚀 Funcionalidades Implementadas

### 1. API Endpoint para Tareas del Estudiante
- **Ruta**: `/api/classroom/student-assignments`
- **Método**: `GET`
- **Descripción**: Obtiene todas las tareas del estudiante autenticado con sus estados de entrega

### 2. Hook Personalizado `useStudentAssignments`
- **Archivo**: `src/hooks/useStudentAssignments.ts`
- **Funciones principales**:
  - Carga automática de tareas al autenticarse
  - Filtrado por estado (pendientes, completadas, atrasadas)
  - Estadísticas en tiempo real
  - Utilidades para formateo de fechas y estados

### 3. Dashboard Actualizado
- **Archivo**: `src/components/ClassroomDashboard.tsx`
- **Mejoras**:
  - Progreso académico basado en datos reales
  - Tareas próximas a vencer
  - Notificaciones inteligentes sobre tareas atrasadas
  - Estadísticas precisas de rendimiento

### 4. Componente de Vista Detallada
- **Archivo**: `src/components/StudentAssignments.tsx`
- **Características**:
  - Vista completa de todas las tareas
  - Filtros por categorías (pendientes, próximas, atrasadas, completadas)
  - Tarjetas informativas con detalles de cada tarea
  - Enlaces directos a Google Classroom

## 📊 Datos que se Obtienen

Para cada tarea, el sistema recupera:

```typescript
interface StudentAssignment {
  id: string                    // ID único de la tarea
  courseId: string             // ID del curso
  courseName: string           // Nombre del curso
  title: string                // Título de la tarea
  description?: string         // Descripción (opcional)
  dueDate?: string            // Fecha de vencimiento
  creationTime: string        // Fecha de creación
  state: 'NEW' | 'CREATED' | 'TURNED_IN' | 'RETURNED' | 'RECLAIMED_BY_STUDENT'
  assignedGrade?: number      // Calificación asignada
  maxPoints?: number          // Puntos máximos
  alternateLink?: string      // Enlace a Google Classroom
  workType: 'ASSIGNMENT' | 'SHORT_ANSWER_QUESTION' | 'MULTIPLE_CHOICE_QUESTION'
  materials?: any[]           // Materiales adjuntos
  isLate: boolean             // Si está atrasada
  isPending: boolean          // Si está pendiente
}
```

## 🎯 Estados de las Tareas

- **NEW/CREATED**: Tarea asignada pero no entregada (Pendiente)
- **TURNED_IN**: Tarea entregada por el estudiante
- **RETURNED**: Tarea calificada y devuelta por el profesor
- **RECLAIMED_BY_STUDENT**: Tarea reclamada por el estudiante después de ser devuelta

## 📅 Clasificación por Urgencia

### Tareas Atrasadas (`isLate: true`)
- Fecha de vencimiento pasada y no entregadas
- Aparecen con alerta roja en notificaciones

### Tareas Próximas (`upcomingAssignments`)
- Vencen en los próximos 7 días
- Aparecen con alerta amarilla

### Tareas Pendientes (`pendingAssignments`)
- Todas las tareas no entregadas
- Incluye atrasadas y próximas

## 🔧 Cómo Usar

### En el Dashboard Principal
```typescript
// El hook se usa automáticamente en ClassroomDashboard.tsx
const { 
  assignments, 
  stats, 
  loading, 
  pendingAssignments,
  upcomingAssignments,
  lateAssignments
} = useStudentAssignments()
```

### En Componentes Personalizados
```typescript
import { useStudentAssignments } from '@/hooks/useStudentAssignments'

function MiComponente() {
  const { pendingAssignments, loading, error } = useStudentAssignments()
  
  if (loading) return <div>Cargando...</div>
  if (error) return <div>Error: {error}</div>
  
  return (
    <div>
      {pendingAssignments.map(assignment => (
        <div key={assignment.id}>
          <h3>{assignment.title}</h3>
          <p>{assignment.courseName}</p>
        </div>
      ))}
    </div>
  )
}
```

### Para un Curso Específico
```typescript
import { useCourseAssignments } from '@/hooks/useStudentAssignments'

function TareasCurso({ courseId }: { courseId: string }) {
  const { assignments } = useCourseAssignments(courseId)
  
  return (
    <div>
      {assignments.map(assignment => (
        <div key={assignment.id}>{assignment.title}</div>
      ))}
    </div>
  )
}
```

## 🛡️ Permisos Requeridos

La aplicación requiere estos scopes de Google:
- `https://www.googleapis.com/auth/classroom.courses.readonly`
- `https://www.googleapis.com/auth/classroom.rosters.readonly`
- `https://www.googleapis.com/auth/classroom.student-submissions.students.readonly`

## 🚨 Manejo de Errores

El sistema maneja varios tipos de errores:
- **401 Unauthorized**: Token expirado, requiere re-autenticación
- **403 Forbidden**: Permisos insuficientes
- **Network errors**: Problemas de conectividad
- **API limits**: Límites de Google Classroom API

## 📱 Responsive y UX

- **Loading states**: Indicadores de carga mientras se obtienen datos
- **Error states**: Mensajes claros cuando algo falla
- **Empty states**: Mensajes motivacionales cuando no hay tareas
- **Mobile friendly**: Funciona perfectamente en dispositivos móviles

## 🔄 Actualización Automática

- Las tareas se cargan automáticamente al autenticarse
- Se actualizan cuando cambia la sesión
- Función `refetch()` disponible para actualización manual

## 💡 Próximas Mejoras Sugeridas

1. **Notificaciones Push**: Alertas en tiempo real
2. **Calendario integrado**: Vista de calendario con fechas de vencimiento
3. **Recordatorios**: Sistema de recordatorios personalizables
4. **Filtros avanzados**: Por curso, tipo de tarea, fecha
5. **Exportación**: Exportar tareas a PDF o Excel
6. **Estadísticas avanzadas**: Gráficos de rendimiento temporal

## 📞 Soporte

Si encuentras algún problema:
1. Verifica que tengas los permisos correctos en Google
2. Revisa la consola del navegador para errores
3. Intenta cerrar sesión y volver a autenticarte
4. Contacta al administrador del sistema si persisten los problemas

---

**¡Ahora puedes gestionar todas tus tareas de Google Classroom de manera eficiente! 🎓**
