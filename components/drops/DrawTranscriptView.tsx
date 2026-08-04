'use client';

/*
 * DrawTranscriptView — the public draw record, verifiable on the reader's
 * own machine (the trust product of Fair Draw).
 *
 * Fetches the drop's published transcript, then — entirely IN THE BROWSER —
 * replays the draw with the real engine (lib/drops/draw.ts) and checks the
 * result against the commitment the contract anchored in its WindowClosed
 * event. No PD server is trusted for the verdict: the transcript is input,
 * the chain is the anchor, the reader's machine is the judge.
 *
 * Continuous-motion law: the verify strip pulses from tap to verdict.
 */

import { useCallback, useEffect, useState } from 'react';
import { createPublicClient, decodeFunctionData, http, parseAbiItem, type Hex } from 'viem';
import { mainnet, sepolia } from 'viem/chains';
import { CHAIN_ID } from '@/lib/market/chain';
import { runDraw, verifyDraw, type DrawTranscript, type DrawResult } from '@/lib/drops/draw';

const WINDOW_CLOSED = parseAbiItem(
    'event WindowClosed(bool contested, uint256 winnerCount, bytes32 drawCommit, uint64 sealedUntil)',
);

// The settlement call that seated the winners — its calldata carries the
// winners+seats the chain actually credited, so the reader can check the
// on-chain seating against the draw, not just the commitment hash.
const CLOSE_CONTESTED = parseAbiItem(
    'function closeWindowContested(address[] winners, uint256[] seats, uint64 sealSeconds, bytes32 drawCommit)',
);

interface TranscriptPayload {
    project_address: string;
    status: string;
    supply: number;
    seal_seconds: number | null;
    beacon_block: number | null;
    beacon_hash: string | null;
    commitment: string | null;
    window_close: string;
    transcript: DrawTranscript;
}

/** What the reader's machine could confirm against the chain itself. */
interface ChainChecks {
    reachable: boolean;
    /** The contested close on-chain carries this transcript's commitment. */
    anchorOk: boolean;
    /** The winners the chain actually seated are exactly the ones drawn. */
    winnersOk: boolean;
    /** The seed block is the real block, and the first one after entries closed. */
    beaconOk: boolean;
}

type Verdict =
    | { state: 'idle' }
    | { state: 'running' }
    | { state: 'done'; replayOk: boolean; chain: ChainChecks }
    | { state: 'error'; message: string };

