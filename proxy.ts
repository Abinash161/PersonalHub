import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function proxy(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl;

    // These routes are always public — bail out immediately, no Supabase call needed
    const publicRoutes = ['/', '/sign-up'];
    if (publicRoutes.includes(pathname)) {
      return NextResponse.next();
    }

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

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value }) => {
              request.cookies.set(name, value);
            });
            supabaseResponse = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) => {
              supabaseResponse.cookies.set(name, value, options);
            });
          } catch (e) {
            console.error('Error setting cookies in proxy:', e);
          }
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Only redirect if hitting a protected route without a session
    if (!user) {
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

export const config = {
  matcher: ['/dashboard/:path*'],
};