'use client';

/*
 * THE DEPANNEUR — the keychain capsule machine (Brendon, 2026-07-27:
 * "simulate it for our testers like we do with stickers and our simETH").
 *
 * The Montreal corner store; the machine lives inside. Test phase runs on
 * sim-ETH: CRANK debits the price server-side, a crypto-random seed rolls
 * the genes through the CONTRACT's own art (lib/keychains/engine — the
 * byte-faithful twin of PDKeychainRenderer), and the charm lands in the
 * account. THE CHAIN IS THE STREAK · THE FINISH IS THE RANK — both read
 * live, so every charm on the rack wears the keeper's current life.
 *
 * Chrome = the FI-PLUS panel (SuiteModal's shell, reused verbatim).
 * Doors (Brendon-named): the KEYCHAINS ⚷ button in the PriceSprite modal +
 * the ⚷ key in wallet settings. Out: × / Esc / backdrop.
 */

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useModal, useModalLayer } from '../../lib/state/ModalContext';
import { lockBodyScroll, unlockBodyScroll } from '../../lib/state/bodyScrollLock';
import { useAuth } from '../../lib/state/AuthContext';
import { useToast } from '../../lib/state/ToastContext';
import {
    CRANK_PRICE_ETH, charmSVG, charmTraits, isValidCharmName,
    type CharmRecord,
} from '../../lib/keychains/engine';
import { useKeychainRack, bustRack } from '../../lib/keychains/rack';

const VS15 = '︎';

function CharmArt({ charm, streak, rank, uid, className }: {
    charm: CharmRecord; streak: number; rank: number; uid: string; className?: string;
}) {
    const svg = useMemo(
        () => charmSVG(charm.seed, uid, streak, rank, charm.name),
        [charm.seed, charm.name, uid, streak, rank],
    );
    return <span className={className} dangerouslySetInnerHTML={{ __html: svg }} />;
}

