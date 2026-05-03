'use client';

/*
 * lib/wallet/WalletProvider.tsx
 *
 * Wraps the app in the wagmi + react-query + RainbowKit stack.
 *
 * Mounts OUTSIDE CollectionProvider in app/layout.tsx — collection
 * eventually reads on-chain state via wagmi hooks (token ownership,
 * cart settlement, mint state), so wallet must be available first.
 *
 * Theme is RainbowKit's darkTheme with the Hothurt accent (#FF0055)
 * so the modal CTAs match the rest of PD's brand vocabulary. Border
 * radius set to "small" — RainbowKit doesn't expose a true zero,
 * "small" is the closest match to PD's hard-edge button discipline.
 *
 * QueryClient is created with useState so the same instance is
 * reused across re-renders (per react-query docs for Next.js).
 */

import { type ReactNode, useState } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { wagmiConfig } from './config';

export function WalletProvider({ children }: { children: ReactNode }) {
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
                        overlayBlur: 'small',
                    })}
                >
                    {children}
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}
