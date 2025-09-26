// Tipos comunes para las APIs

export interface ApiError {
  message: string
  code?: string
  details?: unknown
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Tipos para Google Classroom API
export interface GoogleCourse {
  id?: string
  name?: string
  section?: string
  description?: string
  room?: string
  ownerId?: string
  creationTime?: string
  updateTime?: string
  courseState?: string
  alternateLink?: string
  teacherGroupEmail?: string
  courseGroupEmail?: string
  teacherFolder?: {
    id?: string
    title?: string
    alternateLink?: string
  }
  courseMaterialSets?: unknown[]
  guardiansEnabled?: boolean
  calendarId?: string
  gradebookSettings?: {
    calculationType?: string
    displaySetting?: string
  }
}

export interface GoogleStudent {
  userId?: string
  courseId?: string
  profile?: {
    id?: string
    name?: {
      givenName?: string
      familyName?: string
      fullName?: string
    }
    emailAddress?: string
    photoUrl?: string
    verifiedTeacher?: boolean
  }
}

export interface GoogleCourseWork {
  id?: string
  title?: string
  description?: string
  materials?: unknown[]
  state?: string
  alternateLink?: string
  creationTime?: string
  updateTime?: string
  dueDate?: {
    year?: number
    month?: number
    day?: number
  }
  dueTime?: {
    hours?: number
    minutes?: number
    seconds?: number
    nanos?: number
  }
  maxPoints?: number
  workType?: string
  associatedWithDeveloper?: boolean
  assigneeMode?: string
  individualStudentsOptions?: {
    studentIds?: string[]
  }
  submissionModificationMode?: string
  creatorUserId?: string
  topicId?: string
  gradeCategory?: {
    id?: string
    name?: string
  }
  assignment?: {
    studentWorkFolder?: {
      id?: string
      title?: string
      alternateLink?: string
    }
  }
}

export interface GoogleSubmission {
  id?: string
  courseId?: string
  courseWorkId?: string
  courseWorkType?: string
  state?: string
  assignedGrade?: number
  draftGrade?: number
  finalGrade?: number
  late?: boolean
  submissionHistory?: unknown[]
  userId?: string
  creationTime?: string
  updateTime?: string
  alternateLink?: string
  assignmentSubmission?: {
    attachments?: unknown[]
  }
  shortAnswerSubmission?: {
    answer?: string
  }
  multipleChoiceSubmission?: {
    answer?: string
  }
}

// Tipos para Supabase
export interface SupabaseUser {
  id: string
  email?: string
  user_metadata?: {
    full_name?: string
    name?: string
    avatar_url?: string
    picture?: string
  }
}

export interface SupabaseSession {
  user: SupabaseUser
  provider_token?: string
  provider_refresh_token?: string
}
