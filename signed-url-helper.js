// SIGNED URL HELPER - Generate secure signed URLs for private bucket files
// Used for accessing files from private Supabase buckets

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://fvpedrabqhcpiifjcfik.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2cGVkcmFicWhjcGlpZmpjZmlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzNTIwMzksImV4cCI6MjA5MDkyODAzOX0.VHTH80WcqX4B0q4G-q_kKAS4RHyDBVONEkRMFSTPTcc';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Generate a signed URL for a private bucket file
 * @param {string} bucketName - Name of the bucket (e.g., 'music', 'gallery')
 * @param {string} filePath - Path to the file in the bucket
 * @param {number} expiresIn - Expiration time in seconds (default: 3600 = 1 hour)
 * @returns {Promise<string>} - Signed URL that can be used to access the file
 */
export async function getSignedUrl(bucketName, filePath, expiresIn = 3600) {
  try {
    const { data, error } = await supabase
      .storage
      .from(bucketName)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      console.error('Error creating signed URL:', error);
      throw error;
    }

    return data.signedUrl;
  } catch (error) {
    console.error('Signed URL generation failed:', error);
    throw error;
  }
}

/**
 * Get multiple signed URLs for batch operations
 * @param {string} bucketName - Name of the bucket
 * @param {string[]} filePaths - Array of file paths
 * @param {number} expiresIn - Expiration time in seconds
 * @returns {Promise<string[]>} - Array of signed URLs
 */
export async function getSignedUrls(bucketName, filePaths, expiresIn = 3600) {
  try {
    const { data, error } = await supabase
      .storage
      .from(bucketName)
      .createSignedUrls(filePaths, expiresIn);

    if (error) {
      console.error('Error creating signed URLs:', error);
      throw error;
    }

    return data.map(item => item.signedUrl);
  } catch (error) {
    console.error('Batch signed URL generation failed:', error);
    throw error;
  }
}

/**
 * Get a public URL for a file (works for public buckets only)
 * @param {string} bucketName - Name of the bucket
 * @param {string} filePath - Path to the file
 * @returns {string} - Public URL
 */
export function getPublicUrl(bucketName, filePath) {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucketName}/${filePath}`;
}
