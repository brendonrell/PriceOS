/*
 * wagmiConfig — Launch Cut wallet stack.
 *
 * RainbowKit's `getDefaultConfig` bundles wagmi connectors (injected,
 * WalletConnect, Coinbase, etc.), default transports, and the
 * appName/appDescription metadata that wallets surface when prompting
 * the user. Everything ships through the WalletConnect Cloud
 * `projectId` — required by the WalletConnect connector even for
 * non-WC wallets (RainbowKit also uses it for analytics).
 *
 * The projectId comes from `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`,
 * which Brendon needs to set in Vercel (all three environments) before
 * the connect modal will show WalletConnect-class wallets. Missing
 * projectId still allows browser-extension wallets (MetaMask /
 * Rainbow Browser / etc.) to connect via the injected connector — the
 * UX just degrades for users on mobile / no extension.
 *
 * `ssr: true` tells wagmi to render a stable shape during SSR
 * (everyone disconnected on the server) and hydrate from
 * localStorage on the client. We accept one paint of "Connect" before
 * hydration restores the address pill — same behaviour Coinbase /
 * Uniswap / OpenSea ship with on Next.js App Router.
 *
 * Mainnet-only at launch — Kiki + every other PD project deploys to
 * Ethereum mainnet. Multi-chain support lands when a project ships
 * on a different L1/L2.
 */

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet } from 'wagmi/chains';

const PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? '';

export const wagmiConfig = getDefaultConfig({
    appName: 'Price Discussion',
    appDescription:
        'A web3 social platform where the community discussing secondary prices is the product.',
    appUrl: 'https://pricediscussion.com',
    projectId: PROJECT_ID,
    chains: [mainnet],
    ssr: true,
});
