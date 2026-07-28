'use client';

/*
 * PriceAccountPanel — the official $PRICE information surface, shown in place
 * of the Showcase on the @price platform account (Brendon, 2026-07-28).
 *
 * EVERY FACT HERE COMES FROM THE USER DOCS — content/docs/price-token/{overview,
 * tokenomics,contract,no-platform-utility}.md. Nothing is invented and nothing
 * is estimated: if a number or claim is not in those pages it is not on this
 * panel. The docs are the thing users read; this page is the same material at
 * the account it describes, so the two can never drift into disagreeing.
 *
 * Anatomy is the platform's own panel vocabulary, reused verbatim — the
 * attr-group head, the attr-grid tiles, and the nbhd-note prose block that the
 * Counterparties and Neighbourhood panels already ship. No new chrome.
 *
 * Naming note: fxhash, WTBS and newpdogs are OUTSIDE names, so they are written
 * plainly — an @ on PD means a handle on PD.
 */

import { PRICE_TOKEN_ADDRESS } from '../../lib/platform/accounts';

const ETHERSCAN = `https://etherscan.io/token/${PRICE_TOKEN_ADDRESS}`;

/* The distribution table, verbatim from the Tokenomics page. Pushed in full at
   TGE — nothing to claim, no deadline, no proof to submit. */
const ALLOCATIONS: ReadonlyArray<{ who: string; share: string; tokens: string }> = [
    { who: 'fxhash community', share: '75%', tokens: '75,000,000' },
    { who: 'Founder',          share: '10%', tokens: '10,000,000' },
    { who: 'WTBS',             share: '10%', tokens: '10,000,000' },
    { who: 'newpdogs',         share: '5%',  tokens: '5,000,000'  },
];

/* The exclusions, verbatim from the No Platform Utility page. */
const NO_UTILITY: readonly string[] = [
    'No mint privileges — no priority, no allowlist, no early window.',
    'No discounts. The platform share of a primary mint is the same for everyone.',
    'No governance rights. PD is not a DAO.',
    'No revenue claim — no dividend, no buyback, no profit share, no redemption.',
    'No exclusive access. Nothing on PD is gated on holding it.',
    'No staking, no emission, no yield.',
    'No price floor. PD operates no market in $PRICE and seeds no liquidity.',
];

export default function PriceAccountPanel() {
    return (
        <div className="price-acct">
            <div className="attr-group-head">
                <span className="attr-group-name">$PRICE · the token</span>
                <span className="attr-group-count">100M</span>
            </div>

            <div className="nbhd-note">
                $PRICE is a transferable ERC-20 distributed to a community as a cultural
                artifact. It confers no privileges, no governance rights, no discounts, no
                revenue claim and no special access on Price Discussion. That is not a gap
                in the design — it is the design.
            </div>

            <div className="attr-grid">
                <div className="attr-tile">
                    <span className="attr-tile-label">Supply</span>
                    <span className="attr-tile-value">100,000,000</span>
                </div>
                <div className="attr-tile">
                    <span className="attr-tile-label">Symbol</span>
                    <span className="attr-tile-value">PRICE</span>
                </div>
                <div className="attr-tile">
                    <span className="attr-tile-label">Standard</span>
                    <span className="attr-tile-value">ERC-20</span>
                </div>
                <div className="attr-tile">
                    <span className="attr-tile-label">Decimals</span>
                    <span className="attr-tile-value">18</span>
                </div>
                <div className="attr-tile">
                    <span className="attr-tile-label">Network</span>
                    <span className="attr-tile-value">Ethereum</span>
                </div>
                <div className="attr-tile">
                    <span className="attr-tile-label">Deployed</span>
                    <span className="attr-tile-value">3 JUL 2026</span>
                </div>
            </div>

            <div className="attr-group-head">
                <span className="attr-group-name">The contract</span>
            </div>
            <div className="nbhd-note">
                Minted once at deployment and fixed forever. There is no mint function, no
                burn, no admin role, no pause, no blacklist and no upgrade path — the
                deployed bytecode is permanent. The contract is a constructor and an
                import; the simplicity is the security model.
            </div>
            <a className="price-acct-addr" href={ETHERSCAN} target="_blank" rel="noopener noreferrer">
                {PRICE_TOKEN_ADDRESS}
            </a>

            <div className="attr-group-head">
                <span className="attr-group-name">Distribution</span>
                <span className="attr-group-count">{ALLOCATIONS.length}</span>
            </div>
            <div className="nbhd-note">
                Pushed directly to recipient wallets in full at launch — nothing to claim,
                no deadline, no proof to submit. No treasury, no reserve, no vesting and no
                future allocation: distribution completes at launch, and the roadmap with it.
            </div>
            <div className="starred-rows price-acct-rows">
                {ALLOCATIONS.map((a) => (
                    <div key={a.who} className="starred-row">
                        <div className="starred-row-meta">
                            <span className="starred-row-id">{a.who}</span>
                            <span className="starred-row-sub">{a.tokens} $PRICE</span>
                        </div>
                        <span className="price-acct-share">{a.share}</span>
                    </div>
                ))}
            </div>

            <div className="attr-group-head">
                <span className="attr-group-name">No platform utility</span>
            </div>
            <div className="price-acct-list">
                {NO_UTILITY.map((line) => (
                    <div key={line} className="nbhd-note">{line}</div>
                ))}
            </div>

            <div className="attr-group-head">
                <span className="attr-group-name">Read more</span>
            </div>
            <div className="price-acct-links">
                <a className="pill pill-l2" href="/docs/price-token/overview">OVERVIEW</a>
                <a className="pill pill-l2" href="/docs/price-token/tokenomics">TOKENOMICS</a>
                <a className="pill pill-l2" href="/docs/price-token/contract">CONTRACT</a>
                <a className="pill pill-l2" href="/docs/price-token/no-platform-utility">NO UTILITY</a>
            </div>
        </div>
    );
}
