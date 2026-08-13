'use client';

/*
 * PriceDocsPanel — the four $PRICE doc pages (Overview, Tokenomics, Contract,
 * No Platform Utility), rendered in the platform panel's own vocabulary
 * (attr-group head, attr-grid tiles, nbhd-note prose) so they read as part of
 * the account instead of a link out to somewhere else (Brendon, 2026-08-13 —
 * these lived behind "Read more" pills on the Token tab; now they're their
 * own sub-tabs under +More, and the Token tab's condensed panel is all that's
 * left of the old "Read more" row).
 *
 * EVERY FACT HERE COMES FROM THE USER DOCS — content/docs/price-token/{overview,
 * tokenomics,contract,no-platform-utility}.md, same rule as PriceAccountPanel.
 * This is the fuller version of that page's material, not a rewrite of it —
 * the two must never drift into disagreeing.
 */

import type { ReactNode } from 'react';
import { PRICE_TOKEN_ADDRESS } from '../../lib/platform/accounts';

const ETHERSCAN = `https://etherscan.io/token/${PRICE_TOKEN_ADDRESS}`;
const REPO = 'https://github.com/brendonrell/pd-price-token';

const ALLOCATIONS: ReadonlyArray<{ who: string; share: string; tokens: string; note: string }> = [
    { who: 'fxhash community', share: '75%', tokens: '75,000,000', note: 'The validated fxhash community wallet list, flat amount per wallet' },
    { who: 'Founder',          share: '10%', tokens: '10,000,000', note: 'Brendon, one labeled wallet, no vesting' },
    { who: 'WTBS',             share: '10%', tokens: '10,000,000', note: 'A media allocation, deliberately founder-sized' },
    { who: 'newpdogs',         share: '5%',  tokens: '5,000,000',  note: 'The early members of the PD Discord, split evenly' },
];

const NOT_LIST: ReadonlyArray<{ label: string; body: string }> = [
    { label: 'Not an investment in Price Discussion.', body: 'No share, equity, ownership, or economic interest in PD as a platform or business.' },
    { label: 'Not a claim on revenue.', body: "Platform proceeds flow through PD's on-chain fee mechanics to PD's wallets; $PRICE holders have no claim on them." },
    { label: 'Not a governance token.', body: 'PD is not a DAO. There is no vote, no proposal system, no governance role.' },
    { label: 'Not a utility token.', body: 'No mint privileges, no fee discounts, no early access, no gated anything.' },
    { label: 'Not a security, by structural intent.', body: "The design forecloses the expectation-of-profit-from-others'-efforts shape; final classification belongs to counsel and regulators." },
];

const FUNCTIONS: readonly string[] = ['name', 'symbol', 'decimals', 'totalSupply', 'balanceOf', 'transfer', 'approve', 'allowance', 'transferFrom'];

const NOT_IN_CONTRACT: ReadonlyArray<{ label: string; body: string }> = [
    { label: 'No public mint.', body: 'The single deployment-time mint is the only one possible.' },
    { label: 'No burn.', body: 'Plain OZ ERC-20, not ERC20Burnable — supply cannot decrease.' },
    { label: 'No claim or distribution functions.', body: 'No Merkle root, no claim flow, no allowlist.' },
    { label: 'No admin role.', body: 'No owner, no pauser, no blacklister — no role of any kind.' },
    { label: 'No pause, no blacklist, no freeze.', body: 'Transfers cannot be halted or filtered.' },
    { label: 'No upgradeability.', body: 'Not a proxy; the deployed bytecode is the permanent implementation.' },
    { label: 'No fee-on-transfer, no rebasing.', body: 'Balances change only by explicit transfer.' },
];

