import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, serialize } from '@supabase/ssr';

/**
 * Server-side middleware for route protection.
 * Validates authentication before allowing access to protected routes.
 * This runs on the server edge and cannot be bypassed by client-side manipulation.
 */

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = ['/', '/sign-up'];

  // Protected routes that require authentication
  const protectedRoutes = ['/dashboard'];

  // If the route is public, allow it through
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // If the route is protected, validate the session server-side
  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        console.error('Missing Supabase environment variables');
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = '/';
        return NextResponse.redirect(loginUrl);
      }

      // Create a response to pass to the Supabase client
      let response = NextResponse.next({ request });

      // Create a Supabase client for the middleware
      const supabase = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value, options }) => {
                response.cookies.set(name, value, options);
              });
            },
          },
        },
      );

      // Get the session from the server
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // If no session, redirect to login
      if (!session) {
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = '/';
        return NextResponse.redirect(loginUrl);
      }

      // Session is valid, proceed with updated cookies
      return response;
    } catch (error) {
      console.error('Auth middleware error:', error);
      // On error, redirect to login for safety
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/';
      return NextResponse.redirect(loginUrl);
    }
  }

  // For all other routes, proceed
  return NextResponse.next();
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    // Match all routes except static files, api routes, and .next internals
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
