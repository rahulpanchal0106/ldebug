import { cookies } from 'next/headers';

const SESSION_COOKIE_NAME = 'auth_session';
const SESSION_DURATION_DAYS = 10;

// Simple password check (in production, use proper hashing)
const CORRECT_PASSWORD = process.env.AUTH_PASSWORD || 'admin123'; // Change this!

export async function verifyPassword(password: string): Promise<boolean> {
    return password === CORRECT_PASSWORD;
}

export async function createSession(): Promise<void> {
    const cookieStore = await cookies();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);
    
    cookieStore.set(SESSION_COOKIE_NAME, 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        expires: expiresAt,
        path: '/',
    });
}

export async function deleteSession(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getSession(): Promise<boolean> {
    const cookieStore = await cookies();
    const session = cookieStore.get(SESSION_COOKIE_NAME);
    return session?.value === 'authenticated';
}