const NO_UTILITY: ReadonlyArray<{ label: string; body: string }> = [
    { label: 'No mint privileges.', body: 'Holding $PRICE grants no mint priority, no allowlist position, no early window. Every mint on PD is open on the Project\u2019s own terms.' },
    { label: 'No discounts or fee reductions.', body: 'The 5% platform share of primary mints applies identically to every collector regardless of holdings.' },
    { label: 'No governance rights.', body: 'No vote on features, the filter, or contracts (which are non-upgradeable anyway). PD is not a DAO; $PRICE is not its governance token.' },
    { label: 'No revenue claim.', body: "The platform's primary fee and secondary royalty flow to PD's wallets through PD's on-chain fee mechanics; holders have no claim — no dividend, no buyback, no profit share, no redemption." },
    { label: 'No exclusive access.', body: 'No gated docs, no holder-only views, no exclusive channels or invitations.' },
    { label: 'No staking rewards.', body: 'No platform staking program, no emission, no yield.' },
    { label: 'No price floor or market commitment.', body: 'PD operates no market in $PRICE, seeds no liquidity, and makes no market-making promises. Price discovery, if any, happens on third-party venues without PD\u2019s intervention.' },
];

const WHY_DESIGN: ReadonlyArray<{ label: string; body: string }> = [
    { label: 'Legal positioning.', body: 'A token with no platform utility, no revenue claim, and no special access does not present the expectation-of-profit-from-the-efforts-of-others shape that the Howey framework asks about. This is the rationale for the design, not legal advice; classification belongs to counsel and regulators.' },
    { label: 'Architectural integrity.', body: "A platform whose mechanics depend on token holdings is a platform whose mechanics shift as distribution shifts. PD's behavior is determined by its immutable contracts and its filter — not by who holds a token on any given day." },
    { label: 'Cultural framing.', body: 'PD treats $PRICE as a memetic artifact given to a community with aesthetic affinity for the thesis. A token that does not need to do anything is free to mean something.' },
    { label: 'Long-term stability.', body: 'Utility creates governance pressure: holders who bought expecting utility lobby for more, then for expansion, then for revenue. The end state of that trajectory is capture. PD forecloses it at the contract level.' },
];

const HOW_ENFORCED: ReadonlyArray<{ label: string; body: string }> = [
    { label: 'At the contract level.', body: "The $PRICE contract is a vanilla ERC-20 with no integration points: PD's factory and Projects never call it or read its balances. For $PRICE to gain utility, PD would need to deploy modified versions of its contracts — and existing Projects are immutable, so no deployed art could ever be moved onto them." },
    { label: 'At the platform level.', body: 'PriceOS does not read $PRICE balances. Every surface renders identically regardless of holdings — no gated view, no holder filter, no balance display anywhere it would imply utility.' },
    { label: 'At the policy level.', body: 'These pages disclaim platform utility in plain language, permanently and publicly, so the structural choice cannot be silently reversed.' },
];

function Group({ name, count, children }: { name: string; count?: string | number; children: ReactNode }) {
    return (
        <>
            <div className="attr-group-head">
                <span className="attr-group-name">{name}</span>
                {count !== undefined && <span className="attr-group-count">{count}</span>}
            </div>
            {children}
        </>
    );
}

function LabeledNote({ label, body }: { label: string; body: string }) {
    return (
        <div className="nbhd-note">{label} {body}</div>
    );
}

