'use client';

/*
 * /studio/publish — the Studio's sign-&-deploy page (bare route, same
 * family and wallet pattern as /deploy and /test: own Sepolia-only wagmi
 * stack, separate cookie key, never touches the app's mainnet wallet
 * state). Reads the tested draft from the Studio store, runs the REAL
 * preflight (a factory simulation — whitelist, cooldown, bounds all
 * checked by the contract itself, free), then the artist signs
 * createProject from their own wallet. The Studio never holds keys.
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
import { sepolia } from 'wagmi/chains';
import {
    BaseError,
    ContractFunctionRevertedError,
    decodeEventLog,
    parseEther,
    stringToHex,
    type Abi,
    type Address,
    type Hex,
} from 'viem';
import '@rainbow-me/rainbowkit/styles.css';

import artifacts from '../../../lib/deploy/artifacts.json';
import { STUDIO_FACTORY } from '../../../lib/studio/constants';
import { loadDrafts, saveDrafts, type StudioDraft } from '../../../lib/studio/drafts';

const factoryAbi = (artifacts.PDFactory as { abi: Abi }).abi;

/* Same Reown Cloud project as the app + /deploy + /test (public value). */
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
        appName: 'PD Studio Publish',
        appDescription: 'Deploy your tested PD Studio draft from your own wallet.',
        appUrl: 'https://pricediscussion.com',
        projectId,
    }
);

const publishConfig = createConfig({
    chains: [sepolia],
    connectors,
    transports: { [sepolia.id]: http() },
    ssr: true,
    storage: createStorage({ storage: cookieStorage, key: 'pd-studio-wagmi' }),
});

const queryClient = new QueryClient();

/* SSTORE2 data contracts cap just under 24KB — chunk the script the way the
   factory expects scriptChunks. */
const CHUNK_BYTES = 20_000;

function chunkScript(script: string): Hex[] {
    const bytes = new TextEncoder().encode(script);
    const chunks: Hex[] = [];
    for (let i = 0; i < bytes.length; i += CHUNK_BYTES) {
        const slice = bytes.slice(i, i + CHUNK_BYTES);
        chunks.push(
            `0x${Array.from(slice, (b) => b.toString(16).padStart(2, '0')).join('')}` as Hex
        );
    }
    return chunks.length ? chunks : [stringToHex('')];
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
    row: { fontSize: 12, marginTop: 6, display: 'flex', justifyContent: 'space-between', gap: 10 },
    btn: {
        width: '100%', padding: '12px 14px', marginTop: 12, borderRadius: 10,
        border: 'none', background: '#fafafa', color: '#0a0a0a',
        fontFamily: 'inherit', fontSize: 13, fontWeight: 700, letterSpacing: 1,
        cursor: 'pointer',
    },
    btnDone: { background: '#1d3a26', color: '#7fe0a0', cursor: 'default' },
    chip: {
        display: 'inline-block', border: '1px solid #333', borderRadius: 8,
        padding: '7px 10px', marginRight: 6, marginTop: 6, fontSize: 12,
        cursor: 'pointer', background: '#0a0a0a', color: '#fafafa',
    },
    chipActive: { background: '#fafafa', color: '#0a0a0a' },
    addr: { fontSize: 11, wordBreak: 'break-all' as const, marginTop: 8, opacity: 0.9 },
    ok: { color: '#7fe0a0', fontSize: 12, marginTop: 8 },
    err: { color: '#ff7676', fontSize: 11, marginTop: 8, wordBreak: 'break-word' as const },
    spin: {
        display: 'inline-block', width: 12, height: 12, marginRight: 8,
        border: '2px solid #0a0a0a', borderTopColor: 'transparent',
        borderRadius: '50%', animation: 'pdspin 0.7s linear infinite',
        verticalAlign: '-2px',
    },
};

