'use client';

/*
 * /deploy — Brendon's one-thumb contract-stack launcher (private tool page).
 *
 * Deploys the complete PD contract stack — Sepolia rehearsal or Ethereum
 * mainnet, picked at the top — from a phone wallet (Rainbow via
 * WalletConnect / injected), in the wired order:
 *
 *   1. PDLibraryRegistry            (no args)
 *   2. PDFactory                    (admin, wallets, registry, fee corridor;
 *                                    spawns its own PDProjectDeployer arm)
 *   3. registry.wireFactory(factory) — one-shot bind
 *   4. PDStickers                   (admin, factory — platform fees read live;
 *                                    deploys its own solo StickerSplitter vault)
 *   5. PDKeychainShapes             (no args — part store #1)
 *   6. PDKeychainFaces              (no args — part store #2)
 *   7. PDKeychainTraits             (no args — part store #3)
 *   8. PDKeychainRenderer           (shapes, faces, traits — immutable refs)
 *   9. PDKeychains                  (factory, renderer, royalty receiver, price)
 *  10. keychains.setActive(true)    — turn the crank machine ON
 *
 * That is the ENTIRE top-level surface: PDProject + PaymentSplitter deploy
 * per-project through the factory's deployer arm, collab StickerSplitter
 * vaults through the stickers shop. After step 10 nothing else ever needs
 * deploying.
 *
 * Self-contained wallet stack: its OWN wagmi config (mainnet + Sepolia, same
 * RainbowKit roster + WalletConnect projectId as the app) mounted locally,
 * with a SEPARATE cookie key so it can never touch the live app's
 * wallet state. Progress persists in localStorage PER NETWORK so the iOS
 * Safari deep-link round-trip to Rainbow can't lose a half-done deploy, and
 * the Sepolia rehearsal never collides with the mainnet run.
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
import { mainnet, sepolia } from 'wagmi/chains';
import { parseEther, type Abi, type Address, type Hex } from 'viem';
import '@rainbow-me/rainbowkit/styles.css';

import artifacts from '../../lib/deploy/artifacts.json';
import { useGasData } from '../../lib/hooks/useGasData';

/* Gas units per transaction, measured from the audited pd-contracts build
   (forge gas report @ repo HEAD — the same build artifacts.json is exported
   from). The wallet shows the exact number at signing; these price the plan. */
const GAS_UNITS: Record<string, number> = {
    registry: 930_703,   // PDLibraryRegistry deployment
    factory: 7_392_592,  // PDFactory deployment (spawns its PDProjectDeployer arm)
    wire: 67_000,        // registry.wireFactory tx (45,341 execution + intrinsic/calldata)
    stickers: 5_220_811, // PDStickers deployment (deploys its solo vault inside)
    shapes: 1_596_638,   // PDKeychainShapes deployment (part store #1)
    faces: 4_911_695,    // PDKeychainFaces deployment (part store #2)
    traitsStore: 1_678_890, // PDKeychainTraits deployment (part store #3)
    renderer: 4_505_923, // PDKeychainRenderer deployment
    keychains: 2_521_614, // PDKeychains deployment
    machineOn: 70_000,   // keychains.setActive(true) (47,326 execution + intrinsic/calldata)
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
        appName: 'PD Deploy',
        appDescription: 'Deploy the Price Discussion contract stack.',
        appUrl: 'https://pricediscussion.com',
        projectId,
    }
);

const deployConfig = createConfig({
    chains: [mainnet, sepolia],
    connectors,
    transports: { [mainnet.id]: http(), [sepolia.id]: http() },
    ssr: true,
    storage: createStorage({ storage: cookieStorage, key: 'pd-mainnet-deploy-wagmi' }),
});

const queryClient = new QueryClient();

type Net = 'sepolia' | 'mainnet';

