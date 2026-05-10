/*
 * wagmiConfig — Launch Cut wallet stack.
 *
 * Uses RainbowKit's `connectorsForWallets` so the modal renders proper
 * branded wallet entries (icons, deep-links, install URLs) — raw wagmi
 * connectors don't carry the metadata RainbowKit's UI needs, which is
 * why a previous iteration of this file shipped an empty modal.
 *
 * Wallet roster:
 *   - injectedWallet     — any EIP-1193 wallet exposed as window.ethereum
 *   - metaMaskWallet     — MetaMask (extension on desktop, deep-link on mobile)
 *   - rainbowWallet      — Rainbow (extension on desktop, deep-link on mobile)
 *   - coinbaseWallet     — Coinbase Wallet (extension + mobile passkey)
 *   - walletConnectWallet — generic WC scan-QR fallback for any mobile wallet
 *
 * `projectId` is the WalletConnect/Reown Cloud credential. Hardcoded
 * rather than read from process.env because Vercel Preview env-var
 * injection at build time wasn't reliable for us, and projectIds are
 * already public values (they ship in client-side JS regardless — no
 * secret to leak). Source: PD's Reown Cloud project (Configuration tab).
 * Rotate by replacing this string + redeploying.
 *
 * Mainnet-only at launch. `ssr: true` keeps wagmi's SSR-safe rendering
 * shape (everyone disconnected on the server, hydrate from localStorage
 * on the client).
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

const projectId = 'dddf23db294ed8117609933e1a6ae83c';

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
