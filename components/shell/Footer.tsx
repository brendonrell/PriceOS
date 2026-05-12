'use client';

/*
 * Footer
 *
 * The bottom strip on every page:
 *   PriceOS 1.0 · Connected · {gwei} · Blk {n} · About · Discord · Docs · Support
 *
 * Status / gwei / block read live data from /api/gas (edge-cached 12s,
 * same source as LinksView's gas widget and the GasTrackerModal). The
 * useGasData hook polls every 12s while the tab is visible and pauses
 * when hidden. `active = true` because the footer mounts on every page
 * and the user expects live values whenever the footer is on screen.
 * Edge cache collapses N coincident client polls into a single Alchemy
 * fetch per 12s window, so per-visitor cost is bounded.
 *
 * Until the first poll resolves, gwei + block render as em-dashes
 * (matching the same loading shape LinksView's gas widget uses).
 *
 * Click handlers (sim 5338 / 5347 / 5351):
 *   - "PriceOS 1.0" → open('priceos') — sim openPriceosModal().
 *     Opens the changelog modal (ASCII figlet logo + version list).
 *   - "About PD"   → showToast('About PD — coming soon').
 *   - "Docs"       → showToast('Docs — coming soon').
 */
import { useToast } from '../../lib/state/ToastContext';
import { useModal } from '../../lib/state/ModalContext';
import { useGasData } from '../../lib/hooks/useGasData';

export function Footer() {
    const { showToast } = useToast();
    const { open } = useModal();
    const { data } = useGasData(true);

    /* Match LinksView's gas formatting: 2 decimals under 10 gwei, 1
       decimal at/above 10 gwei. Em-dash on first paint / fetch error. */
    const gweiText = data
        ? `${
              data.standardGwei < 10
                  ? data.standardGwei.toFixed(2)
                  : data.standardGwei.toFixed(1)
          } gwei`
        : '— gwei';

    const blockText = data
        ? `Blk ${data.blockNumber.toLocaleString()}`
        : 'Blk —';

    return (
        <footer className="priceos-footer" id="priceosFooter">
            <span
                className="priceos-link priceos-label"
                title="Changelog"
                style={{ cursor: 'pointer' }}
                onClick={() => open('priceos')}
            >
                PriceOS 1.0
            </span>
            <span className="priceos-sep">·</span>
            <span className="priceos-status" id="footerStatus">Connected</span>
            <span className="priceos-sep">·</span>
            <span className="priceos-gwei" id="footerGwei">{gweiText}</span>
            <span className="priceos-sep">·</span>
            <span className="priceos-block" id="footerBlock">{blockText}</span>
            <span className="priceos-sep priceos-sep-desktop">·</span>
            <span className="priceos-footer-break" />
            <span
                className="priceos-link"
                title="About PD"
                style={{ cursor: 'pointer' }}
                onClick={() => showToast('About PD — coming soon')}
            >
                About PD
            </span>
            <span className="priceos-sep">·</span>
            <a
                className="priceos-link"
                href="https://discord.gg/mJteKZmg28"
                target="_blank"
                rel="noopener noreferrer"
            >
                Join Our Discord
            </a>
            <span className="priceos-sep">·</span>
            <span
                className="priceos-link"
                title="Docs"
                style={{ cursor: 'pointer' }}
                onClick={() => showToast('Docs — coming soon')}
            >
                Docs
            </span>
            <span className="priceos-sep">·</span>
            <a className="priceos-link" href="mailto:support@pricediscussion.com">
                Support
            </a>
        </footer>
    );
}
