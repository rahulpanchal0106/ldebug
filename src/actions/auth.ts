'use server'

import { verifyPassword, createSession, deleteSession } from '@/src/lib/auth';

export async function loginAction(password: string) {
    const isValid = await verifyPassword(password);
    
    if (isValid) {
        await createSession();
        return { success: true };
    }
    
    return { success: false, error: 'Invalid password' };
}

export async function logoutAction() {
    await deleteSession();
    return { success: true };
}

