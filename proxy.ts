import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function proxy(request: NextRequest) {
  try {
    // 1. Create an initial response object
    let supabaseResponse = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase environment variables in proxy');
      return NextResponse.next();
    }

    // 2. Initialize Supabase client with Edge-compatible cookie handling
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
              // Update request cookies
              cookiesToSet.forEach(({ name, value }) => {
                request.cookies.set(name, value);
              });

              // Re-create the response to apply the updated request cookies
              supabaseResponse = NextResponse.next({
                request,
              });

              // Apply cookies to the outgoing response
              cookiesToSet.forEach(({ name, value, options }) => {
                supabaseResponse.cookies.set(name, value, options);
              });
            } catch (e) {
              console.error('Error setting cookies on Vercel Edge:', e);
            }
          },
        },
      }
    );

    // 3. IMPORTANT: Use getUser() instead of getSession() for Vercel Edge
    // This securely validates the token against Supabase rather than just reading a potentially stale cookie
    const { data: { user } } = await supabase.auth.getUser();

    const { pathname } = request.nextUrl;
    const publicRoutes = ['/', '/sign-up'];

    // 4. Protection Logic
    if (!user && !publicRoutes.includes(pathname)) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/';
      return NextResponse.redirect(loginUrl);
    }

    return supabaseResponse;

  } catch (error) {
    console.error('Proxy error:', error instanceof Error ? error.message : error);
    return NextResponse.next();
  }
}

// 5. Cleaned up config matcher
export const config = {
  matcher: [
    '/dashboard/:path*',
  ],
};