export function PriceOverviewPanel() {
    return (
        <div className="price-acct">
            <div className="nbhd-note">
                $PRICE is Price Discussion&rsquo;s ERC-20 token, live on Ethereum mainnet: 100,000,000
                total supply, minted once at deployment, fixed forever. It is distributed to the
                communities PD comes from — and it has zero platform utility on Price Discussion.
                That is not a gap in the design; it is the design.
            </div>

            <Group name="What $PRICE is">
                <div className="nbhd-note">
                    A vanilla fixed-supply ERC-20 — the entire contract is a constructor and an
                    import. 18 decimals, 100,000,000 supply minted in a single deployment-time
                    mint, no further mint authority, no admin role, no upgrade path. Transferable
                    like any token, listed wherever third parties choose to list it, priced by
                    whatever market forms around it.
                </div>
                <div className="nbhd-note">
                    It is connected to Price Discussion by name and origin: it carries PD&rsquo;s
                    branding and was distributed to the community PD&rsquo;s thesis aligns with. It
                    has no contract-level connection to any other PD system — PD&rsquo;s contracts
                    do not read $PRICE balances; no feature behaves differently for holders.
                </div>
            </Group>

            <Group name="What $PRICE is not">
                <div className="price-acct-list">
                    {NOT_LIST.map((n) => <LabeledNote key={n.label} {...n} />)}
                </div>
            </Group>

            <Group name="The distribution shape" count={ALLOCATIONS.length}>
                <div className="starred-rows price-acct-rows">
                    {ALLOCATIONS.map((a) => (
                        <div key={a.who} className="starred-row">
                            <div className="starred-row-meta">
                                <span className="starred-row-id">{a.who}</span>
                                <span className="starred-row-sub">{a.tokens} $PRICE — {a.note}</span>
                            </div>
                            <span className="price-acct-share">{a.share}</span>
                        </div>
                    ))}
                </div>
                <div className="nbhd-note">
                    Distribution is a direct batch push at TGE — nothing to claim, no deadline,
                    no proof to submit.
                </div>
            </Group>

            <Group name="The contract">
                <div className="nbhd-note">
                    Live on Ethereum mainnet, deployed 2026-07-03. Full technical reference —
                    functions, deliberate absences, verification — on the Contract tab.
                </div>
                <a className="price-acct-addr" href={ETHERSCAN} target="_blank" rel="noopener noreferrer">
                    {PRICE_TOKEN_ADDRESS}
                </a>
            </Group>
        </div>
    );
}

export function PriceTokenomicsPanel() {
    return (
        <div className="price-acct">
            <div className="nbhd-note">
                $PRICE is not, and is not intended to be, an investment, a security, a share of
                Price Discussion, or a claim on any revenue, asset, or service PD operates. This
                page describes the distribution of a memetic and cultural artifact, not the
                structuring of a financial instrument.
            </div>

            <Group name="Total supply">
                <div className="nbhd-note">
                    100,000,000 tokens (\u00d7 10^18 base units), minted once at deployment. After
                    that mint: no <code>mint</code> function exists for further minting, no admin
                    role holds mint authority (no admin role exists at all), and no{' '}
                    <code>burn</code> function exists either — supply is permanently 100,000,000;
                    tokens leave circulation only the old-fashioned way, by transfer to an
                    unrecoverable address.
                </div>
            </Group>

            <Group name="Distribution" count={ALLOCATIONS.length}>
                <div className="nbhd-note">Allocated as follows and distributed in full at TGE:</div>
                <div className="starred-rows price-acct-rows">
                    {ALLOCATIONS.map((a) => (
                        <div key={a.who} className="starred-row">
                            <div className="starred-row-meta">
                                <span className="starred-row-id">{a.who}</span>
                                <span className="starred-row-sub">{a.tokens} $PRICE — {a.note}</span>
                            </div>
                            <span className="price-acct-share">{a.share}</span>
                        </div>
                    ))}
                </div>
                <div className="nbhd-note">
                    Any rounding remainder left in the deployer wallet after distribution goes to
                    an unrecoverable address at TGE; the deployer ends at exactly zero. There is
                    no treasury, no reserve, no future allocation — distribution completes at
                    TGE, and the roadmap with it.
                </div>
            </Group>

            <Group name="Distribution mechanics">
                <div className="nbhd-note">
                    All allocations are pushed directly to recipient wallets. Nothing to claim,
                    no deadline, no Merkle proof, no action required from any recipient — tokens
                    simply arrive. The community batch send executes through the public disperse
                    contract (deployed 2018, widely used) as batch transactions from the deployer
                    wallet. The full recipient list is published in the contract repository with
                    its SHA-256 hash, so anyone can verify exactly who received the distribution;
                    every transfer is a standard ERC-20 Transfer event, visible on-chain.
                </div>
            </Group>

            <Group name="What does not exist">
                <div className="nbhd-note">
                    No claim mechanism · no treasury or reserve · no vesting schedules · no
                    staking · no buybacks · no utility burn · no emission schedule · no
                    PD-operated market or liquidity pool — anyone may create one permissionlessly;
                    that is their act, not PD&rsquo;s.
                </div>
            </Group>
        </div>
    );
}

