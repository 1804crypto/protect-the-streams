import { NextResponse } from 'next/server';

/**
 * POST /api/auth/logout
 * Clears the pts_session cookie to end the user's session.
 */
export async function POST() {
    const response = NextResponse.json({ success: true });

    response.cookies.set('pts_session', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 0, // Expire immediately
        path: '/',
    });

    return response;
}
