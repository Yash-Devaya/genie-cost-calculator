import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Public routes
  if (pathname === '/login' || pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  try {
    // Get session token
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
      secureCookie: process.env.NODE_ENV === 'production',
    });

    console.log('Middleware - Path:', pathname, 'Token:', token ? 'exists' : 'missing');

    // No token = not authenticated
    if (!token) {
      console.log('Middleware - Redirecting to login (no token)');
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Check admin routes
    if (pathname.startsWith('/admin')) {
      if (token.role !== 'ADMIN') {
        console.log('Middleware - Redirecting to home (not admin)');
        return NextResponse.redirect(new URL('/', request.url));
      }
    }

    console.log('Middleware - Access granted');
    return NextResponse.next();
  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
