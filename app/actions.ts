'use server';

/**
 * Secure server actions for database operations.
 * These run server-side and cannot be bypassed or manipulated by client-side code.
 * All operations are validated against the authenticated user's session.
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Get the authenticated user's session server-side.
 * This is more secure than client-only auth checks.
 */
async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Unauthorized: No valid session');
  }

  return user;
}

/**
 * Create a note (server-side validation)
 */
export async function createNoteAction(title: string, content: string) {
  try {
    const user = await getAuthenticatedUser();

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      },
    );

    const { data, error } = await supabase
      .from('notes')
      .insert([
        {
          title,
          content,
          user_id: user.id,
        },
      ])
      .select();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Update a note (server-side validation)
 */
export async function updateNoteAction(id: string, title: string, content: string) {
  try {
    const user = await getAuthenticatedUser();

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      },
    );

    const { data, error } = await supabase
      .from('notes')
      .update({ title, content })
      .eq('id', id)
      .eq('user_id', user.id) // Ensure user owns this note
      .select();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Delete a note (server-side validation)
 */
export async function deleteNoteAction(id: string) {
  try {
    const user = await getAuthenticatedUser();

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      },
    );

    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id); // Ensure user owns this note

    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Create a music track (server-side validation)
 */
export async function createMusicTrackAction(title: string, artist: string, file_url: string) {
  try {
    const user = await getAuthenticatedUser();

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      },
    );

    const payloads = [
      { title, artist, file_url, user_id: user.id },
      { title, artist, url: file_url, user_id: user.id },
      { title, artist, filePath: file_url, user_id: user.id },
      { title, artist, user_id: user.id },
    ];

    for (const payload of payloads) {
      const { data, error } = await supabase.from('music_tracks').insert([payload]).select();
      if (!error) {
        return { success: true, data };
      }

      const errCode = (error as unknown as { code?: string }).code;
      if (errCode === '42703') {
        continue;
      }

      throw error;
    }

    return { success: false, error: 'Failed to insert music track: no compatible schema found' };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Delete a music track (server-side validation)
 */
export async function deleteMusicTrackAction(id: string) {
  try {
    const user = await getAuthenticatedUser();

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      },
    );

    const { error } = await supabase
      .from('music_tracks')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Create a gallery folder (server-side validation)
 */
export async function createGalleryFolderAction(name: string) {
  try {
    const user = await getAuthenticatedUser();

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      },
    );

    const { data, error } = await supabase
      .from('gallery_folders')
      .insert([
        {
          name,
          user_id: user.id,
        },
      ])
      .select();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Delete a gallery folder (server-side validation)
 */
export async function deleteGalleryFolderAction(id: string) {
  try {
    const user = await getAuthenticatedUser();

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      },
    );

    const { error } = await supabase
      .from('gallery_folders')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Create a gallery image (server-side validation)
 */
export async function createGalleryImageAction(
  folder_id: string | null,
  file_url: string,
  _title?: string,
) {
  try {
    void _title;
    if (!folder_id) {
      return { success: false, error: 'Folder is required' };
    }

    const user = await getAuthenticatedUser();

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      },
    );

    const payloads = [
      { folder_id, file_url, user_id: user.id },
      { folder_id, file_url: file_url.trim(), user_id: user.id },
    ];

    for (const payload of payloads) {
      const { data, error } = await supabase.from('gallery_images').insert([payload]).select();
      if (!error) return { success: true, data };

      const errCode = (error as unknown as { code?: string }).code;
      if (errCode === '42703') continue;
      throw error;
    }

    return { success: false, error: 'Failed to insert gallery image: no compatible schema found' };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Delete a gallery image (server-side validation)
 */
export async function deleteGalleryImageAction(id: string) {
  try {
    const user = await getAuthenticatedUser();

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      },
    );

    const { error } = await supabase
      .from('gallery_images')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Create a letter (server-side validation)
 */
export async function createLetterAction(
  recipientName: string,
  content: string,
  recipientEmail?: string,
) {
  try {
    const user = await getAuthenticatedUser();

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      },
    );

    const payload = {
      recipient_name: recipientName,
      recipient_email: recipientEmail?.trim() ? recipientEmail.trim() : null,
      content,
      user_id: user.id,
    };

    const { data, error } = await supabase.from('letters').insert([payload]).select();
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Delete a letter (server-side validation)
 */
export async function deleteLetterAction(id: string) {
  try {
    const user = await getAuthenticatedUser();

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      },
    );

    const { error } = await supabase
      .from('letters')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}
