'use client';

/*
 * Footer
 *
 * The bottom strip on every page:
 *   PriceOS 1.0 · Connected · 0.044 gwei · Blk 22,140,887 · About · Discord · Docs · Support
 *
 * Status / gwei / block ship as static placeholder values — these get
 * wired to live RPC reads when the wallet provider lands. Until then
 * they're brand-vibes filler that matches the screenshot mockup.
 *
 * Hidden via body.zen-mode (the workspace mode you mentioned). That
 * rule lives in globals.css; nothing for this component to do.
 *
 * Click handlers (sim 5338 / 5347 / 5351):
 *   - "PriceOS 1.0" → open('priceos') — sim openPriceosModal().
 *     Opens the changelog modal (ASCII figlet logo + version list).
 *   - "About PD"   → showToast('About PD — coming soon').
 *   - "Docs"       → showToast('Docs — coming soon').
 */
import { useToast } from '../../lib/state/ToastContext';
import { useModal } from '../../lib/state/ModalContext';

export function Footer() {
    const { showToast } = useToast();
    const { open } = useModal();

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
            <span className="priceos-gwei" id="footerGwei">0.044 gwei</span>
            <span className="priceos-sep">·</span>
            <span className="priceos-block" id="footerBlock">Blk 22,140,887</span>
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
                href="https://discord.pricediscussion.com"
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
