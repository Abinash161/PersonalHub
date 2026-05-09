import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Server-side middleware for route protection.
 * Validates authentication before allowing access to protected routes.
 * This runs on the server edge and cannot be bypassed by client-side manipulation.
 */

export async function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl;

    // Public routes that don't require authentication
    const publicRoutes = ['/', '/sign-up'];

    // If the route is public, allow it through
    if (publicRoutes.includes(pathname)) {
      return NextResponse.next();
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase environment variables in middleware');
      return redirectToLogin(request);
    }

    let response = NextResponse.next({ request });

    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                response.cookies.set(name, value, options);
              });
            } catch (e) {
              console.error('Error setting cookies:', e);
            }
          },
        },
      },
    );

    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.error('Session error:', error);
      return redirectToLogin(request);
    }

    if (!session) {
      return redirectToLogin(request);
    }

    return response;
  } catch (error) {
    console.error('Middleware error:', error instanceof Error ? error.message : error);
    return redirectToLogin(request);
  }
}

function redirectToLogin(request: NextRequest) {
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/';
  return NextResponse.redirect(loginUrl);
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    // Only run middleware on protected routes
    '/dashboard/:path*',
  ],
  // These will NOT run middleware
  unstable_allowDynamic: [
    '/node_modules/@supabase/ssr/**',
  ],
};
