'use client';

/*
 * PD-Docs navigation. Mobile-first: a sticky top bar with an INDEX toggle
 * that drops the full section list over the page. Desktop (≥1024px): the
 * top bar stays and the same list renders as a persistent left rail — one
 * component, two presentations, zero duplicated nav state.
 *
 * The colorway picker at the bottom is the REAL settings ColorwayPicker —
 * same component, same classes, same toasts (Brendon, 2026-07-10: "give it
 * the colour picker from the homepage but default to dark mode").
 */

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { NavSection } from '../../lib/docs/content';
import { ColorwayPicker } from '../dropdown/settings/ColorwayPicker';

function NavList({ nav, onNavigate }: { nav: NavSection[]; onNavigate?: () => void }) {
    const pathname = usePathname();
    return (
        <nav className="pd-docs-nav" aria-label="Documentation">
            {nav.map((section) => (
                <div key={section.title} className="pd-docs-nav-section">
                    <div className="pd-docs-nav-title">{section.title}</div>
                    <ul>
                        {section.items.map((item) => {
                            const href = item.slug === '' ? '/docs' : `/docs/${item.slug}`;
                            const active = pathname === href;
                            return (
                                <li key={item.slug}>
                                    <Link
                                        href={href}
                                        className={`pd-docs-nav-link${active ? ' active' : ''}`}
                                        aria-current={active ? 'page' : undefined}
                                        onClick={onNavigate}
                                    >
                                        {item.label}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            ))}
            <div className="pd-docs-nav-colorway">
                <ColorwayPicker />
            </div>
        </nav>
    );
}

export function DocsChrome({ nav }: { nav: NavSection[] }) {
    const [open, setOpen] = useState(false);
    return (
        <>
            <header className="pd-docs-topbar">
                <Link href="/docs" className="pd-docs-wordmark" onClick={() => setOpen(false)}>
                    <span className="pd-docs-logo">‰</span> PRICE DISCUSSION <span className="pd-docs-wordmark-docs">DOCS</span>
                </Link>
                <div className="pd-docs-topbar-right">
                    <a href="/" className="pd-docs-applink">THE APP</a>
                    <button
                        type="button"
                        className={`pd-docs-index-btn${open ? ' open' : ''}`}
                        aria-expanded={open}
                        aria-controls="pdDocsMobileNav"
                        onClick={() => setOpen((v) => !v)}
                    >
                        {open ? 'CLOSE' : 'INDEX'}
                    </button>
                </div>
            </header>
            {open && (
                <div id="pdDocsMobileNav" className="pd-docs-mobile-nav">
                    <NavList nav={nav} onNavigate={() => setOpen(false)} />
                </div>
            )}
            <aside className="pd-docs-sidebar">
                <NavList nav={nav} />
            </aside>
        </>
    );
}