export default function DepanneurModal() {
    const { close } = useModal();
    const { isOpen, isTopStacked } = useModalLayer('depanneur');
    const { siweAddress } = useAuth();
    const { showToast } = useToast();
    const rack = useKeychainRack(isOpen ? siweAddress : null);

    const [cranking, setCranking] = useState(false);
    const [fresh, setFresh] = useState<CharmRecord | null>(null);
    const [picked, setPicked] = useState<number | null>(null);
    const [nameDraft, setNameDraft] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setFresh(null); setPicked(null); setNameDraft('');
        lockBodyScroll();
        return () => unlockBodyScroll();
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, close]);

    const streak = rack?.streak ?? 0;
    const rank = rack?.rank ?? 0;
    const charms = rack?.charms ?? [];
    const shown: CharmRecord | null =
        (picked != null ? charms.find((c) => c.id === picked) : null) ?? fresh;

    const crank = async () => {
        if (!siweAddress || cranking) return;
        setCranking(true);
        setFresh(null); setPicked(null); setNameDraft('');
        try {
            const r = await fetch('/api/keychains/crank', { method: 'POST' });
            const j = (await r.json().catch(() => null)) as { charm?: CharmRecord; error?: string } | null;
            if (!r.ok || !j?.charm) {
                showToast(`Depanneur: ${j?.error ? j.error.toUpperCase() : 'CRANK FAILED'}`);
                return;
            }
            // Let the machine turn — the capsule tumbles, then the reveal.
            await new Promise((res) => setTimeout(res, 900));
            setFresh(j.charm);
            bustRack(siweAddress);
            showToast('Keychains: NEW CHARM');
        } finally {
            setCranking(false);
        }
    };

    const christen = async () => {
        if (!shown || !siweAddress || busy) return;
        const name = nameDraft.toUpperCase().trim();
        if (!isValidCharmName(name)) { showToast('Christen: 2–12 CHARS · A–Z 0–9 SPACE'); return; }
        setBusy(true);
        try {
            const r = await fetch('/api/keychains/christen', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ id: shown.id, name }),
            });
            if (r.ok) {
                if (fresh && fresh.id === shown.id) setFresh({ ...fresh, name });
                bustRack(siweAddress);
                setNameDraft('');
                showToast(`Christened: ${name}`);
            } else {
                const j = (await r.json().catch(() => null)) as { error?: string } | null;
                showToast(`Christen: ${j?.error ? j.error.toUpperCase() : 'FAILED'}`);
            }
        } finally { setBusy(false); }
    };

    const equip = async (id: number | null) => {
        if (!siweAddress || busy) return;
        setBusy(true);
        try {
            const r = await fetch('/api/keychains/equip', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ id }),
            });
            if (r.ok) {
                bustRack(siweAddress);
                showToast(id == null ? 'Charm: UNEQUIPPED' : 'Charm: EQUIPPED');
            }
        } finally { setBusy(false); }
    };

    if (!isOpen || typeof document === 'undefined') return null;

    return createPortal(
        <div
            className="sticker-mgr-plus-backdrop"
            data-stack-top={isTopStacked || undefined}
            role="dialog"
            aria-modal="true"
            aria-label="The Depanneur"
            onClick={close}
        >
            <div className="sticker-mgr-plus followers-plus dp-plus" onClick={(e) => e.stopPropagation()}>
                <div className="smgr-plus-head">
                    <span className="ambient-pop-title-text">
                        <span className="smgr-title-ic">{`⚷${VS15}`}</span>{' '}
                        <span className="smgr-title-words">THE DEPANNEUR</span>
                    </span>
                    <span
                        className="ambient-pop-close"
                        role="button"
                        tabIndex={0}
                        title="Close"
                        onClick={close}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); close(); } }}
                    >
                        {`×${VS15}`}
                    </span>
                </div>
                <div className="followers-plus-body dp-body">
                    {!siweAddress ? (
                        <p className="dp-note">Connect your wallet to crank the machine.</p>
                    ) : (
                        <>
                            {/* THE MACHINE */}
                            <div className="dp-machine">
                                <span className={`dp-machine-cap${cranking ? ' turning' : ''}`}>{`⚷${VS15}`}</span>
                                <div className="dp-machine-col">
                                    <span className="dp-machine-name">THE CAPSULE MACHINE</span>
                                    <span className="dp-machine-line">One crank · one charm · one of 13,063,680</span>
                                </div>
                                <button
                                    type="button"
                                    className={`dp-crank${cranking ? ' cranking' : ''}`}
                                    onClick={() => { void crank(); }}
                                    disabled={cranking}
                                >
                                    {cranking ? 'CRANKING…' : `CRANK · ${CRANK_PRICE_ETH.toFixed(3)} ETH`}
                                </button>
                            </div>

                            {/* THE REVEAL / the picked charm */}
                            {shown && (
                                <div className="dp-reveal">
                                    <CharmArt
                                        charm={shown}
                                        streak={streak}
                                        rank={rank}
                                        uid={`dp${shown.id}`}
                                        className="dp-charm-big"
                                    />
                                    <div className="dp-sheet">
                                        {shown.name && <div className="dp-sheet-name">{shown.name}</div>}
                                        <div className="dp-traits">
                                            {charmTraits(shown.seed, streak, rank).map((t) => (
                                                <span key={t.k} className="dp-trait">
                                                    <span className="dp-trait-k">{t.k.toUpperCase()}</span>
                                                    <span className="dp-trait-v">{t.v}</span>
                                                </span>
                                            ))}
                                        </div>
                                        <div className="dp-actions">
                                            {rack?.equipped === shown.id ? (
                                                <button type="button" className="dp-btn on" onClick={() => { void equip(null); }} disabled={busy}>UNEQUIP</button>
                                            ) : (
                                                <button type="button" className="dp-btn" onClick={() => { void equip(shown.id); }} disabled={busy}>EQUIP ON PROFILE</button>
                                            )}
                                        </div>
                                        {!shown.name && (
                                            <div className="dp-christen">
                                                <input
                                                    className="dp-christen-input"
                                                    type="text"
                                                    value={nameDraft}
                                                    placeholder="CHRISTEN — ONCE, EVER"
                                                    maxLength={12}
                                                    autoCapitalize="characters"
                                                    autoComplete="off"
                                                    spellCheck={false}
                                                    onChange={(e) => setNameDraft(e.target.value.toUpperCase().replace(/[^A-Z0-9 ]/g, ''))}
                                                    onKeyDown={(e) => { if (e.key === 'Enter') void christen(); }}
                                                />
                                                <button type="button" className="dp-btn" onClick={() => { void christen(); }} disabled={busy || !nameDraft.trim()}>NAME IT</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* MY CHARMS */}
                            <div className="dp-rack-head">
                                <span>MY CHARMS</span>
                                <span className="dp-rack-count">{charms.length}</span>
                            </div>
                            {charms.length === 0 ? (
                                <p className="dp-note">Nothing on the rack yet — crank the machine.</p>
                            ) : (
                                <div className="dp-rack">
                                    {charms.map((c) => (
                                        <button
                                            key={c.id}
                                            type="button"
                                            className={`dp-rack-slot${shown?.id === c.id ? ' on' : ''}`}
                                            onClick={() => { setPicked(c.id); setNameDraft(''); }}
                                            title={c.name || `Charm #${c.id}`}
                                        >
                                            <CharmArt charm={c} streak={streak} rank={rank} uid={`rk${c.id}`} className="dp-charm-mini" />
                                            {rack?.equipped === c.id && <span className="dp-rack-worn">WORN</span>}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>,
        document.body,
    );
}
