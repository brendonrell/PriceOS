'use client';

/*
 * God Mode — PD Studio's private analytics-side layer. Renders ONLY for
 * allowlisted wallets (lib/studio/access.ts); spec lives in ClickUp only.
 * v1: the access list itself (add/remove backup wallets — seed wallets are
 * unremovable) + the platform-owner view of approved Sticker Packages.
 * Platform-wide analytics joins as the dashboard data lands.
 */

import { useState } from 'react';
import { isAddress } from 'viem';
import {
    STUDIO_ACCESS_SEED,
    addAccessWallet,
    loadAccessList,
    removeAccessWallet,
} from '../../lib/studio/access';
import { loadPackages } from '../../lib/studio/stickerPackages';

export function GodMode() {
    const [list, setList] = useState<string[]>(() => loadAccessList());
    const [input, setInput] = useState('');
    const [error, setError] = useState<string | null>(null);
    const packages = loadPackages();

    const add = () => {
        const addr = input.trim();
        if (!isAddress(addr)) {
            setError('Not a valid wallet address');
            return;
        }
        setError(null);
        setList(addAccessWallet(addr));
        setInput('');
    };

    return (
        <div className="pd-studio-section">
            <div className="pd-studio-section-title">God Mode</div>

            <label className="pd-studio-label">Access list — who sees the private layers</label>
            {list.map((a) => {
                const seed = STUDIO_ACCESS_SEED.some((s) => s.toLowerCase() === a.toLowerCase());
                return (
                    <div key={a} className="pd-studio-row">
                        <span className="pd-studio-row-name" style={{ fontFamily: "'Courier New', Courier, monospace", fontSize: 12, wordBreak: 'break-all' }}>
                            {a}
                        </span>
                        {seed ? (
                            <span className="pd-studio-row-stat">OWNER</span>
                        ) : (
                            <button
                                type="button"
                                className="pd-studio-chip"
                                onClick={() => setList(removeAccessWallet(a))}
                            >
                                REMOVE
                            </button>
                        )}
                    </div>
                );
            })}
            <div className="pd-studio-fieldrow" style={{ marginTop: 10 }}>
                <input
                    className="pd-studio-input"
                    placeholder="0x… wallet to add as backup"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                />
                <button type="button" className="pd-studio-btn" style={{ marginTop: 0, width: 'auto' }} onClick={add}>
                    ADD
                </button>
            </div>
            {error && <div className="pd-studio-err">{error}</div>}
            <p className="pd-studio-note" style={{ marginTop: 10 }}>
                Additions live on this device until the server store lands.
            </p>

            <label className="pd-studio-label">Sticker Packages — platform-wide</label>
            {packages.length === 0 ? (
                <p className="pd-studio-note">None approved yet.</p>
            ) : (
                packages.map((p) => (
                    <div key={p.id} className="pd-studio-row">
                        <span className="pd-studio-row-name">{p.name}</span>
                        <span className="pd-studio-row-stat">
                            {p.stickers.length} · {p.approvedBy.slice(0, 8)}…
                        </span>
                    </div>
                ))
            )}
        </div>
    );
}
