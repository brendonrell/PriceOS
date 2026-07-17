'use client';

/*
 * /deploy — Brendon's one-thumb MAINNET launcher (private tool page).
 *
 * Deploys the complete PD contract stack to ETHEREUM MAINNET from a phone
 * wallet (Rainbow via WalletConnect / injected), in the wired order:
 *
 *   1. PDLibraryRegistry            (no args)
 *   2. PDFactory                    (admin, wallets, registry, fee corridor)
 *   3. registry.wireFactory(factory) — one-shot bind
 *   4. PDStickers                   (admin, factory — platform fees read live;
 *                                    deploys its own solo StickerSplitter vault)
 *
 * That is the ENTIRE top-level surface: PDProject + PaymentSplitter deploy
 * per-project through the factory, collab StickerSplitter vaults through
 * the stickers shop. After step 4 nothing else ever needs deploying.
 *
 * Self-contained wallet stack: its OWN wagmi config (mainnet-only, same
 * RainbowKit roster + WalletConnect projectId as the app) mounted locally,
 * with a SEPARATE cookie key so it can never touch the live app's
 * wallet state. Progress persists in localStorage so the iOS Safari
 * deep-link round-trip to Rainbow can't lose a half-done deploy.
 *
 * Bytecode + ABIs come from lib/deploy/artifacts.json, exported verbatim
 * from the pd-contracts build (solc 0.8.24, via-ir, 200 runs) — what you
 * deploy here is byte-for-byte what the test suite + audits proved.
 */

import { useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
    ConnectButton,
    RainbowKitProvider,
    connectorsForWallets,
    darkTheme,
} from '@rainbow-me/rainbowkit';
import {
    coinbaseWallet,
    injectedWallet,
    metaMaskWallet,
    rainbowWallet,
    walletConnectWallet,
} from '@rainbow-me/rainbowkit/wallets';
import {
    WagmiProvider,
    cookieStorage,
    createConfig,
    createStorage,
    http,
    useAccount,
    usePublicClient,
    useSwitchChain,
    useWalletClient,
} from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { parseEther, type Abi, type Address, type Hex } from 'viem';
import '@rainbow-me/rainbowkit/styles.css';

import artifacts from '../../lib/deploy/artifacts.json';
import { useGasData } from '../../lib/hooks/useGasData';

/* Gas units per transaction, measured from the audited pd-contracts build
   (forge gas report @ repo HEAD — the same build artifacts.json is exported
   from). The wallet shows the exact number at signing; these price the plan. */
const GAS_UNITS: Record<string, number> = {
    registry: 930_703,   // PDLibraryRegistry deployment
    factory: 5_448_280,  // PDFactory deployment (embeds PDProject + PaymentSplitter)
    wire: 67_000,        // registry.wireFactory tx (45,341 execution + intrinsic/calldata)
    stickers: 5_220_811, // PDStickers deployment (deploys its solo vault inside)
};

/* Same Reown Cloud project as lib/wallet/wagmiConfig.ts (public value). */
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
        appName: 'PD Mainnet Deploy',
        appDescription: 'Deploy the Price Discussion contract stack to Ethereum mainnet.',
        appUrl: 'https://pricediscussion.com',
        projectId,
    }
);

const deployConfig = createConfig({
    chains: [mainnet],
    connectors,
    transports: { [mainnet.id]: http() },
    ssr: true,
    storage: createStorage({ storage: cookieStorage, key: 'pd-mainnet-deploy-wagmi' }),
});

const queryClient = new QueryClient();

const STORE_KEY = 'pd-mainnet-deploy-v1';

type DeployState = {
    registry?: Address;
    factory?: Address;
    wired?: boolean;
    stickers?: Address;
    txs: Record<string, string>;
};

const EMPTY: DeployState = { txs: {} };

function loadState(): DeployState {
    if (typeof window === 'undefined') return EMPTY;
    try {
        return { ...EMPTY, ...JSON.parse(localStorage.getItem(STORE_KEY) || '{}') };
    } catch {
        return EMPTY;
    }
}

