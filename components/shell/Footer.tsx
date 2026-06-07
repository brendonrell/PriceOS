/*
 * Footer
 *
 * The bottom strip on every page:
 *   PriceOS 1.0 · Connected · 0.044 gwei · Blk 22,140,887 · About · Discord · Docs · Support
 *
 * Step 2 ships static placeholder values for status / gwei / block —
 * these get wired to live RPC reads when the wallet provider lands.
 * Until then they're brand-vibes filler that matches the screenshot
 * mockup.
 *
 * Hidden via body.zen-mode (the workspace mode you mentioned). That
 * rule lives in globals.css; nothing for this component to do.
 *
 * "PriceOS 1.0" eventually opens the changelog modal — that handler
 * gets wired when the modal stack lands in step 7.
 */
export function Footer() {
    return (
        <footer className="priceos-footer" id="priceosFooter">
            <span className="priceos-link priceos-label" title="Changelog" style={{ cursor: 'pointer' }}>
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
            <span className="priceos-link" title="About PD">About PD</span>
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
            <span className="priceos-link" title="Docs">Docs</span>
            <span className="priceos-sep">·</span>
            <a className="priceos-link" href="mailto:support@pricediscussion.com">
                Support
            </a>
        </footer>
    );
}
