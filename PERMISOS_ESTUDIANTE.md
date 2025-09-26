# 🔐 Solución de Permisos para Estudiantes en Google Classroom API

## 🚨 Problema Identificado

**Error 403: "The caller does not have permission"**

El problema principal era que estaba intentando usar `courses.courseWork.list()` para obtener las tareas, pero **los estudiantes no tienen permisos para listar todas las tareas de un curso**. Solo los profesores y administradores tienen estos permisos.

## ✅ Solución Implementada

### Enfoque Correcto para Estudiantes

En lugar de intentar acceder a las tareas directamente, ahora uso el enfoque correcto:

1. **Usar `studentSubmissions.list()`** con `courseId: '-'` para obtener todas las entregas del estudiante
2. **Para cada entrega**, obtener los detalles de la tarea usando `courseWork.get()`
3. **Combinar la información** de la entrega con los detalles de la tarea

### Código Implementado

```typescript
// ✅ CORRECTO: Obtener entregas del estudiante
const submissionsResponse = await classroom.courses.courseWork.studentSubmissions.list({
  courseId: '-', // '-' significa todos los cursos
  userId: user.email, // Solo las entregas de este estudiante
  pageSize: 100
})

// ✅ CORRECTO: Para cada entrega, obtener detalles de la tarea
for (const submission of submissions) {
  const workResponse = await classroom.courses.courseWork.get({
    courseId: submission.courseId!,
    id: submission.courseWorkId!
  })
}
```

### ❌ Enfoque Incorrecto (que causaba el error 403)

```typescript
// ❌ INCORRECTO: Los estudiantes no pueden hacer esto
const courseworkResponse = await classroom.courses.courseWork.list({
  courseId: course.id,
  pageSize: 50
})
```

## 🔑 Permisos Requeridos

Los siguientes scopes son necesarios y están correctamente configurados:

```javascript
scopes: [
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.rosters.readonly',
  'https://www.googleapis.com/auth/classroom.student-submissions.students.readonly' // ← Clave para estudiantes
]
```

## 📂 Archivos Creados/Modificados

### 1. API Simplificada
- **Archivo**: `src/app/api/classroom/student-assignments-simple/route.ts`
- **Propósito**: Endpoint optimizado para permisos de estudiante
- **Método**: Usa `studentSubmissions.list()` con `courseId: '-'`

### 2. Hook Actualizado
- **Archivo**: `src/hooks/useStudentAssignments.ts`
- **Cambio**: Ahora apunta a `/api/classroom/student-assignments-simple`

## 🔍 Diferencias Clave en los Permisos

| Acción | Profesor | Estudiante | Método Correcto para Estudiante |
|--------|----------|------------|--------------------------------|
| Listar todas las tareas de un curso | ✅ `courseWork.list()` | ❌ Sin permisos | `studentSubmissions.list()` + `courseWork.get()` |
| Ver detalles de una tarea específica | ✅ `courseWork.get()` | ✅ `courseWork.get()` | ✅ Mismo método |
| Ver entregas de estudiantes | ✅ `studentSubmissions.list()` | ✅ Solo sus propias entregas | `studentSubmissions.list()` con `userId` |
| Listar cursos | ✅ Todos los cursos donde enseña | ✅ Todos los cursos donde estudia | `courses.list()` |

## 🚀 Ventajas del Nuevo Enfoque

1. **Cumple con permisos**: No intenta acceder a recursos prohibidos
2. **Más eficiente**: Obtiene directamente las entregas del estudiante
3. **Mejor rendimiento**: Menos llamadas a la API
4. **Más preciso**: Solo obtiene tareas donde el estudiante está inscrito

## 🛠️ Manejo de Errores Mejorado

```typescript
try {
  // Lógica principal
} catch (apiError: any) {
  if (apiError.code === 403) {
    return NextResponse.json({
      success: false,
      error: 'No tienes permisos para acceder a las tareas como estudiante. Verifica que hayas autorizado los permisos correctos.'
    }, { status: 403 })
  }
  throw apiError
}
```

## 📊 Resultado

Ahora el sistema puede:
- ✅ Obtener todas las tareas del estudiante sin errores 403
- ✅ Mostrar estados correctos (pendiente, entregada, calificada, atrasada)
- ✅ Calcular estadísticas precisas
- ✅ Ordenar por fecha de vencimiento
- ✅ Mostrar información completa de cada tarea

## 🔄 Migración

Si necesitas volver al endpoint anterior, simplemente cambia:

```typescript
// En useStudentAssignments.ts
const response = await fetch('/api/classroom/student-assignments') // Endpoint original
// a
const response = await fetch('/api/classroom/student-assignments-simple') // Endpoint optimizado
```

## 📝 Notas Importantes

1. **El parámetro `courseId: '-'`** en `studentSubmissions.list()` es especial y significa "todos los cursos"
2. **Los estudiantes solo pueden ver sus propias entregas**, nunca las de otros estudiantes
3. **El campo `userId`** debe coincidir con el email del usuario autenticado
4. **Algunos cursos pueden no ser accesibles** si el estudiante no tiene permisos específicos

---

**🎓 Resultado Final**: Los estudiantes ahora pueden acceder a todas sus tareas pendientes sin errores de permisos.
