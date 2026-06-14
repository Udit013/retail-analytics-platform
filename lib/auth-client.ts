'use client';
import { createAuthClient } from 'better-auth/react';

// No baseURL — uses the same origin as the page, works on any deployment URL
export const authClient = createAuthClient();

export const { signIn, signOut, useSession } = authClient;
