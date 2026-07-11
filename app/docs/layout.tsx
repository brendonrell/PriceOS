import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import '../../styles/docs.css';
import { getNav } from '../../lib/docs/content';
import { DocsChrome } from '../../components/docs/DocsSidebar';
import ActionToast from '../../components/ActionToast';
import { PerMilleMark } from '../../components/shell/PerMilleMark';

/*
 * PD-Docs layout. PriceOSShell renders /docs bare (no app chrome), so this
 * layout owns the docs surface: top bar, nav (mobile INDEX drop-down /
 * desktop left rail), the reading column, and the docs footer. ActionToast
 * mounts here because the shell's island doesn't — the colorway picker's
 * toasts behave exactly like they do in settings.
 */

export const metadata: Metadata = {
    title: {
        default: 'Price Discussion Docs',
        template: '%s — Price Discussion Docs',
    },
};

export default function DocsLayout({ children }: { children: ReactNode }) {
    const nav = getNav();
    return (
        <div className="pd-docs">
            <DocsChrome nav={nav} />
            <div className="pd-docs-body">{children}</div>
            <footer className="pd-docs-footer">
                <span>
                    {/* The REAL per-mille logo mark (SVG, the My PD reference) —
                        correct Inter-derived thickness, no webfont smudge. */}
                    <PerMilleMark className="pd-docs-logo-mark" /> Price Discussion
                </span>
                <span className="pd-docs-footer-links">
                    <a href="/">The App</a>
                    <span className="pd-docs-sep">·</span>
                    <a href="/llms.txt">llms.txt</a>
                    <span className="pd-docs-sep">·</span>
                    <a href="mailto:support@pricediscussion.com">Support</a>
                </span>
            </footer>
            <ActionToast />
        </div>
    );
}
