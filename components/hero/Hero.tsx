'use client';
import type { ReactNode } from 'react';

export interface HeroProps {
    ariaLabel: string;
    titleRow?: ReactNode;
    identityRow?: ReactNode;
    socialRow?: ReactNode;
    statsRow?: ReactNode;
    children?: ReactNode;
}

export default function Hero({
    ariaLabel,
    titleRow,
    identityRow,
    socialRow,
    statsRow,
    children,
}: HeroProps) {
    return (
        <section className="project-hero" aria-label={ariaLabel}>
            <div className="hero-group-1">
                {titleRow != null && (
                    <div className="hero-row hero-row-title">{titleRow}</div>
                )}
                {identityRow != null && (
                    <div className="hero-row hero-row-identity">{identityRow}</div>
                )}
                {socialRow != null && (
                    <div className="hero-row hero-row-social">{socialRow}</div>
                )}
                {statsRow != null && (
                    <div className="hero-row hero-row-stats">{statsRow}</div>
                )}
            </div>
            <div className="hero-group-2">{children}</div>
        </section>
    );
}
