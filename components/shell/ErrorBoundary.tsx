'use client';

/*
 * ErrorBoundary — the per-feature safety net.
 *
 * Until this landed, the app had ZERO error boundaries: any render-phase
 * throw in any feature bubbled to the React root with nothing to catch it,
 * so a single faulty surface white-screened the WHOLE site (Brendon,
 * 2026-06-13 — "near half our features when turned on crash the site … it
 * must be something deeper"). It was: one fault anywhere = total takedown.
 *
 * This boundary wraps a single feature island (a modal, the navbar, the
 * backgrounds layer, …). When that island throws while rendering, the
 * boundary swaps in `fallback` (default: nothing) and lets the rest of the
 * app keep running. The crash is logged via componentDidCatch so it leaves
 * evidence instead of erasing itself — the old behaviour made bugs
 * un-reproducible because the screen that crashed was gone.
 *
 * Scope note: React error boundaries only catch render-phase errors — NOT
 * errors thrown inside event handlers or async callbacks (those never
 * unmount the tree, so they don't need a net). This is the standard React
 * mechanism; pairs with app/error.tsx (routed-page crashes) and
 * app/global-error.tsx (root-layout crashes).
 */

import { Component, type ReactNode, type ErrorInfo } from 'react';
import { initTelemetry, reportClientError } from '@/lib/telemetry/client';

interface Props {
    children: ReactNode;
    /* What to show when the wrapped island crashes. Defaults to nothing —
       a dead modal/background simply doesn't appear, and the rest of the
       app is untouched. Pass an element for surfaces that should show a
       visible "didn't load" placeholder. */
    fallback?: ReactNode;
    /* Optional label so the logged crash names the surface that died. */
    name?: string;
}

interface State {
    hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false };

    static getDerivedStateFromError(): State {
        return { hasError: true };
    }

    componentDidMount() {
        // Idempotent: the first mounted boundary installs the window-level
        // error + unhandled-rejection beacons (lib/telemetry/client), so
        // uncaught crashes ANYWHERE — not just render-phase — get reported.
        initTelemetry();
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        // Keep the evidence. A contained crash that logs nothing is a bug
        // we can never find again.
         
        console.error(
            `[ErrorBoundary${this.props.name ? `: ${this.props.name}` : ''}] contained a crash:`,
            error,
            info.componentStack,
        );
        // …and ship it home so prod crashes are visible (§3.3).
        reportClientError(error, this.props.name ?? 'boundary');
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback ?? null;
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
