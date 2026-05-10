/*
 * wagmiConfig — Launch Cut wallet stack.
 *
 * Uses RainbowKit's `connectorsForWallets` so the modal renders proper
 * branded wallet entries (icons, deep-links, install URLs, etc.) — raw
 * wagmi connectors don't carry the metadata RainbowKit's UI needs, which
 * is why a previous iteration of this file shipped an empty modal.
 *
 * Wallet roster:
 *   - injectedWallet     — any EIP-1193 wallet exposed as window.ethereum
 *   - metaMaskWallet     — MetaMask (extension on desktop, deep-link on mobile)
 *   - rainbowWallet      — Rainbow (extension on desktop, deep-link on mobile)
 *   - coinbaseWallet     — Coinbase Wallet (extension + mobile passkey)
 *   - walletConnectWallet — generic WC scan-QR fallback for any mobile wallet
 *
 * `projectId` comes from `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`. RainbowKit
 * uses it for the WalletConnect-based wallet entries (rainbowWallet,
 * walletConnectWallet, and metaMaskWallet's mobile deep-link). If the env
 * var isn't injected at build time, fall back to a placeholder string so
 * `connectorsForWallets` doesn't throw at SSG — those specific wallets
 * just won't connect at runtime if the placeholder is used. The modal
 * itself still renders.
 *
 * Mainnet-only at launch. `ssr: true` keeps wagmi's SSR-safe rendering.
 */

import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
    coinbaseWallet,
    injectedWallet,
    metaMaskWallet,
    rainbowWallet,
    walletConnectWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { createConfig, http } from 'wagmi';
import { mainnet } from 'wagmi/chains';

const projectId =
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? 'pd-launch-cut';

const connectors = connectorsForWallets(
    [
        {
            groupName: 'Popular',
            wallets: [
                injectedWallet,
                metaMaskWallet,
                rainbowWallet,
                coinbaseWallet,
                walletConnectWallet,
            ],
        },
    ],
    {
        appName: 'Price Discussion',
        appDescription:
            'A web3 social platform where the community discussing secondary prices is the product.',
        appUrl: 'https://pricediscussion.com',
        projectId,
    }
);

export const wagmiConfig = createConfig({
    chains: [mainnet],
    connectors,
    transports: {
        [mainnet.id]: http(),
    },
    ssr: true,
});
