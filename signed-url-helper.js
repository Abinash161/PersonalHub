// SIGNED URL HELPER
// Reuses the shared Supabase client from supabase-integration.js
// so we never duplicate credentials or risk introducing the service_role key.

import { supabase } from './supabase-integration.js';

/**
 * Generate a signed URL for a private bucket file.
 * @param {string} bucketName - e.g. 'music-files' or 'gallery-images'
 * @param {string} filePath - path inside the bucket
 * @param {number} expiresIn - seconds until expiry (default 1 hour)
 */
export async function getSignedUrl(bucketName, filePath, expiresIn = 3600) {
  const { data, error } = await supabase.storage
    .from(bucketName)
    .createSignedUrl(filePath, expiresIn);

  if (error) throw error;
  return data.signedUrl;
}

/**
 * Generate signed URLs for multiple files in one call.
 */
export async function getSignedUrls(bucketName, filePaths, expiresIn = 3600) {
  const { data, error } = await supabase.storage
    .from(bucketName)
    .createSignedUrls(filePaths, expiresIn);

  if (error) throw error;
  return data.map(item => item.signedUrl);
}

/**
 * Get a public URL (only works if the bucket is set to public).
 */
export function getPublicUrl(bucketName, filePath) {
  const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
  return data.publicUrl;
}
