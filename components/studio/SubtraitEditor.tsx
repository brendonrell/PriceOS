'use client';

/*
 * SubtraitEditor — the upload flow's Traits & Subtraits surface.
 *
 * Flow (docs/studio/upload-and-testing.md · lib/project/types.ts):
 *   1. The uploaded script publishes its per-token traits by setting
 *      `window.$traits = { TraitName: "Value" }` during its render.
 *   2. SCAN renders a sample of hashes in hidden harvest iframes
 *      (buildHarvestEnvelope posts each render's $traits back here) and folds
 *      the distinct values into the draft's traitSchema — flat traits at first.
 *   3. The artist groups a trait's values into named subtrait buckets
 *      (e.g. Palette → Main / Special). Every value belongs to exactly one
 *      bucket; the grouping is schema, editable without re-minting.
 *
 * Traits are OPTIONAL — a script that publishes none simply carries the
 * platform traits like any Output. Nothing here blocks publish.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Hex } from 'viem';
import { simulateRun, buildHarvestEnvelope } from '../../lib/studio/drafts';
import type { TraitSchema } from '../../lib/project/types';
import {
    isHarvestMsg,
    mergeSample,
    assignmentOf,
    unbucketedValues,
    writeBuckets,
    dropTrait,
    incompleteTraits,
    type TraitSample,
} from '../../lib/studio/traits';

const SAMPLE_SIZES = [50, 200, 500] as const;
const CHUNK = 12; // hidden iframes rendered at once — phone-safe batches
const BATCH_TIMEOUT_MS = 4000; // finalize a batch even if a render never reports

interface Props {
    script: string;
    traitSchema?: TraitSchema;
    onChange: (schema: TraitSchema | undefined) => void;
}

export function SubtraitEditor({ script, traitSchema, onChange }: Props) {
    const [sample, setSample] = useState<number>(200);
    const [scanning, setScanning] = useState(false);
    const [scanned, setScanned] = useState(0);
    const [batch, setBatch] = useState<{ hash: Hex; tokenId: number }[]>([]);

    /* Editor-only bucket lists per trait (includes freshly-added empty buckets
       that aren't in the stored schema yet). Names are seeded from the schema. */
    const [bucketNames, setBucketNames] = useState<Record<string, string[]>>({});
    const [newBucket, setNewBucket] = useState<Record<string, string>>({});

    /* Scan machinery — refs so the message listener never reads stale state. */
    const queueRef = useRef<{ hash: Hex; tokenId: number }[]>([]);
    const collectedRef = useRef<Map<number, TraitSample | null>>(new Map());
    const expectedRef = useRef(0);
    const activeRef = useRef(false);
    const workingRef = useRef<TraitSchema | undefined>(undefined);
    const timerRef = useRef<number | null>(null);

    const traits = traitSchema?.traits ?? [];

    /* Seed editor bucket names from the schema when the trait set changes. */
    useEffect(() => {
        setBucketNames((prev) => {
            const next = { ...prev };
            for (const t of traits) {
                const fromSchema = (t.subtraits ?? []).map((s) => s.name);
                const have = next[t.name] ?? [];
                const merged = [...have];
                for (const n of fromSchema) if (!merged.includes(n)) merged.push(n);
                next[t.name] = merged;
            }
            return next;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [traits.map((t) => t.name).join('|')]);

    const finishScan = useCallback(() => {
        activeRef.current = false;
        if (timerRef.current != null) { window.clearTimeout(timerRef.current); timerRef.current = null; }
        setScanning(false);
        setBatch([]);
    }, []);

    const finalizeBatch = useCallback(() => {
        if (timerRef.current != null) { window.clearTimeout(timerRef.current); timerRef.current = null; }
        for (const smp of collectedRef.current.values()) {
            workingRef.current = mergeSample(workingRef.current, smp);
        }
        onChange(workingRef.current && workingRef.current.traits.length ? workingRef.current : undefined);
        setScanned((n) => n + expectedRef.current);
        collectedRef.current = new Map();
        setBatch([]);
        // Let the iframes unmount before mounting the next batch.
        window.setTimeout(() => {
            if (!activeRef.current) return;
            if (queueRef.current.length === 0) { finishScan(); return; }
            const chunk = queueRef.current.splice(0, CHUNK);
            expectedRef.current = chunk.length;
            collectedRef.current = new Map();
            setBatch(chunk);
            timerRef.current = window.setTimeout(finalizeBatch, BATCH_TIMEOUT_MS);
        }, 30);
    }, [onChange, finishScan]);

    /* One message listener for the whole editor lifetime. */
    useEffect(() => {
        const handler = (e: MessageEvent) => {
            if (!activeRef.current) return;
            if (!isHarvestMsg(e.data)) return;
            collectedRef.current.set(e.data.tokenId, e.data.traits);
            if (collectedRef.current.size >= expectedRef.current) finalizeBatch();
        };
        window.addEventListener('message', handler);
        return () => {
            window.removeEventListener('message', handler);
            if (timerRef.current != null) window.clearTimeout(timerRef.current);
            activeRef.current = false;
        };
    }, [finalizeBatch]);

    const startScan = () => {
        if (scanning || !script.trim()) return;
        const hashes = simulateRun(sample).hashes as Hex[];
        queueRef.current = hashes.map((h, i) => ({ hash: h, tokenId: i + 1 }));
        workingRef.current = traitSchema;
        collectedRef.current = new Map();
        activeRef.current = true;
        setScanned(0);
        setScanning(true);
        const chunk = queueRef.current.splice(0, CHUNK);
        expectedRef.current = chunk.length;
        setBatch(chunk);
        timerRef.current = window.setTimeout(finalizeBatch, BATCH_TIMEOUT_MS);
    };

    const stopScan = () => finishScan();

    /* ── Bucket editing ── */
    const addBucket = (traitName: string) => {
        const name = (newBucket[traitName] ?? '').trim();
        if (!name) return;
        setBucketNames((prev) => {
            const have = prev[traitName] ?? [];
            if (have.includes(name)) return prev;
            return { ...prev, [traitName]: [...have, name] };
        });
        setNewBucket((prev) => ({ ...prev, [traitName]: '' }));
    };

    const cycleValue = (traitName: string, value: string) => {
        const t = traits.find((x) => x.name === traitName);
        if (!t) return;
        const names = bucketNames[traitName] ?? [];
        const order = ['', ...names];
        const assign = assignmentOf(t);
        const cur = assign[value] ?? '';
        const next = order[(order.indexOf(cur) + 1) % order.length];
        const nextAssign = { ...assign };
        if (next) nextAssign[value] = next; else delete nextAssign[value];
        onChange(writeBuckets(traitSchema!, traitName, names, nextAssign));
    };

    const assignRemaining = (traitName: string, bucket: string) => {
        const t = traits.find((x) => x.name === traitName);
        if (!t) return;
        const names = bucketNames[traitName] ?? [];
        const assign = assignmentOf(t);
        for (const v of t.values) if (!assign[v]) assign[v] = bucket;
        onChange(writeBuckets(traitSchema!, traitName, names, assign));
    };

    const clearBuckets = (traitName: string) => {
        const names = bucketNames[traitName] ?? [];
        onChange(writeBuckets(traitSchema!, traitName, names, {}));
    };

    const removeTrait = (traitName: string) => {
        if (traitSchema) onChange(dropTrait(traitSchema, traitName));
        setBucketNames((prev) => { const n = { ...prev }; delete n[traitName]; return n; });
    };

    const incomplete = incompleteTraits(traitSchema);
    const hasScript = !!script.trim();

    return (
        <div className="pd-studio-section">
            <div className="pd-studio-section-title">Traits &amp; Subtraits</div>
            <p className="pd-studio-note">
                Your script publishes a trait by setting{' '}
                <code>window.$traits = {'{'} Palette: &quot;COOKIES&quot; {'}'}</code> as it renders.
                Scan a run to pull each trait&apos;s values, then group them into{' '}
                <b>Subtraits</b> — named buckets where every value lands in exactly one.
            </p>

            {/* Scan controls */}
            <div className="pd-studio-count-row">
                {SAMPLE_SIZES.map((n) => (
                    <button
                        key={n}
                        type="button"
                        className={`pd-studio-chip${sample === n ? ' active' : ''}`}
                        onClick={() => setSample(n)}
                        disabled={scanning}
                    >
                        {n}
                    </button>
                ))}
            </div>
            {!scanning ? (
                <button
                    type="button"
                    className="pd-studio-btn"
                    disabled={!hasScript}
                    onClick={startScan}
                >
                    {hasScript ? `SCAN ${sample} FOR TRAITS` : 'UPLOAD A SCRIPT FIRST'}
                </button>
            ) : (
                <button type="button" className="pd-studio-btn primary" onClick={stopScan}>
                    SCANNING… {scanned} / {sample} — TAP TO STOP
                </button>
            )}

            {/* Hidden harvest iframes — run the script off-screen to read $traits. */}
            {batch.length > 0 && (
                <div className="pd-studio-harvest" aria-hidden="true">
                    {batch.map((b) => (
                        <iframe
                            key={`${b.tokenId}-${b.hash}`}
                            sandbox="allow-scripts"
                            srcDoc={buildHarvestEnvelope(script, b.hash, b.tokenId)}
                            title={`harvest ${b.tokenId}`}
                        />
                    ))}
                </div>
            )}

            {/* No traits yet */}
            {traits.length === 0 && (
                <p className="pd-studio-note">
                    {scanned > 0 && !scanning
                        ? 'That run published no traits. Set window.$traits in your script to define them — or leave it: every Output still carries PD’s platform traits.'
                        : 'No artist traits yet. Scan once your script sets window.$traits.'}
                </p>
            )}

            {/* Per-trait bucket editor */}
            {traits.map((t) => {
                const names = bucketNames[t.name] ?? [];
                const assign = assignmentOf(t);
                const left = unbucketedValues(t).length;
                return (
                    <div key={t.name} className="pd-studio-trait">
                        <div className="pd-studio-trait-head">
                            <span className="pd-studio-trait-name">{t.name}</span>
                            <span className="pd-studio-trait-meta">
                                {t.values.length} values{names.length > 0 ? ` · ${left} unbucketed` : ''}
                            </span>
                            <button
                                type="button"
                                className="pd-studio-trait-x"
                                title={`Remove ${t.name}`}
                                onClick={() => removeTrait(t.name)}
                            >
                                ✕
                            </button>
                        </div>

                        {/* Buckets + add-bucket + per-bucket sweep */}
                        <div className="pd-studio-buckets">
                            {names.map((bn) => (
                                <button
                                    key={bn}
                                    type="button"
                                    className="pd-studio-chip active"
                                    title={`Assign all remaining ${t.name} values to ${bn}`}
                                    onClick={() => assignRemaining(t.name, bn)}
                                >
                                    {bn} +rest
                                </button>
                            ))}
                            <input
                                className="pd-studio-input pd-studio-bucket-add"
                                placeholder="+ bucket (e.g. Main)"
                                value={newBucket[t.name] ?? ''}
                                onChange={(e) => setNewBucket((p) => ({ ...p, [t.name]: e.target.value }))}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addBucket(t.name); } }}
                            />
                            <button type="button" className="pd-studio-chip" onClick={() => addBucket(t.name)}>ADD</button>
                            {names.length > 0 && (
                                <button type="button" className="pd-studio-chip" onClick={() => clearBuckets(t.name)}>CLEAR</button>
                            )}
                        </div>

                        {/* Values — tap a chip to cycle it through the buckets. */}
                        <div className="pd-studio-values">
                            {t.values.map((v) => {
                                const b = assign[v];
                                return (
                                    <button
                                        key={v}
                                        type="button"
                                        className={`pd-studio-vchip${b ? ' assigned' : ''}`}
                                        title={names.length ? 'Tap to change bucket' : 'Add a bucket first'}
                                        onClick={() => cycleValue(t.name, v)}
                                    >
                                        <span className="pd-studio-vchip-name">{v}</span>
                                        {b && <span className="pd-studio-vchip-tag">{b}</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );
            })}

            {incomplete.length > 0 && (
                <p className="pd-studio-note pd-studio-warn">
                    {incomplete.join(', ')}: some values aren&apos;t in a bucket yet. Subtraits show
                    once every value is placed — until then the trait stays flat.
                </p>
            )}
        </div>
    );
}
