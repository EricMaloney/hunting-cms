/**
 * Google Slides Publisher
 * Creates and manages a "Huntington Steel - Digital Signage" presentation.
 *
 * Each approved piece of content targeting 'google_slides' platform becomes
 * a full-bleed slide. Expired content has its slide removed automatically.
 *
 * The presentation ID is stored in the devices table (device_id column) for
 * the Google Slides device record. Created automatically on first use.
 */

import { google } from 'googleapis'
import type { OAuth2Client } from 'google-auth-library'

// Widescreen 16:9 in EMU (English Metric Units — Google's internal unit)
// 10 inches × 5.625 inches at 914400 EMU/inch
const SLIDE_WIDTH_EMU = 9144000
const SLIDE_HEIGHT_EMU = 5143500

function createOAuth2Client(refreshToken: string): OAuth2Client {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )
  client.setCredentials({ refresh_token: refreshToken })
  return client
}

/**
 * Returns the presentation ID — creates the presentation if it doesn't exist.
 * Pass the current device_id from the devices table (may be null on first use).
 * Returns { presentationId, isNew } — if isNew, caller should store the ID in devices.
 */
export async function getOrCreatePresentation(
  refreshToken: string,
  existingPresentationId: string | null
): Promise<{ presentationId: string; isNew: boolean }> {
  const auth = createOAuth2Client(refreshToken)
  const slidesApi = google.slides({ version: 'v1', auth })

  if (existingPresentationId) {
    try {
      await slidesApi.presentations.get({ presentationId: existingPresentationId })
      return { presentationId: existingPresentationId, isNew: false }
    } catch {
      // Presentation no longer exists — create a new one
    }
  }

  const res = await slidesApi.presentations.create({
    requestBody: {
      title: 'Huntington Steel — Digital Signage',
      pageSize: {
        width: { magnitude: SLIDE_WIDTH_EMU, unit: 'EMU' },
        height: { magnitude: SLIDE_HEIGHT_EMU, unit: 'EMU' },
      },
    },
  })

  return {
    presentationId: res.data.presentationId!,
    isNew: true,
  }
}

/**
 * Adds a full-bleed image slide at position 0 (front of deck).
 * Returns the slideObjectId so it can be stored and deleted later.
 */
export async function addImageSlide(
  refreshToken: string,
  presentationId: string,
  imageUrl: string
): Promise<string> {
  const auth = createOAuth2Client(refreshToken)
  const slidesApi = google.slides({ version: 'v1', auth })

  const slideId = `slide_${Date.now()}`
  const imageId = `img_${Date.now()}`

  // Add a slide note with the title for reference
  await slidesApi.presentations.batchUpdate({
    presentationId,
    requestBody: {
      requests: [
        {
          createSlide: {
            objectId: slideId,
            insertionIndex: 0,
            slideLayoutReference: { predefinedLayout: 'BLANK' },
          },
        },
        {
          createImage: {
            objectId: imageId,
            url: imageUrl,
            elementProperties: {
              pageObjectId: slideId,
              size: {
                width: { magnitude: SLIDE_WIDTH_EMU, unit: 'EMU' },
                height: { magnitude: SLIDE_HEIGHT_EMU, unit: 'EMU' },
              },
              transform: {
                scaleX: 1,
                scaleY: 1,
                translateX: 0,
                translateY: 0,
                unit: 'EMU',
              },
            },
          },
        },
      ],
    },
  })

  return slideId
}

/**
 * Removes a slide from the presentation by its object ID.
 * Used when content expires or is replaced.
 */
export async function removeSlide(
  refreshToken: string,
  presentationId: string,
  slideObjectId: string
): Promise<void> {
  const auth = createOAuth2Client(refreshToken)
  const slidesApi = google.slides({ version: 'v1', auth })

  await slidesApi.presentations.batchUpdate({
    presentationId,
    requestBody: {
      requests: [{ deleteObject: { objectId: slideObjectId } }],
    },
  })
}

/**
 * Returns the shareable present/view URL for the presentation.
 */
export function getPresentationUrl(presentationId: string): string {
  return `https://docs.google.com/presentation/d/${presentationId}/present`
}
