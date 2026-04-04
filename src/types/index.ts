// ============================================================
// Huntington Steel CMS - TypeScript Types
// ============================================================

export type SubmissionStatus = 'pending' | 'approved' | 'rejected' | 'live' | 'expired'
export type DevicePlatform = 'unifi' | 'google_slides' | 'other'
export type UserRole = 'user' | 'admin'
export type ContentType = 'image' | 'video' | 'audio'

// ============================================================
// User
// ============================================================
export interface User {
  id: string
  email: string
  name: string | null
  image: string | null
  role: UserRole
  created_at: string
  last_login: string
}

// ============================================================
// Device
// ============================================================
export interface Device {
  id: string
  name: string
  location: string | null
  platform: DevicePlatform
  device_type: string | null
  max_resolution: string | null
  max_file_size_mb: number | null
  supported_formats: string[] | null
  notes: string | null
  is_active: boolean
  created_at: string
}

// ============================================================
// Submission
// ============================================================
export interface Submission {
  id: string
  user_id: string | null
  title: string
  description: string | null
  content_type: ContentType
  file_url: string
  file_name: string
  file_size_bytes: number | null
  file_type: string | null
  width: number | null
  height: number | null
  duration_seconds: number | null
  target_devices: string[] | null // array of device IDs
  schedule_start: string | null
  schedule_end: string | null
  status: SubmissionStatus
  admin_feedback: string | null
  reviewer_notes: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  published_at: string | null
  // UniFi publish tracking
  unifi_publish_status: 'pending' | 'published' | 'failed' | null
  unifi_publish_error: string | null
  // Google Slides publish tracking
  google_slides_slide_id: string | null
  google_publish_status: 'pending' | 'published' | 'failed' | null
  created_at: string
  updated_at: string
  // Joined fields
  user?: Pick<User, 'id' | 'email' | 'name' | 'image'>
  reviewer?: Pick<User, 'id' | 'email' | 'name'>
  devices?: Device[]
}

// ============================================================
// Design Request
// ============================================================
export type DesignRequestStatus = 'new' | 'in_progress' | 'submitted' | 'approved' | 'rejected'

export interface DesignRequest {
  id: string
  name: string
  email: string | null
  phone: string | null
  message: string
  go_live_date: string | null
  end_date: string | null
  status: DesignRequestStatus
  claimed_by: string | null
  claimed_at: string | null
  submission_id: string | null
  created_at: string
  // Joined
  claimer?: Pick<User, 'id' | 'email' | 'name'>
  submission?: Pick<Submission, 'id' | 'title' | 'status'>
}

// ============================================================
// Audit Log
// ============================================================
export interface AuditLog {
  id: string
  user_id: string | null
  action: string
  entity_type: string | null
  entity_id: string | null
  details: Record<string, unknown> | null
  created_at: string
  user?: Pick<User, 'id' | 'email' | 'name'>
}

// ============================================================
// Form Data
// ============================================================
export interface SubmissionFormData {
  title: string
  description?: string
  file: File
  target_devices: string[]
  schedule_start?: string
  schedule_end?: string
  reviewer_notes?: string
}

export interface DeviceFormData {
  name: string
  location?: string
  platform: DevicePlatform
  device_type?: string
  max_resolution?: string
  max_file_size_mb?: number
  supported_formats?: string[]
  notes?: string
}

// ============================================================
// API Responses
// ============================================================
export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  per_page: number
}

// ============================================================
// Media Validation
// ============================================================
export interface ValidationResult {
  valid: boolean
  warnings: string[]
  errors: string[]
}

export interface FileMetadata {
  name: string
  size: number
  type: string
  width?: number
  height?: number
  duration?: number
  aspectRatio?: number
}

// ============================================================
// Next Auth Session Extension
// ============================================================
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string | null
      image: string | null
      role: UserRole
    }
  }

  interface User {
    id: string
    email: string
    name: string | null
    image: string | null
    role: UserRole
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: UserRole
  }
}
