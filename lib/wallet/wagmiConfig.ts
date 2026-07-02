/*
 * wagmiConfig — Launch Cut wallet stack.
 *
 * Two pieces of context worth keeping in mind here:
 *
 * 1. `connectorsForWallets` (instead of `getDefaultConfig`) is what
 *    populates RainbowKit's modal with branded wallet entries. Raw
 *    wagmi connectors don't carry icons / deep-link metadata / install
 *    URLs, which is why the modal showed empty in an earlier shipped
 *    iteration of this file.
 *
 * 2. `cookieStorage` (instead of the default localStorage) means wagmi
 *    persists its connection state in a server-readable cookie. This
 *    matters mostly for iOS Safari, which aggressively kills the JS
 *    context of background tabs — including during the deep-link
 *    round-trip from a wallet app back to the browser. With
 *    cookieStorage the connection survives those kills because the
 *    state lives outside the page, and the layout's server component
 *    can pre-populate `initialState` so the first paint already shows
 *    the user as connected.
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
import { cookieStorage, createConfig, createStorage, http } from 'wagmi';
import { mainnet, sepolia } from 'wagmi/chains';

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

/* Env-gated chain profile (docs/sepolia-test-phase.md §4 / Phase C): the
   Sepolia test phase flips NEXT_PUBLIC_CHAIN_ID=11155111 on the preview so
   the same wallet stack signs against testnet; mainnet stays the default
   and neither profile clobbers the other. */
const onSepolia = process.env.NEXT_PUBLIC_CHAIN_ID === '11155111';

export const wagmiConfig = onSepolia
    ? createConfig({
        chains: [sepolia],
        connectors,
        transports: {
            [sepolia.id]: http(),
        },
        ssr: true,
        storage: createStorage({
            storage: cookieStorage,
        }),
    })
    : createConfig({
        chains: [mainnet],
        connectors,
        transports: {
            [mainnet.id]: http(),
        },
        ssr: true,
        storage: createStorage({
            storage: cookieStorage,
        }),
    });
