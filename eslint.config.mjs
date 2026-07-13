// ESLint baseline (2026-07-13, hardening item 3). Flat config, Next.js preset.
// Tuned to THIS codebase's conventions rather than fighting them:
//  - lib/art/** is excluded: the 127-engine fleet is deliberately @ts-nocheck
//    (its correctness gate is the pixel-hash harness in tools/engine-hashes,
//    not the type system — Architect Report §4.2).
//  - no-explicit-any stays off; the handful of `any`s are measured escapes.
import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

export default [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    ignores: ['lib/art/**', '.next/**', '.open-next/**', 'node_modules/**', 'tools/**', 'workers/**'],
  },
  {
    rules: {
      // The codebase logs deliberately in a few guarded spots; the convention
      // is enforced by review, not a blanket ban.
      'no-console': 'off',
      // Measured escapes; the codebase has ~15 `any`s in 177k lines, each
      // carrying a disable comment. Keep the rule advisory, not blocking.
      '@typescript-eslint/no-explicit-any': 'off',
      // 69 unused vars/imports across the codebase — real cleanup, queued as
      // follow-up; warn (visible in every run) rather than block the gate.
      '@typescript-eslint/no-unused-vars': 'warn',
      // Internal <a href> navigation is deliberate on several surfaces
      // (full-reload semantics on gesture pages); converting to <Link> is a
      // product-behavior change, not a lint fix — Brendon's call, not ours.
      '@next/next/no-html-link-for-pages': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      // <img> is used on purpose (R2-served PNG previews, no next/image on
      // Workers); the perf trade-off is a settled platform decision.
      '@next/next/no-img-element': 'off',
    },
  },
];
