import type { Device, ValidationResult, FileMetadata } from '@/types'

// TV standard aspect ratio: 16:9 = 1.7778
const TV_ASPECT_RATIO = 16 / 9
const ASPECT_RATIO_TOLERANCE = 0.05 // 5% tolerance

/**
 * Parse a resolution string like "1920x1080" or "3840x2160"
 * Returns { width, height } or null if unparseable.
 */
export function parseResolution(resolution: string): { width: number; height: number } | null {
  const match = resolution.match(/^(\d+)[xX×](\d+)$/)
  if (!match) return null
  return {
    width: parseInt(match[1], 10),
    height: parseInt(match[2], 10),
  }
}

/**
 * Get the extension from a filename or MIME type.
 */
export function getExtensionFromFile(file: { name: string; type: string }): string {
  // Try from name first
  const nameParts = file.name.split('.')
  if (nameParts.length > 1) {
    return nameParts[nameParts.length - 1].toLowerCase()
  }

  // Fallback: from MIME type
  const mimeMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/bmp': 'bmp',
    'image/webp': 'webp',
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'video/mov': 'mov',
  }
  return mimeMap[file.type] || ''
}

/**
 * Validate a file against a single device's requirements.
 */
export function validateFileForDevice(
  file: FileMetadata,
  device: Device
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // 1. File format validation
  if (device.supported_formats && device.supported_formats.length > 0) {
    const extension = getExtensionFromFile({ name: file.name, type: file.type })
    // Treat 'jpg' and 'jpeg' as equivalent
    const normalizedExt = extension === 'jpeg' ? 'jpg' : extension
    const normalizedFormats = device.supported_formats.map((f) => (f === 'jpeg' ? 'jpg' : f))

    if (!normalizedFormats.includes(normalizedExt)) {
      errors.push(
        `"${device.name}" does not support .${extension} files. Supported formats: ${device.supported_formats.join(', ')}`
      )
    }
  }

  // 2. File size validation
  if (device.max_file_size_mb && file.size > 0) {
    const fileSizeMb = file.size / (1024 * 1024)
    if (fileSizeMb > device.max_file_size_mb) {
      errors.push(
        `File size ${fileSizeMb.toFixed(1)} MB exceeds "${device.name}" maximum of ${device.max_file_size_mb} MB`
      )
    } else if (fileSizeMb > device.max_file_size_mb * 0.9) {
      warnings.push(
        `File size ${fileSizeMb.toFixed(1)} MB is close to "${device.name}" maximum of ${device.max_file_size_mb} MB`
      )
    }
  }

  // 3. Resolution validation (images only)
  if (file.width && file.height && device.max_resolution) {
    const maxRes = parseResolution(device.max_resolution)
    if (maxRes) {
      if (file.width > maxRes.width || file.height > maxRes.height) {
        errors.push(
          `Image resolution ${file.width}x${file.height} exceeds "${device.name}" maximum of ${device.max_resolution}`
        )
      } else if (file.width < maxRes.width || file.height < maxRes.height) {
        warnings.push(
          `Image resolution ${file.width}x${file.height} is below "${device.name}" optimal resolution of ${device.max_resolution}. Content may appear stretched or blurry.`
        )
      }
    }
  }

  // 4. Aspect ratio check for TV devices
  if (file.width && file.height) {
    const aspectRatio = file.width / file.height
    const deviation = Math.abs(aspectRatio - TV_ASPECT_RATIO) / TV_ASPECT_RATIO

    if (deviation > ASPECT_RATIO_TOLERANCE) {
      const ratioStr = `${(aspectRatio).toFixed(3)} (${file.width}:${file.height})`
      warnings.push(
        `Aspect ratio ${ratioStr} is not 16:9 (${TV_ASPECT_RATIO.toFixed(3)}). Content may have black bars or be cropped on TV displays.`
      )
    }
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
  }
}

/**
 * Validate a file against multiple devices.
 * Returns combined errors/warnings with device context.
 */
export function validateFileForDevices(
  file: FileMetadata,
  devices: Device[]
): ValidationResult {
  if (devices.length === 0) {
    return { valid: true, warnings: [], errors: [] }
  }

  const allErrors: string[] = []
  const allWarnings: string[] = []

  for (const device of devices) {
    const result = validateFileForDevice(file, device)
    allErrors.push(...result.errors)
    allWarnings.push(...result.warnings)
  }

  // Deduplicate
  const uniqueErrors = allErrors.filter((v, i, a) => a.indexOf(v) === i)
  const uniqueWarnings = allWarnings.filter((v, i, a) => a.indexOf(v) === i)

  return {
    valid: uniqueErrors.length === 0,
    warnings: uniqueWarnings,
    errors: uniqueErrors,
  }
}

/**
 * Determine content type from MIME type.
 */
export function getContentType(mimeType: string): 'image' | 'video' | 'audio' | null {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'audio'
  return null
}

/**
 * Read image dimensions from a File object (browser-only).
 * Returns a promise that resolves to { width, height }.
 */
export function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Not an image file'))
      return
    }

    const url = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }

    img.src = url
  })
}

/**
 * Read video duration from a File object (browser-only).
 * Returns a promise that resolves to duration in seconds.
 */
export function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('video/')) {
      reject(new Error('Not a video file'))
      return
    }

    const url = URL.createObjectURL(file)
    const video = document.createElement('video')

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url)
      resolve(video.duration)
    }

    video.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load video'))
    }

    video.src = url
  })
}

/**
 * Format bytes to a human-readable string.
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

/**
 * Validate MIME type is an accepted media type.
 */
export function isAcceptedMediaType(mimeType: string): boolean {
  const accepted = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/bmp',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'video/mov',
  ]
  return accepted.includes(mimeType)
}
