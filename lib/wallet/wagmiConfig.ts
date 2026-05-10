/*
 * wagmiConfig — Launch Cut wallet stack.
 *
 * Manual `createConfig` instead of RainbowKit's `getDefaultConfig`.
 * `getDefaultConfig` requires a WalletConnect Cloud projectId at
 * build time and throws during SSG when missing — which blocked the
 * launch-cut build. This config sidesteps WalletConnect entirely:
 *
 *   - injected()       — MetaMask, Rainbow browser ext, any EIP-1193
 *                        wallet exposed as window.ethereum
 *   - coinbaseWallet() — Coinbase Wallet (extension + mobile passkey)
 *
 * RainbowKit's modal still renders, just showing the connectors above
 * instead of the full WalletConnect-class list (mobile QR wallets).
 * Acceptable launch-cut tradeoff — desktop users with browser
 * extensions cover the early audience, and WalletConnect adds back
 * later via `walletConnect()` connector when the projectId env var
 * is sorted.
 *
 * Mainnet-only at launch — Kiki + every PD project deploys to
 * Ethereum mainnet. Multi-chain support lands when a project ships
 * on a different L1/L2.
 *
 * `ssr: true` keeps wagmi's SSR-safe rendering shape (everyone
 * disconnected on the server, hydrate from localStorage on the
 * client).
 */

import { createConfig, http } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { coinbaseWallet, injected } from 'wagmi/connectors';

export const wagmiConfig = createConfig({
    chains: [mainnet],
    connectors: [
        injected(),
        coinbaseWallet({ appName: 'Price Discussion' }),
    ],
    transports: {
        [mainnet.id]: http(),
    },
    ssr: true,
});
