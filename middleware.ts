import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Middleware
 * Handles route protection and public access configuration.
 * 
 * Public routes that bypass authentication:
 * - /share/* - Public portfolio viewing
 * - /auth/* - Authentication flows
 * - / - Landing page
 */

// Routes that should be publicly accessible without authentication
const publicRoutes = ['/share/', '/auth/', '/'];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Check if the current path matches any public route
    const isPublicRoute = publicRoutes.some(route => {
        if (route === '/') {
            return pathname === '/';
        }
        return pathname.startsWith(route);
    });

    // For public routes, allow access without any auth check
    if (isPublicRoute) {
        return NextResponse.next();
    }

    // For protected routes, let the app handle client-side auth via useSessionGuard
    // This middleware primarily documents the public routes
    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder files (images, etc.)
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)$).*)',
    ],
};
