'use client';
import { useEffect, useState } from 'react';
import { useToast } from '../../lib/state/ToastContext';
import { useModal } from '../../lib/state/ModalContext';
import { useGasData } from '../../lib/hooks/useGasData';
import { moodOfDay, type Mood } from '../../lib/mood/mood';
import { natalChart, type NatalChart } from '../../lib/project/natal';

export function Footer() {
    const { showToast } = useToast();
    const { open } = useModal();
    const { data } = useGasData(true);

    /* Mood Ring easter egg — today's platform vibe (lib/mood). Computed
       after mount so SSR/CSR can't disagree at a midnight boundary (same
       pattern as the hero date slot). The ⌬ ring wears today's colour;
       tapping spells the vibe out. */
    const [mood, setMood] = useState<Mood | null>(null);
    /* Today's Stars — the natal sky over Montreal at today's UTC midnight
       (lib/project/natal, the same engine that stamps every Output's birth
       chart). Day-keyed like the Mood Ring, so the whole platform shares
       one sky. */
    const [stars, setStars] = useState<NatalChart | null>(null);
    useEffect(() => {
        setMood(moodOfDay());
        const now = new Date();
        setStars(
            natalChart(
                Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
            ),
        );
    }, []);

    const gweiText = data
        ? `${data.standardGwei < 10 ? data.standardGwei.toFixed(2) : data.standardGwei.toFixed(1)} gwei`
        : '— gwei';

    const blockText = data
        ? `Blk ${data.blockNumber.toLocaleString()}`
        : 'Blk —';

    return (
        <>
            {/* Three rows (Brendon, 2026-06-12): system row · easter-egg row
                (Mood Ring for now; more squeezed in here over time) · links
                row. The footer is deliberately under-used UI real estate. */}
            <footer className="priceos-footer" id="priceosFooter">
                <div className="priceos-footer-row">
                    <span className="priceos-link priceos-label" title="Changelog" style={{ cursor: 'pointer' }} onClick={() => open('priceos')}>
                        PriceOS 1.0
                    </span>
                    <span className="priceos-sep">·</span>
                    <span className="priceos-status" id="footerStatus">Connected</span>
                    <span className="priceos-sep">·</span>
                    <span className="priceos-gwei" id="footerGwei">{gweiText}</span>
                    <span className="priceos-sep">·</span>
                    <span className="priceos-block" id="footerBlock">{blockText}</span>
                </div>
                <div className="priceos-footer-row">
                    {mood && (
                        <span
                            className="priceos-link priceos-mood"
                            title="Mood Ring — tap to read it"
                            style={{ cursor: 'pointer' }}
                            onClick={() =>
                                showToast(`Mood Ring reads: ${mood.name}`)
                            }
                        >
                            <span
                                className="priceos-mood-ring"
                                style={{ color: mood.hex }}
                            >
                                ⌬&#xFE0E;
                            </span>{' '}
                            Today&apos;s Mood Ring Colour: {mood.hex}
                        </span>
                    )}
                    {mood && stars && <span className="priceos-sep">·</span>}
                    {stars && (
                        <span
                            className="priceos-link priceos-stars"
                            title="Today's Stars — every Output minted today is born under this sky"
                            style={{ cursor: 'pointer' }}
                            onClick={() =>
                                showToast(
                                    `Born today: SUN ${stars.sun.toUpperCase()} · MOON ${stars.moon.toUpperCase()} · RISING ${stars.rising.toUpperCase()}`,
                                )
                            }
                        >
                            Today&apos;s Stars: ☉&#xFE0E; {stars.sun} ☽&#xFE0E; {stars.moon} ↑&#xFE0E; {stars.rising}
                        </span>
                    )}
                </div>
                <div className="priceos-footer-row">
                    <span className="priceos-link" title="About PD" style={{ cursor: 'pointer' }} onClick={() => showToast('About PD: COMING SOON')}>
                        About PD
                    </span>
                    <span className="priceos-sep">·</span>
                    <a className="priceos-link" href="https://discord.gg/mJteKZmg28" onClick={(e) => { e.preventDefault(); window.open('https://discord.gg/mJteKZmg28', '_blank', 'noopener,noreferrer'); }}>
                        Join Our Discord
                    </a>
                    <span className="priceos-sep">·</span>
                    <span className="priceos-link" title="Docs" style={{ cursor: 'pointer' }} onClick={() => showToast('Docs: COMING SOON')}>
                        Docs
                    </span>
                    <span className="priceos-sep">·</span>
                    <a className="priceos-link" href="mailto:support@pricediscussion.com">
                        Support
                    </a>
                    <span className="priceos-sep">·</span>
                    {/* Studio — placeholder destination, wired later. */}
                    <span className="priceos-link" title="Studio">
                        Studio
                    </span>
                </div>
            </footer>
        </>
    );
}