const NETS: Record<Net, { chain: typeof mainnet | typeof sepolia; storeKey: string; scan: string; label: string }> = {
    /* The mainnet store key predates the network switch — kept verbatim so a
       half-done mainnet run from the old page is never orphaned. */
    sepolia: { chain: sepolia, storeKey: 'pd-sepolia-deploy-v1', scan: 'https://sepolia.etherscan.io', label: 'SEPOLIA' },
    mainnet: { chain: mainnet, storeKey: 'pd-mainnet-deploy-v1', scan: 'https://etherscan.io', label: 'MAINNET' },
};

type DeployState = {
    registry?: Address;
    factory?: Address;
    wired?: boolean;
    stickers?: Address;
    shapes?: Address;
    faces?: Address;
    traitsStore?: Address;
    renderer?: Address;
    keychains?: Address;
    machineOn?: boolean;
    txs: Record<string, string>;
};

const EMPTY: DeployState = { txs: {} };

function loadState(key: string): DeployState {
    if (typeof window === 'undefined') return EMPTY;
    try {
        return { ...EMPTY, ...JSON.parse(localStorage.getItem(key) || '{}') };
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
    netRow: { display: 'flex', gap: 8, marginBottom: 12 },
    netBtn: {
        flex: 1, padding: '10px 0', borderRadius: 10, cursor: 'pointer',
        border: '1px solid #333', background: '#111', color: '#888',
        fontFamily: 'inherit', fontSize: 12, fontWeight: 700, letterSpacing: 1,
    },
    netBtnOn: { background: '#fafafa', color: '#0a0a0a', borderColor: '#fafafa' },
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

    /* Sepolia leads: the rehearsal is the next action, and mainnet — REAL
       ETH — is always an explicit tap, never the landing state. */
    const [net, setNet] = useState<Net>('sepolia');
    const N = NETS[net];

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

    // Keychain params — royalty receiver defaults to the connected address;
    // crank price is the app's canonical 0.01 ETH.
    const [keyRoyalty, setKeyRoyalty] = useState('');
    const [keyPrice, setKeyPrice] = useState('0.01');

    useEffect(() => setState(loadState(NETS[net].storeKey)), [net]);
    useEffect(() => {
        if (address) {
            setPlatformWallet((v) => v || address);
            setStorageWallet((v) => v || address);
            setWriter((v) => v || address);
            setKeyRoyalty((v) => v || address);
        }
    }, [address]);

    const save = (next: DeployState) => {
        setState(next);
        localStorage.setItem(N.storeKey, JSON.stringify(next));
    };

    const wrongChain = isConnected && chainId !== N.chain.id;

    // Auto-prompt the wallet to switch to the selected network the moment it
    // connects (or the toggle moves) on the wrong chain — the banner + the
    // connect-pill switcher stay as fallback.
    const { switchChain } = useSwitchChain();
    useEffect(() => {
        if (wrongChain) switchChain({ chainId: N.chain.id });
    }, [wrongChain, switchChain, N.chain.id]);

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
            chain: N.chain,
        });
        const receipt = await publicClient!.waitForTransactionReceipt({ hash });
        if (!receipt.contractAddress) throw new Error('no contract address in receipt');
        return { addr: receipt.contractAddress, tx: hash };
    }

    // Live gas pricing — same feed as the site's gas tracker (/api/gas).
    // Mainnet prices; on Sepolia the ETH/$ figures are what mainnet WOULD
    // cost, which is exactly what the rehearsal is there to preview.
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
            result: state.wired ? 'flag' : undefined,
            action: () =>
                run('wire', async () => {
                    const art = artifacts.PDLibraryRegistry as { abi: Abi };
                    const hash = await walletClient!.writeContract({
                        address: state.registry!,
                        abi: art.abi,
                        functionName: 'wireFactory',
                        args: [state.factory],
                        chain: N.chain,
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
        {
            key: 'shapes',
            title: '5 · KEYCHAIN SHAPES',
            done: !!state.shapes,
            ready: isConnected && !wrongChain,
            result: state.shapes,
            action: () =>
                run('shapes', async () => {
                    const { addr, tx } = await deployContract('PDKeychainShapes', []);
                    return { shapes: addr, txs: { shapes: tx } };
                }),
        },
        {
            key: 'faces',
            title: '6 · KEYCHAIN FACES',
            done: !!state.faces,
            ready: isConnected && !wrongChain,
            result: state.faces,
            action: () =>
                run('faces', async () => {
                    const { addr, tx } = await deployContract('PDKeychainFaces', []);
                    return { faces: addr, txs: { faces: tx } };
                }),
        },
        {
            key: 'traitsStore',
            title: '7 · KEYCHAIN TRAITS',
            done: !!state.traitsStore,
            ready: isConnected && !wrongChain,
            result: state.traitsStore,
            action: () =>
                run('traitsStore', async () => {
                    const { addr, tx } = await deployContract('PDKeychainTraits', []);
                    return { traitsStore: addr, txs: { traitsStore: tx } };
                }),
        },
        {
            key: 'renderer',
            title: '8 · KEYCHAIN RENDERER',
            done: !!state.renderer,
            ready: !!state.shapes && !!state.faces && !!state.traitsStore,
            result: state.renderer,
            action: () =>
                run('renderer', async () => {
                    const { addr, tx } = await deployContract('PDKeychainRenderer', [
                        state.shapes,
                        state.faces,
                        state.traitsStore,
                    ]);
                    return { renderer: addr, txs: { renderer: tx } };
                }),
        },
        {
            key: 'keychains',
            title: '9 · KEYCHAINS',
            done: !!state.keychains,
            ready: !!state.factory && !!state.renderer,
            result: state.keychains,
            action: () =>
                run('keychains', async () => {
                    /* Factory binds the luck attestations (settlement key +
                       platform wallet read live); deployer becomes admin. */
                    const { addr, tx } = await deployContract('PDKeychains', [
                        state.factory,
                        state.renderer,
                        keyRoyalty,
                        parseEther(keyPrice),
                    ]);
                    return { keychains: addr, txs: { keychains: tx } };
                }),
        },
        {
            key: 'machineOn',
            title: '10 · TURN MACHINE ON',
            done: !!state.machineOn,
            ready: !!state.keychains,
            result: state.machineOn ? 'flag' : undefined,
            action: () =>
                run('machineOn', async () => {
                    /* The machine deploys OFF by design — this is the switch
                       that opens cranking to the public. */
                    const art = artifacts.PDKeychains as { abi: Abi };
                    const hash = await walletClient!.writeContract({
                        address: state.keychains!,
                        abi: art.abi,
                        functionName: 'setActive',
                        args: [true],
                        chain: N.chain,
                    });
                    await publicClient!.waitForTransactionReceipt({ hash });
                    return { machineOn: true, txs: { machineOn: hash } };
                }),
        },
    ];

    const allDone = steps.every((s) => s.done);

    return (
        <div style={S.page}>
            <style>{'@keyframes pdspin{to{transform:rotate(360deg)}}'}</style>
            <div style={S.h1}>PD // {N.label} DEPLOY</div>
            <div style={S.sub}>
                registry → factory → wire → stickers → keychain stack · one tap each ·{' '}
                {net === 'mainnet' ? 'REAL ETH' : 'testnet ETH'}
            </div>

            <div style={S.netRow}>
                {(Object.keys(NETS) as Net[]).map((k) => (
                    <button
                        key={k}
                        style={{ ...S.netBtn, ...(net === k ? S.netBtnOn : {}) }}
                        onClick={() => setNet(k)}
                        disabled={!!busy}
                    >
                        {NETS[k].label}
                    </button>
                ))}
            </div>

            <div style={S.card}>
                <ConnectButton showBalance={false} chainStatus="full" />
                {wrongChain && <div style={S.err}>Switch the wallet to {N.chain.name} first.</div>}
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
                <div style={S.stepTitle}>KEYCHAIN PARAMS</div>
                <label style={S.label}>royalty receiver (5% secondary)</label>
                <input style={S.input} value={keyRoyalty} onChange={(e) => setKeyRoyalty(e.target.value)} />
                <label style={S.label}>crank price (ETH)</label>
                <input style={S.input} value={keyPrice} onChange={(e) => setKeyPrice(e.target.value)} />
            </div>

            <div style={S.card}>
                <div style={S.stepTitle}>ESTIMATED GAS</div>
                <div style={S.gasRow}>1 · registry — {fmtRow(GAS_UNITS.registry)}</div>
                <div style={S.gasRow}>2 · factory — {fmtRow(GAS_UNITS.factory)}</div>
                <div style={S.gasRow}>3 · wire — {fmtRow(GAS_UNITS.wire)}</div>
                <div style={S.gasRow}>4 · stickers — {fmtRow(GAS_UNITS.stickers)}</div>
                <div style={S.gasRow}>5 · shapes — {fmtRow(GAS_UNITS.shapes)}</div>
                <div style={S.gasRow}>6 · faces — {fmtRow(GAS_UNITS.faces)}</div>
                <div style={S.gasRow}>7 · traits — {fmtRow(GAS_UNITS.traitsStore)}</div>
                <div style={S.gasRow}>8 · renderer — {fmtRow(GAS_UNITS.renderer)}</div>
                <div style={S.gasRow}>9 · keychains — {fmtRow(GAS_UNITS.keychains)}</div>
                <div style={S.gasRow}>10 · machine on — {fmtRow(GAS_UNITS.machineOn)}</div>
                <div style={S.gasTotal}>TOTAL — {fmtRow(totalUnits)}</div>
                <div style={S.gasAt}>
                    {gwei == null
                        ? 'fetching current gas…'
                        : `@ ${gwei} gwei · ETH $${ethUsd == null ? '—' : ethUsd.toLocaleString()} · live, refreshes every 30s${net === 'sepolia' ? ' · priced at MAINNET rates' : ''}`}
                </div>
            </div>

            {steps.map((s) => (
                <div key={s.key} style={S.card}>
                    <div style={S.stepTitle}>{s.title}</div>
                    {s.done ? (
                        <>
                            <button style={{ ...S.btn, ...S.btnDone }} disabled>
                                {s.key === 'machineOn' ? 'MACHINE ON ✦' : s.key === 'wire' ? 'WIRED ✦' : 'DEPLOYED ✦'}
                            </button>
                            {s.result && s.result !== 'flag' && <div style={S.addr}>{s.result}</div>}
                            {state.txs[s.key] && (
                                <a
                                    style={{ ...S.tx, color: '#8ab4ff', display: 'block' }}
                                    href={`${N.scan}/tx/${state.txs[s.key]}`}
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
                    <div style={S.stepTitle}>ALL DEPLOYED — {N.label} ADDRESSES</div>
                    <div style={S.addr}>registry: {state.registry}</div>
                    <div style={S.addr}>factory: {state.factory}</div>
                    <div style={S.addr}>stickers: {state.stickers}</div>
                    <div style={S.addr}>keychain shapes: {state.shapes}</div>
                    <div style={S.addr}>keychain faces: {state.faces}</div>
                    <div style={S.addr}>keychain traits: {state.traitsStore}</div>
                    <div style={S.addr}>keychain renderer: {state.renderer}</div>
                    <div style={S.addr}>keychains: {state.keychains}</div>
                    <button
                        style={S.btn}
                        onClick={() =>
                            navigator.clipboard.writeText(
                                `PD ${N.label}\nregistry: ${state.registry}\nfactory: ${state.factory}\nstickers: ${state.stickers}\nkeychain shapes: ${state.shapes}\nkeychain faces: ${state.faces}\nkeychain traits: ${state.traitsStore}\nkeychain renderer: ${state.renderer}\nkeychains: ${state.keychains}`
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
                    localStorage.removeItem(N.storeKey);
                    save({ ...EMPTY });
                }}
            >
                RESET (start a fresh {N.label} deploy)
            </button>
        </div>
    );
}

export default function DeployPage() {
    // Local wallet stack with its own cookie key — never touches the app's
    // session wallet state.
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
