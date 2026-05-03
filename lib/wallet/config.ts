/*
 * lib/wallet/config.ts
 *
 * RainbowKit + wagmi config for Price Discussion.
 *
 * Mainnet only — no testnets in the launch cut. Brendon deploys
 * directly to mainnet; PD's contracts (PDFactory, PDCollection,
 * PDStickers, PaymentSplitter) are mainnet-bound.
 *
 * projectId is sourced from process.env.NEXT_PUBLIC_WC_PROJECT_ID
 * (WalletConnect Cloud free tier). NEVER hardcode — Brendon adds
 * the env var in Vercel after this ship goes green.
 *
 * ssr: true is required for Next.js 14 App Router — RainbowKit
 * uses cookieStorage to hydrate wallet state without flashing the
 * disconnected UI on first paint.
 */

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet } from 'wagmi/chains';

const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? '';

export const wagmiConfig = getDefaultConfig({
    appName: 'Price Discussion',
    projectId,
    chains: [mainnet],
    ssr: true,
});