const S: Record<string, React.CSSProperties> = {
    page: {
        minHeight: '100vh', background: '#0a0a0a', color: '#fafafa',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace',
        padding: '20px 16px 80px', maxWidth: 560, margin: '0 auto',
    },
    h1: { fontSize: 20, letterSpacing: 2, margin: '8px 0 2px' },
    sub: { fontSize: 12, opacity: 0.65, marginBottom: 18 },
    card: {
        border: '1px solid #2a2a2a', borderRadius: 12, padding: 14,
        marginBottom: 12, background: '#111',
    },
    stepTitle: { fontSize: 13, letterSpacing: 1, marginBottom: 8 },
    label: { fontSize: 10, opacity: 0.6, display: 'block', marginTop: 8 },
    input: {
        width: '100%', boxSizing: 'border-box' as const, background: '#0a0a0a',
        border: '1px solid #333', borderRadius: 8, color: '#fafafa',
        fontFamily: 'inherit', fontSize: 12, padding: '8px 10px', marginTop: 3,
    },
    btn: {
        width: '100%', padding: '12px 14px', marginTop: 12, borderRadius: 10,
        border: 'none', background: '#fafafa', color: '#0a0a0a',
        fontFamily: 'inherit', fontSize: 13, fontWeight: 700, letterSpacing: 1,
        cursor: 'pointer',
    },
    btnDone: { background: '#1d3a26', color: '#7fe0a0', cursor: 'default' },
    addr: { fontSize: 11, wordBreak: 'break-all' as const, marginTop: 8, opacity: 0.9 },
    tx: { fontSize: 10, wordBreak: 'break-all' as const, opacity: 0.55, marginTop: 4 },
    err: { color: '#ff7676', fontSize: 11, marginTop: 8, wordBreak: 'break-word' as const },
    gasRow: { fontSize: 12, marginTop: 6 },
    gasTotal: { fontSize: 13, fontWeight: 700, marginTop: 10 },
    gasAt: { fontSize: 11, opacity: 0.65, marginTop: 8 },
    spin: {
        display: 'inline-block', width: 12, height: 12, marginRight: 8,
        border: '2px solid #0a0a0a', borderTopColor: 'transparent',
        borderRadius: '50%', animation: 'pdspin 0.7s linear infinite',
        verticalAlign: '-2px',
    },
};

