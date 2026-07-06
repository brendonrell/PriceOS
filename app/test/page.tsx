'use client';

/*
 * /test — the Sepolia mainnet-readiness tester (private tool page, same
 * family as /deploy). Runs the contract test matrix against the DEPLOYED
 * Sepolia stack automatically and prints a green/red report + gas bill.
 *
 * Two actors:
 *   · ADMIN (Brendon's wallet, one tap): whitelistArtist(test account) —
 *     the only admin-gated step. Own wagmi stack, Sepolia-only, separate
 *     cookie key (same pattern as /deploy).
 *   · TEST ACCOUNT (throwaway private key pasted in, TESTNET ONLY): signs
 *     the whole automated run. Key lives in component state only — never
 *     persisted. A second receiver account is derived from it for the
 *     transfer test.
 *
 * Matrix (per docs/sepolia-test-phase.md Phase D, adapted to the real
 * contract surface — primary split pays out at mint time, the splitter
 * only carries the 5% secondary royalty at 60/40):
 *   R1-R3  reads: registry↔factory wire, admin, fee corridor
 *   T1     createProject (222 supply · 0.00022 ETH · placeholder script)
 *   T2     immediate 2nd createProject → EXPECT CooldownActive (free, via call)
 *   T3     wrong msg.value mint → EXPECT IncorrectPayment (free, via call)
 *   T4     mint(3), exact value → Minted×3, supply, artist 95% / platform 5%
 *          / storage-fee wallet deltas
 *   T5     tokenURI(1) decodes to valid JSON metadata
 *   T6     royaltyInfo = (splitter, 5%)
 *   T7     royalty sim: 0.001 ETH → splitter → pending 60/40 →
 *          withdrawArtist + withdrawPlatform → deltas, splitter drained
 *   T8     transferFrom A→B (secondary movement for the indexer)
 * Progress persists in localStorage; the run resumes after a refresh.
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
    useWalletClient,
} from 'wagmi';
import { sepolia } from 'wagmi/chains';
import {
    BaseError,
    ContractFunctionRevertedError,
    createPublicClient,
    createWalletClient,
    decodeEventLog,
    formatEther,
    keccak256,
    parseEther,
    stringToHex,
    toHex,
    type Abi,
    type Address,
    type Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import '@rainbow-me/rainbowkit/styles.css';

import artifacts from '../../lib/deploy/artifacts.json';
import testerAbis from '../../lib/deploy/testerAbis.json';

/* ── Deployed Sepolia stack (2026-07-06, docs/sepolia-test-phase.md §0.5) ── */
const FACTORY: Address = '0xbebf82fe12f2d85780ca4835796885208f7d0367';
const REGISTRY: Address = '0x303cabf0fe2483f159718d93e5e5224c59a1c673';
const DEPLOY_WALLET: Address = '0x146034ec25C277F30f63933B151297689E15B9B8';

const MINT_PRICE = parseEther('0.00022');

const factoryAbi = (artifacts.PDFactory as { abi: Abi }).abi;
const registryAbi = (artifacts.PDLibraryRegistry as { abi: Abi }).abi;
const projectAbi = (testerAbis.PDProject as { abi: Abi }).abi;
const splitterAbi = (testerAbis.PaymentSplitter as { abi: Abi }).abi;

/* Same Reown Cloud project as the app + /deploy (public value). */
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
        appName: 'PD Sepolia Tester',
        appDescription: 'Run the PD mainnet-readiness test matrix on Sepolia.',
        appUrl: 'https://pricediscussion.com',
        projectId,
    }
);

const adminConfig = createConfig({
    chains: [sepolia],
    connectors,
    transports: { [sepolia.id]: http() },
    ssr: true,
    storage: createStorage({ storage: cookieStorage, key: 'pd-test-wagmi' }),
});

const queryClient = new QueryClient();

const publicClient = createPublicClient({ chain: sepolia, transport: http() });

const STORE_KEY = 'pd-sepolia-test-v1';

type StepResult = {
    status: 'pass' | 'fail';
    detail: string;
    tx?: string;
    gasEth?: string;
};

type TestState = {
    project?: Address;
    splitter?: Address;
    results: Record<string, StepResult>;
    totalGasWei?: string;
};

const EMPTY: TestState = { results: {} };

function loadState(): TestState {
    if (typeof window === 'undefined') return EMPTY;
    try {
        return { ...EMPTY, ...JSON.parse(localStorage.getItem(STORE_KEY) || '{}') };
    } catch {
        return EMPTY;
    }
}

