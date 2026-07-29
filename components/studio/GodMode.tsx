'use client';

/*
 * God Mode — PD Studio's private analytics-side layer. Renders ONLY for
 * allowlisted wallets (lib/studio/access.ts); spec lives in ClickUp only.
 * v1: the access list itself (add/remove backup wallets — seed wallets are
 * unremovable) + the platform-owner view of approved Sticker Packages.
 * Platform-wide analytics joins as the dashboard data lands.
 */

import { useEffect, useState } from 'react';
import { isAddress } from 'viem';
import {
    STUDIO_ACCESS_SEED,
    addAccessWallet,
    loadAccessList,
    removeAccessWallet,
} from '../../lib/studio/access';
import { loadPackages } from '../../lib/studio/stickerPackages';

/* ── BRENDON'S CARDS ──────────────────────────────────────────────────────
   The editorial slot on the home news rail, controlled from here. A card is
   four lines of copy and an optional link; live ones ride the rail with
   everything else, parked ones stay here until switched on. */
interface RailCard {
    id: number;
    glyph: string | null;
    tag: string;
    title: string;
    meta: string | null;
    href: string | null;
    active: boolean;
    position: number;
}

const BLANK = { glyph: '', tag: '', title: '', meta: '', href: '', position: '0' };

function BrendonsCards() {
    const [cards, setCards] = useState<RailCard[]>([]);
    const [form, setForm] = useState({ ...BLANK });
    const [editing, setEditing] = useState<number | null>(null);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const load = () => {
        fetch('/api/admin/news', { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => { if (d?.cards) setCards(d.cards as RailCard[]); })
            .catch(() => { /* the list simply stays as it was */ });
    };
    useEffect(load, []);

    const save = () => {
        if (!form.tag.trim() || !form.title.trim()) {
            setErr('A top line and a headline are required');
            return;
        }
        setErr(null);
        setBusy(true);
        fetch('/api/admin/news', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...form, id: editing ?? undefined, position: Number(form.position) || 0 }),
        })
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Save failed'))))
            .then(() => { setForm({ ...BLANK }); setEditing(null); load(); })
            .catch(() => setErr('Save failed'))
            .finally(() => setBusy(false));
    };

    const toggle = (c: RailCard) => {
        fetch('/api/admin/news', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...c, active: !c.active }),
        }).then(load).catch(() => setErr('Save failed'));
    };

    const remove = (id: number) => {
        fetch(`/api/admin/news?id=${id}`, { method: 'DELETE' })
            .then(load)
            .catch(() => setErr('Delete failed'));
    };

    const edit = (c: RailCard) => {
        setEditing(c.id);
        setForm({
            glyph: c.glyph ?? '', tag: c.tag, title: c.title,
            meta: c.meta ?? '', href: c.href ?? '', position: String(c.position),
        });
    };

    const field = (k: keyof typeof BLANK, placeholder: string) => (
        <input
            className="pd-studio-input"
            placeholder={placeholder}
            value={form[k]}
            onChange={(e) => setForm({ ...form, [k]: e.target.value })}
        />
    );

    return (
        <>
            <label className="pd-studio-label">Brendon&apos;s Cards — the home rail</label>
            {cards.length === 0 ? (
                <p className="pd-studio-note">No cards yet.</p>
            ) : (
                cards.map((c) => (
                    <div key={c.id} className="pd-studio-row">
                        <span className="pd-studio-row-name">
                            {c.glyph ? `${c.glyph} ` : ''}{c.tag} · {c.title}
                        </span>
                        <span className="pd-studio-row-stat">
                            <button type="button" className="pd-studio-chip" onClick={() => toggle(c)}>
                                {c.active ? 'LIVE' : 'PARKED'}
                            </button>
                            <button type="button" className="pd-studio-chip" onClick={() => edit(c)}>EDIT</button>
                            <button type="button" className="pd-studio-chip" onClick={() => remove(c.id)}>REMOVE</button>
                        </span>
                    </div>
                ))
            )}

            <div className="pd-studio-fieldrow" style={{ marginTop: 10 }}>
                {field('tag', 'Top line — e.g. ANNOUNCEMENT')}
                {field('glyph', 'Glyph')}
            </div>
            <div className="pd-studio-fieldrow" style={{ marginTop: 6 }}>
                {field('title', 'Headline — the part the eye lands on')}
            </div>
            <div className="pd-studio-fieldrow" style={{ marginTop: 6 }}>
                {field('meta', 'Detail line')}
                {field('position', 'Order')}
            </div>
            <div className="pd-studio-fieldrow" style={{ marginTop: 6 }}>
                {field('href', 'Link — where tapping it goes (optional)')}
                <button
                    type="button"
                    className="pd-studio-btn"
                    style={{ marginTop: 0, width: 'auto' }}
                    disabled={busy}
                    onClick={save}
                >
                    {editing ? 'SAVE' : 'ADD'}
                </button>
            </div>
            {editing && (
                <button
                    type="button"
                    className="pd-studio-chip"
                    style={{ marginTop: 6 }}
                    onClick={() => { setEditing(null); setForm({ ...BLANK }); }}
                >
                    CANCEL EDIT
                </button>
            )}
            {err && <div className="pd-studio-err">{err}</div>}
            <p className="pd-studio-note" style={{ marginTop: 10 }}>
                Live cards show to everyone on the home rail within a minute.
            </p>
        </>
    );
}

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

            <BrendonsCards />

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
