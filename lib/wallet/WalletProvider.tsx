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
 * IMPORTANT — lazy client-only init:
 *
 * RainbowKit's getDefaultConfig() validates the WalletConnect
 * projectId at call time and throws if it's missing. Next.js
 * prerenders /_not-found at build, which would invoke that check
 * with no env var present and crash the build. We dodge that by
 * creating the config inside a useState initializer that early-
 * returns on the server (typeof window === 'undefined'). Server
 * render returns children as-is; the wallet stack only mounts
 * after hydration.
 *
 * Trade-off: no SSR cookie hydration for wallet state — every page
 * load briefly shows the disconnected state before the wallet
 * provider mounts. Acceptable for launch cut. Re-enable real SSR
 * once a permanent NEXT_PUBLIC_WC_PROJECT_ID is set in Vercel.
 *
 * Theme is RainbowKit's darkTheme with the Hothurt accent (#FF0055)
 * so the modal CTAs match the rest of PD's brand vocabulary.
 */

import { type ReactNode, useState, useEffect } from 'react';
import { WagmiProvider, type Config } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
    RainbowKitProvider,
    darkTheme,
    getDefaultConfig,
} from '@rainbow-me/rainbowkit';
import { mainnet } from 'wagmi/chains';
import '@rainbow-me/rainbowkit/styles.css';

const WC_PROJECT_ID =
    process.env.NEXT_PUBLIC_WC_PROJECT_ID || 'PD_PLACEHOLDER_PROJECT_ID';

export function WalletProvider({ children }: { children: ReactNode }) {
    // Guard server render — getDefaultConfig throws on missing
    // projectId, which would crash Next.js's build-time prerender
    // of /_not-found. By initializing inside useState with a
    // typeof-window check, the config is only created client-side
    // after hydration.
    const [config] = useState<Config | null>(() => {
        if (typeof window === 'undefined') return null;
        return getDefaultConfig({
            appName: 'Price Discussion',
            projectId: WC_PROJECT_ID,
            chains: [mainnet],
            ssr: false,
        });
    });

    const [queryClient] = useState(() => new QueryClient());
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Server + first client paint: render children unwrapped. The
    // wallet stack pops in on hydration. TopBarConnect already
    // guards against the unmounted state via its `mounted` flag.
    if (!mounted || !config) {
        return <>{children}</>;
    }

    return (
        <WagmiProvider config={config}>
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
