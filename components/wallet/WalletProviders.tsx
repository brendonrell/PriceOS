'use client';

/*
 * WalletProviders — top-of-tree client wrapper for the wallet stack.
 *
 * Mounts in app/layout.tsx OUTSIDE the existing PD provider tree so
 * the navbar (which lives inside PriceOSShell, which lives inside the
 * existing tree) can call wagmi hooks + useConnectModal + useAuth.
 *
 * Provider order (outer → inner):
 *   1. WagmiProvider          — wallet connectors, address, signing
 *   2. QueryClientProvider    — react-query (wagmi v2 peer dep)
 *   3. RainbowKitProvider     — connect modal + chain selector
 *   4. AuthProvider           — SIWE flow on top of wagmi
 *   5. children               — existing PD provider tree + UI
 *
 * QueryClient lives in component state so the same instance survives
 * re-renders but a new Next.js page mount creates a fresh one. Per
 * react-query Next.js App Router guidance — module-singleton would
 * leak state between users on a server, useState makes it
 * client-instance scoped.
 *
 * RainbowKit theme matches PD's palette via overrides:
 *   - accentColor: Hothurt #FF0055 (PD brand red)
 *   - borderRadius: small (PD chrome uses 4px / 6px max)
 *
 * `darkTheme` is the base because PD's default theme is dark (#1a1a1a
 * bg). Theme switching post-hydration would be nice but the modal is
 * transient enough (open → connect → close in <5s) that one fixed
 * palette is fine for launch cut.
 *
 * `@rainbow-me/rainbowkit/styles.css` ships scoped class names
 * (compiled stylesheet, hash-suffixed selectors). Importing globally
 * is the documented pattern; the modal renders into a portal so its
 * styles don't bleed into PD's layout.
 */

import { useState, type ReactNode } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { wagmiConfig } from '../../lib/wallet/wagmiConfig';
import { AuthProvider } from '../../lib/state/AuthContext';

export function WalletProviders({ children }: { children: ReactNode }) {
    const [queryClient] = useState(() => new QueryClient());

    return (
        <WagmiProvider config={wagmiConfig}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider
                    theme={darkTheme({
                        accentColor: '#FF0055',
                        accentColorForeground: '#ffffff',
                        borderRadius: 'small',
                        fontStack: 'system',
                    })}
                    appInfo={{ appName: 'Price Discussion' }}
                    modalSize="compact"
                >
                    <AuthProvider>{children}</AuthProvider>
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}