export function PriceContractPanel() {
    return (
        <div className="price-acct">
            <Group name="Deployed address">
                <div className="nbhd-note">
                    Ethereum mainnet, deployed 2026-07-03, with the full 100,000,000 supply
                    minted to the deployer wallet (pricediscussion.eth) for distribution.
                </div>
                <a className="price-acct-addr" href={ETHERSCAN} target="_blank" rel="noopener noreferrer">
                    {PRICE_TOKEN_ADDRESS}
                </a>
            </Group>

            <Group name="Contract details">
                <div className="attr-grid">
                    <div className="attr-tile">
                        <span className="attr-tile-label">Standard</span>
                        <span className="attr-tile-value">ERC-20 (OZ v5.0.2)</span>
                    </div>
                    <div className="attr-tile">
                        <span className="attr-tile-label">Name</span>
                        <span className="attr-tile-value">Price Discussion</span>
                    </div>
                    <div className="attr-tile">
                        <span className="attr-tile-label">Symbol</span>
                        <span className="attr-tile-value">PRICE</span>
                    </div>
                    <div className="attr-tile">
                        <span className="attr-tile-label">Decimals</span>
                        <span className="attr-tile-value">18</span>
                    </div>
                </div>
                <div className="nbhd-note">
                    A constructor and an import — fourteen lines. The simplicity is the security
                    model. The contract contains no distribution logic; distribution happens
                    off-contract via direct transfers.
                </div>
            </Group>

            <Group name="Public functions">
                <div className="nbhd-note">
                    The full standard ERC-20 specification and nothing else: {FUNCTIONS.map((f, i) => (
                        <span key={f}><code>{f}</code>{i < FUNCTIONS.length - 1 ? ', ' : '.'}</span>
                    ))}
                </div>
            </Group>

            <Group name="What the contract does not have">
                <div className="price-acct-list">
                    {NOT_IN_CONTRACT.map((n) => <LabeledNote key={n.label} {...n} />)}
                </div>
            </Group>

            <Group name="Verification">
                <div className="nbhd-note">
                    Source is published at{' '}
                    <a href={REPO} target="_blank" rel="noopener noreferrer">github.com/brendonrell/pd-price-token</a>{' '}
                    under MIT. Solidity 0.8.20 (optimizer 200 runs, EVM paris), OpenZeppelin
                    Contracts v5.0.2, no constructor arguments. The repo&rsquo;s solc
                    Standard-JSON-Input reproduces the deployed bytecode exactly; Etherscan
                    verification uses the same file.
                </div>
            </Group>

            <Group name="Events">
                <div className="nbhd-note">
                    Standard ERC-20 only: <code>Transfer</code> (including the single deployment
                    mint, from the zero address) and <code>Approval</code>.
                </div>
            </Group>
        </div>
    );
}

export function PriceUtilityPanel() {
    return (
        <div className="price-acct">
            <div className="nbhd-note">
                $PRICE confers no special privileges, no governance rights, no discounts, no
                revenue claims, and no access of any kind on Price Discussion. This is that
                deliberate structural choice: what specifically is excluded, why, and how the
                choice is enforced architecturally rather than by policy alone.
            </div>

            <Group name="What this specifically excludes">
                <div className="price-acct-list">
                    {NO_UTILITY.map((n) => <LabeledNote key={n.label} {...n} />)}
                </div>
            </Group>

            <Group name="Why this is the design">
                <div className="price-acct-list">
                    {WHY_DESIGN.map((n) => <LabeledNote key={n.label} {...n} />)}
                </div>
            </Group>

            <Group name="How the design is enforced">
                <div className="price-acct-list">
                    {HOW_ENFORCED.map((n) => <LabeledNote key={n.label} {...n} />)}
                </div>
            </Group>

            <Group name="What $PRICE is, then">
                <div className="nbhd-note">
                    A transferable ERC-20 held as a cultural artifact by the generative art
                    community, the fxhash community specifically. Its meaning, if any, derives
                    from cultural resonance — not from any claim on Price Discussion. Holders are
                    not customers, and not investors, by virtue of holding it; they are people
                    who hold a token. That is the entire design.
                </div>
            </Group>
        </div>
    );
}