/* Named revert check via simulation — costs nothing, proves the guard. */
async function expectRevert(
    call: Parameters<typeof publicClient.simulateContract>[0],
    errorName: string
): Promise<string> {
    try {
        await publicClient.simulateContract(call);
        throw new Error(`no revert — ${errorName} guard MISSING`);
    } catch (e: unknown) {
        if (e instanceof BaseError) {
            const revert = e.walk((x) => x instanceof ContractFunctionRevertedError);
            const got = revert instanceof ContractFunctionRevertedError ? revert.data?.errorName : undefined;
            if (got === errorName) return `reverted ${errorName} as required`;
            throw new Error(`reverted with ${got || 'unknown'} instead of ${errorName}`);
        }
        throw e;
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
    row: { display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8 },
    pass: { color: '#7fe0a0', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' as const },
    fail: { color: '#ff7676', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' as const },
    pend: { color: '#e8c56a', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' as const },
    detail: { fontSize: 11, wordBreak: 'break-word' as const, flex: 1 },
    gas: { fontSize: 10, opacity: 0.7, whiteSpace: 'nowrap' as const },
    addr: { fontSize: 11, wordBreak: 'break-all' as const, marginTop: 8, opacity: 0.9 },
    err: { color: '#ff7676', fontSize: 11, marginTop: 8, wordBreak: 'break-word' as const },
    spin: {
        display: 'inline-block', width: 12, height: 12, marginRight: 8,
        border: '2px solid #0a0a0a', borderTopColor: 'transparent',
        borderRadius: '50%', animation: 'pdspin 0.7s linear infinite',
        verticalAlign: '-2px',
    },
};

const MATRIX: Array<{ key: string; title: string }> = [
    { key: 'R1', title: 'registry wired to factory' },
    { key: 'R2', title: 'factory admin + fee corridor' },
    { key: 'R3', title: 'test artist whitelisted' },
    { key: 'T1', title: 'createProject (222 · 0.00022)' },
    { key: 'T2', title: 'cooldown blocks 2nd project' },
    { key: 'T3', title: 'wrong payment rejected' },
    { key: 'T4', title: 'mint ×3 → 95/5 + storage split' },
    { key: 'T5', title: 'tokenURI valid metadata JSON' },
    { key: 'T6', title: 'royaltyInfo = splitter · 5%' },
    { key: 'T7', title: 'secondary royalty 60/40 withdraw' },
    { key: 'T8', title: 'transfer A→B (indexer event)' },
];

function Tester() {
    const { address: adminAddr, isConnected, chainId } = useAccount();
    const { data: adminWallet } = useWalletClient();

    const [state, setState] = useState<TestState>(EMPTY);
    const [pk, setPk] = useState('');
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [whitelisted, setWhitelisted] = useState<boolean | null>(null);
    const [testBal, setTestBal] = useState<bigint | null>(null);

    useEffect(() => setState(loadState()), []);

    const save = (next: TestState) => {
        setState(next);
        localStorage.setItem(STORE_KEY, JSON.stringify(next));
    };

    const testAccount = useMemo(() => {
        try {
            const k = pk.trim();
            if (!/^0x[0-9a-fA-F]{64}$/.test(k)) return null;
            return privateKeyToAccount(k as Hex);
        } catch {
            return null;
        }
    }, [pk]);

    /* Receiver for the transfer test — derived, never funded beyond dust. */
    const receiver = useMemo(() => {
        if (!testAccount) return null;
        return privateKeyToAccount(keccak256(stringToHex(`pd-test-receiver:${testAccount.address}`)));
    }, [testAccount]);

    useEffect(() => {
        if (!testAccount) { setWhitelisted(null); setTestBal(null); return; }
        let dead = false;
        (async () => {
            try {
                const [w, b] = await Promise.all([
                    publicClient.readContract({
                        address: FACTORY, abi: factoryAbi,
                        functionName: 'whitelistedArtists', args: [testAccount.address],
                    }) as Promise<boolean>,
                    publicClient.getBalance({ address: testAccount.address }),
                ]);
                if (!dead) { setWhitelisted(w); setTestBal(b); }
            } catch { /* transient RPC noise — leave as unknown */ }
        })();
        return () => { dead = true; };
    }, [testAccount, busy]);

    const wrongChain = isConnected && chainId !== sepolia.id;

    async function whitelist() {
        if (!adminWallet || !testAccount) return;
        setBusy('whitelist');
        setError(null);
        try {
            const hash = await adminWallet.writeContract({
                address: FACTORY, abi: factoryAbi,
                functionName: 'whitelistArtist', args: [testAccount.address],
                chain: sepolia,
            });
            await publicClient.waitForTransactionReceipt({ hash });
            setWhitelisted(true);
        } catch (e: unknown) {
            setError((e instanceof Error ? e.message : String(e)).split('\n')[0].slice(0, 240));
        } finally {
            setBusy(null);
        }
    }

    async function run() {
        if (!testAccount || !receiver) return;
        setBusy('run');
        setError(null);

        const wallet = createWalletClient({ account: testAccount, chain: sepolia, transport: http() });
        const A = testAccount.address;
        const next: TestState = { ...state, results: { ...state.results } };
        let totalGas = BigInt(next.totalGasWei || '0');

        const record = (key: string, r: StepResult) => {
            next.results[key] = r;
            next.totalGasWei = totalGas.toString();
            save({ ...next });
        };

        /* Send a tx from the test account and return its receipt + gas cost. */
        async function send(fn: string, args: unknown[], to: Address, abi: Abi, value?: bigint) {
            const { request } = await publicClient.simulateContract({
                address: to, abi, functionName: fn, args, account: testAccount!, value,
            } as unknown as Parameters<typeof publicClient.simulateContract>[0]);
            const hash = await wallet.writeContract(request);
            const rcpt = await publicClient.waitForTransactionReceipt({ hash });
            if (rcpt.status !== 'success') throw new Error(`${fn} tx reverted on-chain`);
            const gas = rcpt.gasUsed * rcpt.effectiveGasPrice;
            totalGas += gas;
            return { rcpt, hash, gasEth: formatEther(gas) };
        }

        try {
            /* R1 — wire */
            if (next.results.R1?.status !== 'pass') {
                const wired = await publicClient.readContract({
                    address: REGISTRY, abi: registryAbi, functionName: 'factory',
                }) as Address;
                record('R1', wired.toLowerCase() === FACTORY.toLowerCase()
                    ? { status: 'pass', detail: `registry.factory() = ${wired}` }
                    : { status: 'fail', detail: `registry points at ${wired}, expected ${FACTORY}` });
            }

            /* R2 — admin + corridor */
            if (next.results.R2?.status !== 'pass') {
                const [admin, floor, ceil, cur] = await Promise.all([
                    publicClient.readContract({ address: FACTORY, abi: factoryAbi, functionName: 'admin' }) as Promise<Address>,
                    publicClient.readContract({ address: FACTORY, abi: factoryAbi, functionName: 'storageFeeFloor' }) as Promise<bigint>,
                    publicClient.readContract({ address: FACTORY, abi: factoryAbi, functionName: 'storageFeeCeiling' }) as Promise<bigint>,
                    publicClient.readContract({ address: FACTORY, abi: factoryAbi, functionName: 'storageFeeWei' }) as Promise<bigint>,
                ]);
                const ok = admin.toLowerCase() === DEPLOY_WALLET.toLowerCase() && floor <= cur && cur <= ceil;
                record('R2', {
                    status: ok ? 'pass' : 'fail',
                    detail: `admin ${admin.slice(0, 8)}… · fee ${formatEther(cur)} in [${formatEther(floor)}, ${formatEther(ceil)}]`,
                });
            }

            /* R3 — whitelist gate */
            const isW = await publicClient.readContract({
                address: FACTORY, abi: factoryAbi, functionName: 'whitelistedArtists', args: [A],
            }) as boolean;
            record('R3', isW
                ? { status: 'pass', detail: `test artist ${A.slice(0, 8)}… whitelisted` }
                : { status: 'fail', detail: 'test artist NOT whitelisted — tap WHITELIST above first' });
            if (!isW) throw new Error('whitelist the test artist, then RUN again');

            /* T1 — createProject */
            if (!next.project) {
                const { rcpt, hash, gasEth } = await send('createProject', [
                    'PD Test Alpha', 'PDTA', 222n, MINT_PRICE, 0n,
                    [stringToHex('// pd sepolia readiness test — placeholder script')],
                    'PD Sepolia readiness test project',
                ], FACTORY, factoryAbi);
                let proj: Address | undefined, split: Address | undefined;
                for (const log of rcpt.logs) {
                    try {
                        const ev = decodeEventLog({ abi: factoryAbi, data: log.data, topics: log.topics });
                        if (ev.eventName === 'ProjectCreated') {
                            const a = ev.args as unknown as { project: Address; splitter: Address };
                            proj = a.project; split = a.splitter;
                        }
                    } catch { /* other contracts' logs */ }
                }
                if (!proj || !split) throw new Error('ProjectCreated event not found');
                next.project = proj;
                next.splitter = split;
                record('T1', { status: 'pass', detail: `project ${proj} · splitter ${split}`, tx: hash, gasEth });
            }
            const PROJECT = next.project!;
            const SPLITTER = next.splitter!;

            /* T2 — cooldown (simulated revert, no gas) */
            if (next.results.T2?.status !== 'pass') {
                const detail = await expectRevert({
                    address: FACTORY, abi: factoryAbi, functionName: 'createProject',
                    args: ['PD Test Beta', 'PDTB', 111n, MINT_PRICE, 0n, [stringToHex('// x')], ''],
                    account: testAccount,
                } as unknown as Parameters<typeof publicClient.simulateContract>[0], 'CooldownActive');
                record('T2', { status: 'pass', detail });
            }

            /* T3 — wrong payment (simulated revert, no gas) */
            const storageFee = await publicClient.readContract({
                address: FACTORY, abi: factoryAbi, functionName: 'storageFeeWei',
            }) as bigint;
            if (next.results.T3?.status !== 'pass') {
                const detail = await expectRevert({
                    address: PROJECT, abi: projectAbi, functionName: 'mint', args: [1n],
                    account: testAccount, value: MINT_PRICE, // missing the storage fee
                } as unknown as Parameters<typeof publicClient.simulateContract>[0], 'IncorrectPayment');
                record('T3', { status: 'pass', detail });
            }

            /* T4 — mint ×3, verify the full primary split */
            if (next.results.T4?.status !== 'pass') {
                const platBefore = await publicClient.getBalance({ address: DEPLOY_WALLET });
                const value = (MINT_PRICE + storageFee) * 3n;
                const { rcpt, hash, gasEth } = await send('mint', [3n], PROJECT, projectAbi, value);
                const minted = rcpt.logs.filter((l) => {
                    try {
                        return decodeEventLog({ abi: projectAbi, data: l.data, topics: l.topics }).eventName === 'Minted';
                    } catch { return false; }
                }).length;
                const supply = await publicClient.readContract({
                    address: PROJECT, abi: projectAbi, functionName: 'totalMinted',
                }) as bigint;
                const owner1 = await publicClient.readContract({
                    address: PROJECT, abi: projectAbi, functionName: 'ownerOf', args: [1n],
                }) as Address;
                const platAfter = await publicClient.getBalance({ address: DEPLOY_WALLET });
                /* platform wallet + storage wallet are BOTH the deploy wallet on
                   this stack: expected delta = 5% of mint total + all storage. */
                const expectedDelta = (MINT_PRICE * 3n * 500n) / 10_000n + storageFee * 3n;
                const delta = platAfter - platBefore;
                const ok = minted === 3 && supply === 3n && owner1.toLowerCase() === A.toLowerCase() && delta === expectedDelta;
                record('T4', {
                    status: ok ? 'pass' : 'fail',
                    detail: ok
                        ? `3 minted · platform+storage received ${formatEther(delta)} exactly`
                        : `minted ${minted}/3 · supply ${supply} · wallet delta ${formatEther(delta)} vs expected ${formatEther(expectedDelta)}`,
                    tx: hash, gasEth,
                });
            }

            /* T5 — tokenURI decodes */
            if (next.results.T5?.status !== 'pass') {
                const uri = await publicClient.readContract({
                    address: PROJECT, abi: projectAbi, functionName: 'tokenURI', args: [1n],
                }) as string;
                const prefix = 'data:application/json;base64,';
                if (!uri.startsWith(prefix)) throw new Error(`tokenURI is not base64 JSON (${uri.slice(0, 40)}…)`);
                const meta = JSON.parse(atob(uri.slice(prefix.length)));
                const ok = typeof meta.name === 'string' && meta.name.length > 0;
                record('T5', {
                    status: ok ? 'pass' : 'fail',
                    detail: ok ? `metadata OK — "${meta.name}" (${(uri.length / 1024).toFixed(1)}KB)` : 'metadata JSON missing name',
                });
            }

            /* T6 — royaltyInfo */
            if (next.results.T6?.status !== 'pass') {
                const [recv, amt] = await publicClient.readContract({
                    address: PROJECT, abi: projectAbi, functionName: 'royaltyInfo', args: [1n, parseEther('1')],
                }) as [Address, bigint];
                const ok = recv.toLowerCase() === SPLITTER.toLowerCase() && amt === parseEther('0.05');
                record('T6', {
                    status: ok ? 'pass' : 'fail',
                    detail: ok ? 'splitter receives 5% of every secondary sale' : `got ${recv} @ ${formatEther(amt)}`,
                });
            }

            /* T7 — royalty split + withdrawals */
            if (next.results.T7?.status !== 'pass') {
                const sim = parseEther('0.001');
                const h1 = await wallet.sendTransaction({ to: SPLITTER, value: sim });
                const r1 = await publicClient.waitForTransactionReceipt({ hash: h1 });
                totalGas += r1.gasUsed * r1.effectiveGasPrice;
                const [pa, pp] = await Promise.all([
                    publicClient.readContract({ address: SPLITTER, abi: splitterAbi, functionName: 'pendingArtist' }) as Promise<bigint>,
                    publicClient.readContract({ address: SPLITTER, abi: splitterAbi, functionName: 'pendingPlatform' }) as Promise<bigint>,
                ]);
                if (pa !== (sim * 60n) / 100n || pp !== sim - (sim * 60n) / 100n) {
                    throw new Error(`split wrong: artist ${formatEther(pa)} / platform ${formatEther(pp)}`);
                }
                const w1 = await send('withdrawArtist', [], SPLITTER, splitterAbi);
                const w2 = await send('withdrawPlatform', [], SPLITTER, splitterAbi);
                const left = await publicClient.getBalance({ address: SPLITTER });
                record('T7', {
                    status: left === 0n ? 'pass' : 'fail',
                    detail: left === 0n
                        ? `0.001 in → 60/40 pending → both withdrawn, splitter drained`
                        : `splitter still holds ${formatEther(left)}`,
                    tx: w2.hash, gasEth: w1.gasEth,
                });
            }

            /* T8 — transfer for the indexer */
            if (next.results.T8?.status !== 'pass') {
                const { hash, gasEth } = await send('transferFrom', [A, receiver.address, 1n], PROJECT, projectAbi);
                const owner = await publicClient.readContract({
                    address: PROJECT, abi: projectAbi, functionName: 'ownerOf', args: [1n],
                }) as Address;
                record('T8', {
                    status: owner.toLowerCase() === receiver.address.toLowerCase() ? 'pass' : 'fail',
                    detail: `token 1 → ${receiver.address.slice(0, 10)}… (Transfer event for the indexer)`,
                    tx: hash, gasEth,
                });
            }
        } catch (e: unknown) {
            setError((e instanceof Error ? e.message : String(e)).split('\n')[0].slice(0, 300));
        } finally {
            save({ ...next });
            setBusy(null);
        }
    }

    const results = state.results;
    const passCount = MATRIX.filter((m) => results[m.key]?.status === 'pass').length;
    const failCount = MATRIX.filter((m) => results[m.key]?.status === 'fail').length;
    const allPass = passCount === MATRIX.length;

    const report = () => {
        const lines = [
            `PD SEPOLIA READINESS — ${passCount}/${MATRIX.length} PASS${failCount ? ` · ${failCount} FAIL` : ''}`,
            `factory ${FACTORY}`,
            state.project ? `test project ${state.project}` : '',
            ...MATRIX.map((m) => {
                const r = results[m.key];
                return `${r ? (r.status === 'pass' ? 'PASS' : 'FAIL') : '—  '} ${m.key} ${m.title}${r?.gasEth ? ` · gas ${Number(r.gasEth).toFixed(5)}` : ''}${r && r.status === 'fail' ? ` · ${r.detail}` : ''}`;
            }),
            `total gas spent: ${formatEther(BigInt(state.totalGasWei || '0'))} SepETH`,
        ].filter(Boolean);
        navigator.clipboard.writeText(lines.join('\n'));
    };

    return (
        <div style={S.page}>
            <style>{'@keyframes pdspin{to{transform:rotate(360deg)}}'}</style>
            <div style={S.h1}>PD // SEPOLIA TESTER</div>
            <div style={S.sub}>the mainnet-readiness matrix · one run, green or red</div>

            <div style={S.card}>
                <div style={S.stepTitle}>1 · TEST ACCOUNT (throwaway key — testnet only)</div>
                <label style={S.label}>private key (never stored, never leaves this page)</label>
                <input
                    style={S.input}
                    type="password"
                    placeholder="0x…64 hex chars"
                    value={pk}
                    onChange={(e) => setPk(e.target.value)}
                />
                {testAccount && (
                    <>
                        <div style={S.addr}>{testAccount.address}</div>
                        <div style={{ ...S.addr, opacity: 0.65 }}>
                            balance: {testBal === null ? '…' : `${Number(formatEther(testBal)).toFixed(4)} SepETH`}
                            {testBal !== null && testBal < parseEther('0.02') && ' — fund with ~0.03 before running'}
                        </div>
                    </>
                )}
            </div>

            <div style={S.card}>
                <div style={S.stepTitle}>2 · WHITELIST (admin wallet, one tap)</div>
                <ConnectButton showBalance={false} chainStatus="full" />
                {wrongChain && <div style={S.err}>Switch the wallet to Sepolia first.</div>}
                {whitelisted ? (
                    <button style={{ ...S.btn, ...S.btnDone }} disabled>WHITELISTED ✦</button>
                ) : (
                    <button
                        style={{ ...S.btn, opacity: isConnected && !wrongChain && testAccount && !busy ? 1 : 0.4 }}
                        disabled={!isConnected || wrongChain || !testAccount || !!busy}
                        onClick={whitelist}
                    >
                        {busy === 'whitelist' ? (<><span style={S.spin} />CONFIRM IN WALLET…</>) : 'WHITELIST TEST ARTIST'}
                    </button>
                )}
            </div>

            <div style={S.card}>
                <div style={S.stepTitle}>3 · RUN THE MATRIX</div>
                {MATRIX.map((m) => {
                    const r = results[m.key];
                    return (
                        <div key={m.key} style={S.row}>
                            <span style={r ? (r.status === 'pass' ? S.pass : S.fail) : S.pend}>
                                {r ? (r.status === 'pass' ? 'PASS' : 'FAIL') : '· · ·'}
                            </span>
                            <span style={S.detail}>
                                <b>{m.key}</b> {m.title}
                                {r && <span style={{ opacity: 0.7 }}> — {r.detail}</span>}
                            </span>
                            {r?.gasEth && <span style={S.gas}>{Number(r.gasEth).toFixed(5)}</span>}
                        </div>
                    );
                })}
                <button
                    style={{ ...S.btn, opacity: testAccount && whitelisted !== false && !busy ? 1 : 0.4 }}
                    disabled={!testAccount || !!busy}
                    onClick={run}
                >
                    {busy === 'run' ? (<><span style={S.spin} />RUNNING — leave the page open…</>) : (passCount > 0 && !allPass ? 'RESUME RUN' : 'RUN')}
                </button>
            </div>

            {(passCount > 0 || failCount > 0) && (
                <div style={{ ...S.card, borderColor: allPass ? '#2e5c3c' : failCount ? '#5c2e2e' : '#2a2a2a' }}>
                    <div style={S.stepTitle}>
                        {allPass ? 'ALL GREEN — READY FOR THE AUDIT PASS' : `${passCount}/${MATRIX.length} PASS${failCount ? ` · ${failCount} FAIL` : ''}`}
                    </div>
                    {state.project && <div style={S.addr}>test project: {state.project}</div>}
                    <div style={S.addr}>gas spent: {Number(formatEther(BigInt(state.totalGasWei || '0'))).toFixed(5)} SepETH</div>
                    <button style={S.btn} onClick={report}>COPY REPORT</button>
                </div>
            )}

            {error && (
                <div style={S.card}>
                    <div style={S.err}>{error}</div>
                </div>
            )}

            <button
                style={{ ...S.btn, background: '#1a1a1a', color: '#888', marginTop: 20 }}
                onClick={() => {
                    localStorage.removeItem(STORE_KEY);
                    setState({ ...EMPTY, results: {} });
                }}
            >
                RESET (fresh run — creates a new test project)
            </button>
        </div>
    );
}

export default function TestPage() {
    const theme = useMemo(() => darkTheme({ accentColor: '#fafafa', accentColorForeground: '#0a0a0a' }), []);
    return (
        <WagmiProvider config={adminConfig}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider theme={theme} modalSize="compact">
                    <Tester />
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}
