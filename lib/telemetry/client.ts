'use client';

/*
 * lib/telemetry/client.ts — the browser half of error visibility (§3.3).
 *
 * Registers window-level hooks ONCE (uncaught errors + unhandled promise
 * rejections) and gives ErrorBoundary a report function. Every report is a
 * tiny fire-and-forget beacon to /api/telemetry. Local guards keep it
 * polite: per-session de-dupe, a hard cap of 10 reports per page lifetime,
 * and sendBeacon/keepalive so reports survive navigation.
 */

const MAX_REPORTS_PER_SESSION = 10;
const seen = new Set<string>();
let sent = 0;
let installed = false;

function beacon(payload: Record<string, unknown>): void {
  try {
    const body = JSON.stringify(payload);
    if (body.length > 4000) return;
    if (navigator.sendBeacon?.('/api/telemetry', new Blob([body], { type: 'application/json' }))) return;
    void fetch('/api/telemetry', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* never throw from telemetry */
  }
}

export function reportClientError(err: unknown, surface?: string): void {
  try {
    if (sent >= MAX_REPORTS_PER_SESSION) return;
    const message =
      (err instanceof Error ? err.message : typeof err === 'string' ? err : 'unknown error').slice(0, 400);
    const key = `${surface ?? ''}|${message}`;
    if (seen.has(key)) return;
    seen.add(key);
    sent++;
    beacon({
      message: surface ? `[${surface}] ${message}` : message,
      stackHead: err instanceof Error ? (err.stack ?? '').split('\n').slice(0, 6).join('\n') : undefined,
      route: window.location.pathname,
      buildId: process.env.NEXT_PUBLIC_BUILD_ID ?? undefined,
    });
  } catch {
    /* ignore */
  }
}

/** Idempotent — call from any always-mounted client island. */
export function initTelemetry(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  window.addEventListener('error', (e) => {
    reportClientError(e.error ?? e.message, 'window');
  });
  window.addEventListener('unhandledrejection', (e) => {
    reportClientError(e.reason ?? 'unhandled rejection', 'promise');
  });
}
