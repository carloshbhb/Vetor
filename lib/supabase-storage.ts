import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const BUCKET_NAME = 'review-images'

function getClient() {
  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  })
}

export async function uploadImage(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
): Promise<string | null> {
  const supabase = getClient()

  // Ensure bucket exists
  const { data: buckets } = await supabase.storage.listBuckets()
  const bucketExists = buckets?.some(b => b.name === BUCKET_NAME)
  if (!bucketExists) {
    const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024,
    })
    if (createError) {
      console.warn('[Storage] Failed to create bucket:', createError.message)
    }
  }

  const filePath = `reviews/${Date.now()}-${fileName}`
  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, buffer, {
      contentType: mimeType,
      upsert: false,
    })

  if (uploadError) {
    console.warn('[Storage] Upload failed:', uploadError.message)
    return null
  }

  const { data: publicUrl } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath)

  return publicUrl.publicUrl
}
