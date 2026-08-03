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
import { createPublicClient, http, parseAbiItem } from 'viem';
import { mainnet, sepolia } from 'viem/chains';
import { CHAIN_ID } from '@/lib/market/chain';
import { runDraw, type DrawTranscript, type DrawResult } from '@/lib/drops/draw';

const WINDOW_CLOSED = parseAbiItem(
    'event WindowClosed(bool contested, uint256 winnerCount, bytes32 drawCommit, uint64 sealedUntil)',
);

interface TranscriptPayload {
    project_address: string;
    status: string;
    supply: number;
    seal_seconds: number | null;
    beacon_block: number | null;
    beacon_hash: string | null;
    commitment: string | null;
    transcript: DrawTranscript;
}

type Verdict =
    | { state: 'idle' }
    | { state: 'running' }
    | { state: 'done'; replayOk: boolean; anchorOk: boolean; onchain: string | null }
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
            // 2. Anchor: does the chain's WindowClosed carry that commitment?
            const rpc = process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL;
            let onchain: string | null = null;
            if (rpc) {
                const pub = createPublicClient({
                    chain: CHAIN_ID === 11155111 ? sepolia : mainnet,
                    transport: http(rpc),
                });
                const logs = await pub.getLogs({
                    address: data.project_address as `0x${string}`,
                    event: WINDOW_CLOSED,
                    fromBlock: 'earliest',
                });
                const contested = logs.filter((l) => l.args.contested);
                onchain = contested.at(-1)?.args.drawCommit ?? null;
            }
            setVerdict({
                state: 'done',
                replayOk,
                anchorOk: onchain !== null && onchain === replay.commitment,
                onchain,
            });
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
                    <div>
                        {verdict.onchain === null
                            ? '—︎ chain anchor unreachable from this browser'
                            : `${verdict.anchorOk ? '✓︎' : '✕︎'} commitment matches the on-chain anchor`}
                    </div>
                    <div className="ddt-verdict-line">
                        {verdict.replayOk && verdict.anchorOk
                            ? 'THE DRAW CHECKS OUT'
                            : verdict.replayOk
                                ? 'REPLAY OK — anchor unconfirmed'
                                : 'THIS TRANSCRIPT DOES NOT VERIFY'}
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
