import { supabaseAdmin } from '@/lib/supabase/server'

export async function createNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  submissionId?: string
): Promise<void> {
  try {
    await supabaseAdmin.from('notifications').insert({
      user_id: userId,
      type,
      title,
      message,
      submission_id: submissionId || null,
    })
  } catch (err) {
    console.error('[createNotification] Failed:', err)
  }
}
