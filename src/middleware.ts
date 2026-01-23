import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Cookie name for preferred view (must match settings page)
const PREFERRED_VIEW_COOKIE = 'sederize-preferred-view';

// Route mapping for preferred views
const VIEW_ROUTES: Record<string, string> = {
  'daily-brief': '/',
  'inbox': '/inbox',
  'calendar': '/calendar',
  'kanban': '/kanban',
};

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protected routes - redirect to login if not authenticated
  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/signup') &&
    !request.nextUrl.pathname.startsWith('/auth')
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  if (
    user &&
    (request.nextUrl.pathname.startsWith('/login') ||
      request.nextUrl.pathname.startsWith('/signup'))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  // Redirect to preferred view on root path ONLY on initial app load
  // (not when user explicitly navigates to Daily Brief within the app)
  if (user && request.nextUrl.pathname === '/') {
    const referer = request.headers.get('referer');
    const isInternalNavigation = referer && new URL(referer).origin === request.nextUrl.origin;

    // Only redirect if this is an external entry (no referer or different origin)
    if (!isInternalNavigation) {
      const preferredView = request.cookies.get(PREFERRED_VIEW_COOKIE)?.value;
      const targetRoute = preferredView ? VIEW_ROUTES[preferredView] : null;

      if (targetRoute && targetRoute !== '/') {
        const url = request.nextUrl.clone();
        url.pathname = targetRoute;
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
