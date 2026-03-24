import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const pathname = url.pathname;

  // Get authentication token from cookies
  const token = request.cookies.get('auth-token')?.value;
  const doctorId = request.cookies.get('doctor-id')?.value;

  // Check if user is authenticated
  const isAuthenticated = !!(token && doctorId);

  // Define paths
  const isRootPage = pathname === '/';
  const isLoginPage = pathname === '/login';
  const isDashboardPath = pathname.startsWith('/dashboard');
  const isProtectedPath = isDashboardPath || pathname.startsWith('/api');

  // Root page redirection
  if (isRootPage) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/dashboard/home', request.url));
    } else {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // If user is authenticated and tries to access login page, redirect to dashboard
  if (isAuthenticated && isLoginPage) {
    return NextResponse.redirect(new URL('/dashboard/home', request.url));
  }

  // If user is not authenticated and tries to access protected paths, redirect to login
  if (!isAuthenticated && isProtectedPath && !pathname.startsWith('/api/auth') && !pathname.startsWith('/api/debug-auth') && !pathname.startsWith('/api/reset-data') && !pathname.startsWith('/api/check-data')) {
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Unauthorized', message: 'Please log in to continue' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (authentication APIs)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files (.png, .jpg, etc.)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$)[^?#]*)',
  ],
};