export default function DrawTranscriptView({ project }: { project: string }) {
    const [data, setData] = useState<TranscriptPayload | null>(null);
    const [missing, setMissing] = useState(false);
    const [result, setResult] = useState<DrawResult | null>(null);
    const [verdict, setVerdict] = useState<Verdict>({ state: 'idle' });

    useEffect(() => {
        let dead = false;
        fetch(`/api/drops/${project}/transcript`)
            .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
            .then((d: TranscriptPayload) => {
                if (dead) return;
                setData(d);
                setResult(runDraw(d.transcript));
            })
            .catch(() => !dead && setMissing(true));
        return () => { dead = true; };
    }, [project]);

    const verify = useCallback(async () => {
        if (!data) return;
        setVerdict({ state: 'running' });
        try {
            // 1. Replay: does the transcript reproduce its own commitment?
            const replay = runDraw(data.transcript);
            const replayOk = replay.commitment === data.commitment;
            setResult(replay);

            const rpc = process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL;
            if (!rpc) {
                setVerdict({
                    state: 'done',
                    replayOk,
                    chain: { reachable: false, anchorOk: false, winnersOk: false, beaconOk: false },
                });
                return;
            }
            const pub = createPublicClient({
                chain: CHAIN_ID === 11155111 ? sepolia : mainnet,
                transport: http(rpc),
            });

            // 2. Anchor: the contested close on-chain carries that commitment.
            const logs = await pub.getLogs({
                address: data.project_address as `0x${string}`,
                event: WINDOW_CLOSED,
                fromBlock: 'earliest',
            });
            const closeLog = logs.filter((l) => l.args.contested).at(-1);
            const onchainCommit = closeLog?.args.drawCommit ?? null;
            const anchorOk = onchainCommit !== null && onchainCommit === replay.commitment;

            // 3. Winners: decode the seating the chain actually credited (from
            //    the close call's own calldata) and check it IS the drawn one.
            //    This is what catches a settlement key that anchors an honest
            //    commitment but seats addresses the draw never picked.
            let winnersOk = false;
            if (closeLog && onchainCommit) {
                const tx = await pub.getTransaction({ hash: closeLog.transactionHash });
                const decoded = decodeFunctionData({ abi: [CLOSE_CONTESTED], data: tx.input });
                if (decoded.functionName === 'closeWindowContested') {
                    const [winners, seats] = decoded.args as readonly [
                        readonly `0x${string}`[], readonly bigint[], bigint, `0x${string}`,
                    ];
                    const onchainWinners = winners.map((w, i) => ({ wallet: w, seats: Number(seats[i]) }));
                    winnersOk = verifyDraw(data.transcript, onchainCommit as Hex, onchainWinners).ok;
                }
            }

            // 4. Beacon: the seed block is real (its hash is the chain's) AND
            //    it is the first block after entries closed — so the seed
            //    couldn't be shopped for.
            let beaconOk = false;
            try {
                const bn = BigInt(data.transcript.beaconBlock);
                const [blk, prev] = await Promise.all([
                    pub.getBlock({ blockNumber: bn }),
                    pub.getBlock({ blockNumber: bn - 1n }),
                ]);
                const closeSec = BigInt(Math.floor(new Date(data.window_close).getTime() / 1000));
                beaconOk =
                    blk.hash?.toLowerCase() === data.transcript.beaconHash.toLowerCase() &&
                    blk.timestamp >= closeSec &&
                    prev.timestamp < closeSec;
            } catch {
                beaconOk = false;
            }

            setVerdict({ state: 'done', replayOk, chain: { reachable: true, anchorOk, winnersOk, beaconOk } });
        } catch (err) {
            setVerdict({ state: 'error', message: (err as Error).message });
        }
    }, [data]);

    if (missing) {
        return <p className="ddt-note">No contested draw on record for this project — its drops settled quietly.</p>;
    }
    if (!data || !result) return <p className="ddt-note ddt-pulse">Loading the draw record…</p>;

    const json = JSON.stringify(data.transcript, null, 2);
    const href = `data:application/json;charset=utf-8,${encodeURIComponent(json)}`;

    return (
        <div className="ddt">
            <div className="ddt-facts">
                <div><b>Status</b> {data.status}</div>
                <div><b>Supply</b> {data.supply}</div>
                <div><b>Entries</b> {data.transcript.entries.length}</div>
                <div><b>Beacon block</b> {data.beacon_block}</div>
                <div><b>Seal</b> {data.seal_seconds ?? 0}s</div>
            </div>

            <div className="ddt-commit">
                <b>Commitment</b>
                <code>{data.commitment}</code>
            </div>

            <div className="ddt-actions">
                <button type="button" className="ddt-btn" onClick={verify}
                    disabled={verdict.state === 'running'}>
                    {verdict.state === 'running' ? 'VERIFYING…' : 'VERIFY THIS DRAW'}
                </button>
                <a className="ddt-btn" href={href} download={`pd-draw-${data.project_address}.json`}>
                    DOWNLOAD TRANSCRIPT
                </a>
            </div>

            {verdict.state === 'running' && (
                <p className="ddt-note ddt-pulse">Replaying the draw on your machine…</p>
            )}
            {verdict.state === 'done' && (
                <div className="ddt-verdict">
                    <div>{verdict.replayOk ? '✓︎' : '✕︎'} transcript reproduces its commitment</div>
                    {!verdict.chain.reachable ? (
                        <div>—︎ chain unreachable from this browser</div>
                    ) : (
                        <>
                            <div>{verdict.chain.anchorOk ? '✓︎' : '✕︎'} commitment matches the on-chain anchor</div>
                            <div>{verdict.chain.winnersOk ? '✓︎' : '✕︎'} the winners on-chain are the ones drawn</div>
                            <div>{verdict.chain.beaconOk ? '✓︎' : '✕︎'} the seed block is the real block after close</div>
                        </>
                    )}
                    <div className="ddt-verdict-line">
                        {(() => {
                            const c = verdict.chain;
                            const allChain = c.reachable && c.anchorOk && c.winnersOk && c.beaconOk;
                            if (verdict.replayOk && allChain) return 'THE DRAW CHECKS OUT';
                            if (verdict.replayOk && !c.reachable) return 'REPLAY OK — chain unconfirmed';
                            return 'THIS DRAW DOES NOT VERIFY';
                        })()}
                    </div>
                </div>
            )}
            {verdict.state === 'error' && (
                <p className="ddt-note">Verification hit an error: {verdict.message}</p>
            )}

            <h2 className="ddt-h2">The drawn order</h2>
            <p className="ddt-note">Head wins the seats; everyone after is the cascade queue, in this exact order.</p>
            <ol className="ddt-order">
                {result.order.map((w) => {
                    const win = result.winners.find((x) => x.wallet === w);
                    return (
                        <li key={w}>
                            <code>{w}</code>
                            {win ? <b> WIN · {win.seats} seat{win.seats > 1 ? 's' : ''}</b> : null}
                        </li>
                    );
                })}
            </ol>
        </div>
    );
}
