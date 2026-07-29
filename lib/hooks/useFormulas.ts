'use client';

/*
 * useFormulas / useFormulaRoll — FORMULA (Brendon, 2026-07-29).
 *
 * useFormulas owns the profile owner's SHELF of Formulas. Server source of
 * truth is `users.formulas`; mirrored to localStorage `pd_formulas` and
 * broadcast on `pd:formulas-changed`. The whole shelf writes at once, because
 * a Formula's NUMBER is its position — a partial merge would renumber someone's
 * work. Mirrors useTagPaint's grammar exactly.
 *
 * useFormulaRoll is this page load's redraw. Same contract as useRudxaneRoll:
 * the server renders roll 0 and the real roll lands after mount, so first paint
 * can never disagree with itself, and every Formula in one view redraws
 * together instead of flickering independently.
 */

import { useCallback, useEffect, useState } from 'react';
import { pushState } from '@/lib/state/userState';
import { cleanFormulas, MAX_FORMULAS, type Formula } from '@/lib/tags/formula';

const STORAGE_KEY = 'pd_formulas';
const EVENT_NAME = 'pd:formulas-changed';

function readStored(seed: Formula[]): Formula[] {
    if (typeof window === 'undefined') return seed;
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) return cleanFormulas(JSON.parse(saved));
    } catch {
        /* ignore */
    }
    return seed;
}

/**
 * @param serverFormulas Server-known `users.formulas` for the OWNER of the
 *   profile being viewed — pass it ONLY on the viewer's OWN profile so the
 *   picker shows the real shelf on first paint.
 */
export function useFormulas(serverFormulas?: unknown[] | null) {
    const [formulas, setState] = useState<Formula[]>(() => readStored(cleanFormulas(serverFormulas)));

    useEffect(() => {
        const onChange = (e: Event) => {
            setState(cleanFormulas((e as CustomEvent<Formula[]>).detail));
        };
        const onStorage = (e: StorageEvent) => {
            if (e.key !== STORAGE_KEY) return;
            try { setState(cleanFormulas(e.newValue ? JSON.parse(e.newValue) : [])); } catch { /* ignore */ }
        };
        window.addEventListener(EVENT_NAME, onChange);
        window.addEventListener('storage', onStorage);
        return () => {
            window.removeEventListener(EVENT_NAME, onChange);
            window.removeEventListener('storage', onStorage);
        };
    }, []);

    const save = useCallback((next: Formula[]) => {
        const value = cleanFormulas(next).slice(0, MAX_FORMULAS);
        setState(value);
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); } catch { /* device-local nicety */ }
        window.dispatchEvent(new CustomEvent<Formula[]>(EVENT_NAME, { detail: value }));
        pushState({ formulas: value });
    }, []);

    return { formulas, save };
}

/* ── the redraw ────────────────────────────────────────────────────────── */

let pageRoll: number | null = null;

function getPageRoll(): number {
    if (pageRoll === null) pageRoll = Math.floor(Math.random() * 1_000_000);
    return pageRoll;
}

/** This page load's Formula redraw. null until mounted (server renders roll 0). */
export function useFormulaRoll(): number | null {
    const [roll, setRoll] = useState<number | null>(null);
    useEffect(() => { setRoll(getPageRoll()); }, []);
    return roll;
}
