import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname) },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // Route handlers read env at request time; tests point them at the local
    // mock PostgREST server (tests/helpers/mockSupabase.ts) — never at prod.
    env: {
      NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54999',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
      SIWE_SESSION_SECRET: 'test-session-secret-at-least-32-chars!!',
      ALCHEMY_WEBHOOK_SIGNING_KEY: 'test-webhook-signing-key',
    },
  },
});