function Publisher() {
    const { address, isConnected, chainId } = useAccount();
    const { data: walletClient } = useWalletClient();
    const publicClient = usePublicClient();

    const [drafts, setDrafts] = useState<StudioDraft[]>([]);
    const [draftId, setDraftId] = useState<string | null>(null);
    const [preflight, setPreflight] = useState<'idle' | 'checking' | 'clear' | string>('idle');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loaded = loadDrafts().filter((d) => !d.deployed && d.script.trim() && d.runs.length);
        setDrafts(loaded);
        if (loaded.length === 1) setDraftId(loaded[0].id);
    }, []);

    const draft = drafts.find((d) => d.id === draftId) ?? null;

    const wrongChain = isConnected && chainId !== sepolia.id;
    const { switchChain } = useSwitchChain();
    useEffect(() => {
        if (wrongChain) switchChain({ chainId: sepolia.id });
    }, [wrongChain, switchChain]);

    const args = useMemo(() => {
        if (!draft) return null;
        return [
            draft.name.trim(),
            draft.symbol.trim(),
            BigInt(draft.supply),
            parseEther(draft.priceEth as `${number}`),
            0n, // vanilla — library binding lands with registry-bound testing
            chunkScript(draft.script),
            '', // PD has no project descriptions — storytelling is traits + soundtrack
        ] as const;
    }, [draft]);

    /* The real preflight: simulate createProject against the factory. The
       contract itself checks whitelist, cooldown, and bounds — for free. */
    useEffect(() => {
        if (!draft || !args || !address || !publicClient || wrongChain) {
            setPreflight('idle');
            return;
        }
        let dead = false;
        setPreflight('checking');
        (async () => {
            try {
                await publicClient.simulateContract({
                    address: STUDIO_FACTORY,
                    abi: factoryAbi,
                    functionName: 'createProject',
                    args: args as unknown as readonly unknown[],
                    account: address,
                });
                if (!dead) setPreflight('clear');
            } catch (e: unknown) {
                if (dead) return;
                if (e instanceof BaseError) {
                    const revert = e.walk((x) => x instanceof ContractFunctionRevertedError);
                    const name =
                        revert instanceof ContractFunctionRevertedError
                            ? revert.data?.errorName
                            : undefined;
                    if (name === 'NotWhitelisted') {
                        setPreflight('This wallet is not on the artist whitelist yet — PD is filtered (a quality floor, not a taste gate). Apply: price@pricediscussion.com');
                        return;
                    }
                    if (name === 'CooldownActive') {
                        setPreflight('Your 60-day cooldown since your last Project has not elapsed yet.');
                        return;
                    }
                    setPreflight(`The factory rejects this deploy: ${name || 'unknown revert'}.`);
                    return;
                }
                setPreflight('Could not reach the chain to preflight — try again.');
            }
        })();
        return () => { dead = true; };
    }, [draft, args, address, publicClient, wrongChain]);

    async function deploy() {
        if (!draft || !args || !walletClient || !publicClient) return;
        setBusy(true);
        setError(null);
        try {
            const hash = await walletClient.writeContract({
                address: STUDIO_FACTORY,
                abi: factoryAbi,
                functionName: 'createProject',
                args: args as unknown as readonly unknown[],
                chain: sepolia,
            });
            const rcpt = await publicClient.waitForTransactionReceipt({ hash });
            if (rcpt.status !== 'success') throw new Error('createProject reverted on-chain');
            let project: Address | undefined, splitter: Address | undefined;
            for (const log of rcpt.logs) {
                try {
                    const ev = decodeEventLog({ abi: factoryAbi, data: log.data, topics: log.topics });
                    if (ev.eventName === 'ProjectCreated') {
                        const a = ev.args as unknown as { project: Address; splitter: Address };
                        project = a.project;
                        splitter = a.splitter;
                    }
                } catch { /* other contracts' logs */ }
            }
            if (!project || !splitter) throw new Error('ProjectCreated event not found');
            const all = loadDrafts().map((d) =>
                d.id === draft.id
                    ? { ...d, deployed: { project: project!, splitter: splitter!, tx: hash, at: Date.now() } }
                    : d
            );
            saveDrafts(all);
            setDrafts((prev) =>
                prev.map((d) =>
                    d.id === draft.id
                        ? { ...d, deployed: { project: project!, splitter: splitter!, tx: hash, at: Date.now() } }
                        : d
                )
            );
        } catch (e: unknown) {
            setError((e instanceof Error ? e.message : String(e)).split('\n')[0].slice(0, 240));
        } finally {
            setBusy(false);
        }
    }

    return (
        <div style={S.page}>
            <style>{'@keyframes pdspin{to{transform:rotate(360deg)}}'}</style>
            <div style={S.h1}>PD STUDIO // SIGN &amp; DEPLOY</div>
            <div style={S.sub}>your draft, your wallet, one transaction · Sepolia</div>

            <div style={S.card}>
                <div style={S.stepTitle}>1 · TESTED DRAFT</div>
                {drafts.length === 0 ? (
                    <div style={{ fontSize: 12, opacity: 0.8 }}>
                        No publishable drafts on this device — a draft needs a script and at
                        least one test run. Build one in <a href="/studio" style={{ color: '#8ab4ff' }}>the Studio</a>.
                    </div>
                ) : (
                    drafts.map((d) => (
                        <span
                            key={d.id}
                            style={{ ...S.chip, ...(d.id === draftId ? S.chipActive : {}) }}
                            onClick={() => setDraftId(d.id)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => { if (e.key === 'Enter') setDraftId(d.id); }}
                        >
                            {d.name.trim() || 'UNTITLED'}
                        </span>
                    ))
                )}
                {draft && (
                    <>
                        <div style={S.row}><span>supply</span><span>{draft.supply}</span></div>
                        <div style={S.row}><span>mint price</span><span>{draft.priceEth} ETH · fixed forever</span></div>
                        <div style={S.row}><span>script</span><span>{(draft.script.length / 1024).toFixed(1)}KB · {chunkScript(draft.script).length} chunk(s)</span></div>
                        <div style={S.row}><span>test runs</span><span>{draft.runs.length} · {draft.runs.reduce((n, r) => n + r.hashes.length, 0)} outputs</span></div>
                    </>
                )}
            </div>

            <div style={S.card}>
                <div style={S.stepTitle}>2 · YOUR WALLET</div>
                <ConnectButton showBalance={false} chainStatus="full" />
                {wrongChain && <div style={S.err}>Switch the wallet to Sepolia first.</div>}
            </div>

            <div style={S.card}>
                <div style={S.stepTitle}>3 · PREFLIGHT + DEPLOY</div>
                {draft?.deployed ? (
                    <>
                        <button style={{ ...S.btn, ...S.btnDone }} disabled>LIVE ✦</button>
                        <div style={S.addr}>project: {draft.deployed.project}</div>
                        <div style={S.addr}>splitter: {draft.deployed.splitter}</div>
                        <a
                            style={{ ...S.addr, color: '#8ab4ff', display: 'block' }}
                            href={`https://sepolia.etherscan.io/tx/${draft.deployed.tx}`}
                            target="_blank"
                            rel="noreferrer"
                        >
                            {draft.deployed.tx}
                        </a>
                        <div style={S.ok}>
                            From this block nothing about the Project can change. The platform
                            picks it up from ProjectCreated on its own.
                        </div>
                    </>
                ) : (
                    <>
                        {preflight === 'checking' && <div style={{ fontSize: 12 }}>Preflighting against the factory…</div>}
                        {preflight === 'clear' && <div style={S.ok}>Factory accepts this deploy — whitelist, cooldown, and bounds all clear.</div>}
                        {preflight !== 'idle' && preflight !== 'checking' && preflight !== 'clear' && (
                            <div style={S.err}>{preflight}</div>
                        )}
                        <button
                            style={{ ...S.btn, opacity: preflight === 'clear' && !busy ? 1 : 0.4 }}
                            disabled={preflight !== 'clear' || busy}
                            onClick={deploy}
                        >
                            {busy ? (<><span style={S.spin} />CONFIRM IN WALLET…</>) : 'DEPLOY MY PROJECT'}
                        </button>
                    </>
                )}
                {error && <div style={S.err}>{error}</div>}
            </div>
        </div>
    );
}

export default function StudioPublishPage() {
    // Local, Sepolia-only wallet stack — never touches the app's mainnet one.
    const theme = useMemo(() => darkTheme({ accentColor: '#fafafa', accentColorForeground: '#0a0a0a' }), []);
    return (
        <WagmiProvider config={publishConfig}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider theme={theme} modalSize="compact">
                    <Publisher />
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}
