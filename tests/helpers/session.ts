// tests/helpers/session.ts — build a REAL sealed SIWE session cookie (same
// iron-session crypto the app uses) and a next/headers cookie-store stand-in.
// Test files activate it with:
//   vi.mock('next/headers', () => import('./helpers/session').then(m => m.headersMock()))

import { sealData } from 'iron-session';

export const TEST_SECRET = 'test-session-secret-at-least-32-chars!!';
export const COOKIE_NAME = 'pd_siwe_session';

let currentCookie: string | null = null;

export async function signInAs(address: string): Promise<void> {
  currentCookie = await sealData({ address }, { password: TEST_SECRET, ttl: 60 * 60 * 24 * 14 });
}

export function signOut(): void {
  currentCookie = null;
}

/** Shape-compatible stand-in for next/headers' cookies(). */
export function cookieStore() {
  return {
    get(name: string) {
      if (name === COOKIE_NAME && currentCookie) return { name, value: currentCookie };
      return undefined;
    },
    set() {
      /* sessions are read-only in these tests */
    },
    getAll() {
      return currentCookie ? [{ name: COOKIE_NAME, value: currentCookie }] : [];
    },
  };
}

export function headersMock() {
  return {
    cookies: async () => cookieStore(),
    headers: async () => new Headers(),
  };
}