function Deployer() {
    const { address, isConnected, chainId } = useAccount();
    const { data: walletClient } = useWalletClient();
    const publicClient = usePublicClient();

    const [state, setState] = useState<DeployState>(EMPTY);
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Factory params — every wallet defaults to the connected address.
    const [platformWallet, setPlatformWallet] = useState('');
    const [storageWallet, setStorageWallet] = useState('');
    const [writer, setWriter] = useState('');
    const [feeFloor, setFeeFloor] = useState('0.0001');
    const [feeCeiling, setFeeCeiling] = useState('0.01');
    const [feeInitial, setFeeInitial] = useState('0.0007');

    useEffect(() => setState(loadState()), []);
    useEffect(() => {
        if (address) {
            setPlatformWallet((v) => v || address);
            setStorageWallet((v) => v || address);
            setWriter((v) => v || address);
        }
    }, [address]);

    const save = (next: DeployState) => {
        setState(next);
        localStorage.setItem(STORE_KEY, JSON.stringify(next));
    };

    const wrongChain = isConnected && chainId !== mainnet.id;

    // Auto-prompt the wallet to switch to mainnet the moment it connects on
    // the wrong chain — the banner + connect-pill switcher stay as fallback.
    const { switchChain } = useSwitchChain();
    useEffect(() => {
        if (wrongChain) switchChain({ chainId: mainnet.id });
    }, [wrongChain, switchChain]);

    async function run(step: string, fn: () => Promise<Partial<DeployState>>) {
        if (!walletClient || !publicClient) return;
        setBusy(step);
        setError(null);
        try {
            const patch = await fn();
            save({ ...state, ...patch, txs: { ...state.txs, ...(patch.txs || {}) } });
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            setError(msg.split('\n')[0].slice(0, 240));
        } finally {
            setBusy(null);
        }
    }

    async function deployContract(name: keyof typeof artifacts, args: unknown[]): Promise<{ addr: Address; tx: string }> {
        const art = artifacts[name] as { abi: Abi; bytecode: Hex };
        const hash = await walletClient!.deployContract({
            abi: art.abi,
            bytecode: art.bytecode,
            args,
            chain: mainnet,
        });
        const receipt = await publicClient!.waitForTransactionReceipt({ hash });
        if (!receipt.contractAddress) throw new Error('no contract address in receipt');
        return { addr: receipt.contractAddress, tx: hash };
    }

    // Live gas pricing — same feed as the site's gas tracker (/api/gas).
    const { data: gas } = useGasData(true);
    const gwei = gas?.standardGwei ?? null;
    const ethUsd = gas?.ethUsd ?? null;
    const costEth = (units: number) => (gwei == null ? null : (units * gwei) / 1e9);
    const fmtRow = (units: number) => {
        const eth = costEth(units);
        if (eth == null) return `${units.toLocaleString()} gas`;
        const usd = ethUsd == null ? '' : ` · $${(eth * ethUsd).toFixed(2)}`;
        return `${units.toLocaleString()} gas · ${eth.toFixed(5)} ETH${usd}`;
    };
    const totalUnits = Object.values(GAS_UNITS).reduce((a, b) => a + b, 0);

    const steps = [
        {
            key: 'registry',
            title: '1 · LIBRARY REGISTRY',
            done: !!state.registry,
            ready: isConnected && !wrongChain,
            result: state.registry,
            action: () =>
                run('registry', async () => {
                    const { addr, tx } = await deployContract('PDLibraryRegistry', []);
                    return { registry: addr, txs: { registry: tx } };
                }),
        },
        {
            key: 'factory',
            title: '2 · FACTORY',
            done: !!state.factory,
            ready: !!state.registry,
            result: state.factory,
            action: () =>
                run('factory', async () => {
                    const { addr, tx } = await deployContract('PDFactory', [
                        address,
                        platformWallet,
                        storageWallet,
                        writer,
                        state.registry,
                        parseEther(feeFloor),
                        parseEther(feeCeiling),
                        parseEther(feeInitial),
                    ]);
                    return { factory: addr, txs: { factory: tx } };
                }),
        },
        {
            key: 'wire',
            title: '3 · WIRE REGISTRY → FACTORY',
            done: !!state.wired,
            ready: !!state.registry && !!state.factory,
            result: state.wired ? 'wired' : undefined,
            action: () =>
                run('wire', async () => {
                    const art = artifacts.PDLibraryRegistry as { abi: Abi };
                    const hash = await walletClient!.writeContract({
                        address: state.registry!,
                        abi: art.abi,
                        functionName: 'wireFactory',
                        args: [state.factory],
                        chain: mainnet,
                    });
                    await publicClient!.waitForTransactionReceipt({ hash });
                    return { wired: true, txs: { wire: hash } };
                }),
        },
        {
            key: 'stickers',
            title: '4 · STICKERS',
            done: !!state.stickers,
            ready: isConnected && !wrongChain && !!state.factory,
            result: state.stickers,
            action: () =>
                run('stickers', async () => {
                    /* Factory second: the shop reads platformWallet() live for
                       its 5% primary cut and the vaults' 2% royalty leg. */
                    const { addr, tx } = await deployContract('PDStickers', [address, state.factory]);
                    return { stickers: addr, txs: { stickers: tx } };
                }),
        },
    ];

    const allDone = steps.every((s) => s.done);

    return (
        <div style={S.page}>
            <style>{'@keyframes pdspin{to{transform:rotate(360deg)}}'}</style>
            <div style={S.h1}>PD // MAINNET DEPLOY</div>
            <div style={S.sub}>registry → factory → wire → stickers · one tap each · REAL ETH</div>

            <div style={S.card}>
                <ConnectButton showBalance={false} chainStatus="full" />
                {wrongChain && <div style={S.err}>Switch the wallet to Ethereum mainnet first.</div>}
            </div>

            <div style={S.card}>
                <div style={S.stepTitle}>FACTORY PARAMS</div>
                <label style={S.label}>admin (connected wallet)</label>
                <input style={S.input} value={address || ''} disabled />
                <label style={S.label}>platform wallet</label>
                <input style={S.input} value={platformWallet} onChange={(e) => setPlatformWallet(e.target.value)} />
                <label style={S.label}>storage-fee wallet</label>
                <input style={S.input} value={storageWallet} onChange={(e) => setStorageWallet(e.target.value)} />
                <label style={S.label}>thumbnail writer</label>
                <input style={S.input} value={writer} onChange={(e) => setWriter(e.target.value)} />
                <label style={S.label}>storage fee: floor / ceiling / initial (ETH)</label>
                <div style={{ display: 'flex', gap: 6 }}>
                    <input style={S.input} value={feeFloor} onChange={(e) => setFeeFloor(e.target.value)} />
                    <input style={S.input} value={feeCeiling} onChange={(e) => setFeeCeiling(e.target.value)} />
                    <input style={S.input} value={feeInitial} onChange={(e) => setFeeInitial(e.target.value)} />
                </div>
            </div>

            <div style={S.card}>
                <div style={S.stepTitle}>ESTIMATED GAS</div>
                <div style={S.gasRow}>1 · registry — {fmtRow(GAS_UNITS.registry)}</div>
                <div style={S.gasRow}>2 · factory — {fmtRow(GAS_UNITS.factory)}</div>
                <div style={S.gasRow}>3 · wire — {fmtRow(GAS_UNITS.wire)}</div>
                <div style={S.gasRow}>4 · stickers — {fmtRow(GAS_UNITS.stickers)}</div>
                <div style={S.gasTotal}>TOTAL — {fmtRow(totalUnits)}</div>
                <div style={S.gasAt}>
                    {gwei == null
                        ? 'fetching current gas…'
                        : `@ ${gwei} gwei · ETH $${ethUsd == null ? '—' : ethUsd.toLocaleString()} · live, refreshes every 30s`}
                </div>
            </div>

            {steps.map((s) => (
                <div key={s.key} style={S.card}>
                    <div style={S.stepTitle}>{s.title}</div>
                    {s.done ? (
                        <>
                            <button style={{ ...S.btn, ...S.btnDone }} disabled>DEPLOYED ✦</button>
                            {s.result && s.result !== 'wired' && <div style={S.addr}>{s.result}</div>}
                            {state.txs[s.key] && (
                                <a
                                    style={{ ...S.tx, color: '#8ab4ff', display: 'block' }}
                                    href={`https://etherscan.io/tx/${state.txs[s.key]}`}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    {state.txs[s.key]}
                                </a>
                            )}
                        </>
                    ) : (
                        <button
                            style={{ ...S.btn, opacity: s.ready && !busy ? 1 : 0.4 }}
                            disabled={!s.ready || !!busy}
                            onClick={s.action}
                        >
                            {busy === s.key ? (
                                <>
                                    <span style={S.spin} />
                                    CONFIRM IN WALLET…
                                </>
                            ) : (
                                'DEPLOY'
                            )}
                        </button>
                    )}
                </div>
            ))}

            {error && (
                <div style={S.card}>
                    <div style={S.err}>{error}</div>
                </div>
            )}

            {allDone && (
                <div style={{ ...S.card, borderColor: '#2e5c3c' }}>
                    <div style={S.stepTitle}>ALL DEPLOYED — MAINNET ADDRESSES</div>
                    <div style={S.addr}>registry: {state.registry}</div>
                    <div style={S.addr}>factory: {state.factory}</div>
                    <div style={S.addr}>stickers: {state.stickers}</div>
                    <button
                        style={S.btn}
                        onClick={() =>
                            navigator.clipboard.writeText(
                                `PD Mainnet\nregistry: ${state.registry}\nfactory: ${state.factory}\nstickers: ${state.stickers}`
                            )
                        }
                    >
                        COPY ALL
                    </button>
                </div>
            )}

            <button
                style={{ ...S.btn, background: '#1a1a1a', color: '#888', marginTop: 20 }}
                onClick={() => {
                    localStorage.removeItem(STORE_KEY);
                    save({ ...EMPTY });
                }}
            >
                RESET (start a fresh deploy)
            </button>
        </div>
    );
}

export default function DeployPage() {
    // Local, mainnet-only wallet stack with its own cookie key — never
    // touches the app's session wallet state.
    const theme = useMemo(() => darkTheme({ accentColor: '#fafafa', accentColorForeground: '#0a0a0a' }), []);
    return (
        <WagmiProvider config={deployConfig}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider theme={theme} modalSize="compact">
                    <Deployer />
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}
